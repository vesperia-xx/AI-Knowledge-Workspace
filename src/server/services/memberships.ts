import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/server/db";
import { memberships, users } from "@/server/db/schema";
import type { MemberRole } from "@/server/db/schema";
import { assertCan } from "@/server/auth/authorization";
import { ConflictError, ForbiddenError, NotFoundError } from "@/server/lib/errors";

export type MemberSummary = {
  userId: string;
  name: string | null;
  email: string;
  role: MemberRole;
  joinedAt: Date;
};

export type Membership = {
  organizationId: string;
  userId: string;
  role: MemberRole;
};

/**
 * The single place that answers "is this user in this workspace, and as what".
 * Services never trust a role passed in from a caller; they resolve it here.
 */
export async function getMembership(
  organizationId: string,
  userId: string,
): Promise<Membership | null> {
  const membership = await db.query.memberships.findFirst({
    where: and(
      eq(memberships.organizationId, organizationId),
      eq(memberships.userId, userId),
    ),
    columns: { organizationId: true, userId: true, role: true },
  });

  return membership ?? null;
}

export async function requireMembership(
  organizationId: string,
  userId: string,
): Promise<Membership> {
  const membership = await getMembership(organizationId, userId);
  if (!membership) {
    // Same error for "wrong workspace" and "wrong user": the caller learns
    // nothing about workspaces they do not belong to.
    throw new NotFoundError("You are not a member of this workspace.");
  }
  return membership;
}

export async function listMembers(
  organizationId: string,
): Promise<MemberSummary[]> {
  return db
    .select({
      userId: users.id,
      name: users.name,
      email: users.email,
      role: memberships.role,
      joinedAt: memberships.createdAt,
    })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(eq(memberships.organizationId, organizationId))
    .orderBy(memberships.createdAt);
}

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Same contract as `requireMembership`, but reads inside a transaction so the
 * caller sees a consistent snapshot while holding row locks.
 */
async function requireMembershipIn(
  tx: Transaction,
  organizationId: string,
  userId: string,
): Promise<Membership> {
  const membership = await tx.query.memberships.findFirst({
    where: and(
      eq(memberships.organizationId, organizationId),
      eq(memberships.userId, userId),
    ),
    columns: { organizationId: true, userId: true, role: true },
  });

  if (!membership) {
    throw new NotFoundError("You are not a member of this workspace.");
  }
  return membership;
}

/**
 * Locks every owner row of the workspace for the rest of the transaction.
 *
 * Counting owners and then updating them is a check-then-act race: two owners
 * demoting each other at the same time would both read "2 owners" and both
 * succeed, leaving a workspace nobody can administer. `FOR UPDATE` serialises
 * the two transactions, so the second one re-reads the real state.
 */
async function lockOwnerRows(
  tx: Transaction,
  organizationId: string,
): Promise<string[]> {
  const rows = await tx
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(
      and(
        eq(memberships.organizationId, organizationId),
        eq(memberships.role, "owner"),
      ),
    )
    .for("update");

  return rows.map((row) => row.userId);
}

export async function changeMemberRole(input: {
  organizationId: string;
  actorId: string;
  targetUserId: string;
  role: MemberRole;
}): Promise<void> {
  await db.transaction(async (tx) => {
    const actor = await requireMembershipIn(
      tx,
      input.organizationId,
      input.actorId,
    );
    assertCan(actor.role, "member:role:change");

    const target = await requireMembershipIn(
      tx,
      input.organizationId,
      input.targetUserId,
    );

    if (target.role === input.role) return;

    if (target.role === "owner" && input.role !== "owner") {
      const owners = await lockOwnerRows(tx, input.organizationId);
      if (owners.length <= 1) {
        throw new ConflictError("A workspace needs at least one owner.");
      }
    }

    await tx
      .update(memberships)
      .set({ role: input.role })
      .where(
        and(
          eq(memberships.organizationId, input.organizationId),
          eq(memberships.userId, input.targetUserId),
        ),
      );
  });
}

export async function removeMember(input: {
  organizationId: string;
  actorId: string;
  targetUserId: string;
}): Promise<void> {
  await db.transaction(async (tx) => {
    const actor = await requireMembershipIn(
      tx,
      input.organizationId,
      input.actorId,
    );
    const target = await requireMembershipIn(
      tx,
      input.organizationId,
      input.targetUserId,
    );

    // Leaving is always allowed; removing someone else needs the permission.
    if (actor.userId !== target.userId) {
      assertCan(actor.role, "member:remove");
    }

    if (target.role === "owner") {
      // An admin cannot remove an owner, even though they can remove members.
      if (actor.role !== "owner") {
        throw new ForbiddenError("Only an owner can remove another owner.");
      }

      const owners = await lockOwnerRows(tx, input.organizationId);
      if (owners.length <= 1) {
        throw new ConflictError("A workspace needs at least one owner.");
      }
    }

    await tx
      .delete(memberships)
      .where(
        and(
          eq(memberships.organizationId, input.organizationId),
          eq(memberships.userId, input.targetUserId),
        ),
      );
  });
}
