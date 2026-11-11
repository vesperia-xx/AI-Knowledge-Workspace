import "server-only";

import { randomBytes } from "node:crypto";

import { and, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/server/db";
import { isUniqueViolation } from "@/server/db/errors";
import { invitations, memberships, organizations, users } from "@/server/db/schema";
import type { MemberRole } from "@/server/db/schema";
import { assertCan } from "@/server/auth/authorization";
import { enforceOrgLimit } from "@/server/services/plans";
import { ConflictError } from "@/server/lib/errors";
import { requireMembership } from "./memberships";

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type PendingInvitation = {
  id: string;
  email: string;
  role: MemberRole;
  expiresAt: Date;
  createdAt: Date;
  /** Computed in the data layer: components must stay pure. */
  expired: boolean;
};

export type InvitationStatus = "pending" | "accepted" | "expired";

export type InvitationPreview = {
  id: string;
  email: string;
  role: MemberRole;
  expiresAt: Date;
  status: InvitationStatus;
  organizationName: string;
  organizationSlug: string;
  inviterName: string | null;
};

export type CreateInvitationResult =
  | { ok: true; invitation: { id: string; email: string; token: string } }
  | { ok: false; reason: "already_member" | "cannot_invite_owner" };

function createToken(): string {
  // 32 bytes of entropy, URL-safe. Guessing this is the only thing standing
  // between an outsider and a workspace seat, so it is not derived from ids.
  return randomBytes(32).toString("base64url");
}

export async function listPendingInvitations(
  organizationId: string,
): Promise<PendingInvitation[]> {
  const rows = await db
    .select({
      id: invitations.id,
      email: invitations.email,
      role: invitations.role,
      expiresAt: invitations.expiresAt,
      createdAt: invitations.createdAt,
    })
    .from(invitations)
    .where(
      and(
        eq(invitations.organizationId, organizationId),
        isNull(invitations.acceptedAt),
      ),
    )
    .orderBy(desc(invitations.createdAt));

  const now = Date.now();
  return rows.map((row) => ({
    ...row,
    expired: row.expiresAt.getTime() <= now,
  }));
}

export async function createInvitation(input: {
  organizationId: string;
  actorId: string;
  email: string;
  role: MemberRole;
}): Promise<CreateInvitationResult> {
  const actor = await requireMembership(input.organizationId, input.actorId);
  assertCan(actor.role, "member:invite");

  await enforceOrgLimit(input.organizationId, "members");

  // Ownership is granted in-app, never by link: a forwarded invite would
  // otherwise be a way to hand over the workspace.
  if (input.role === "owner") return { ok: false, reason: "cannot_invite_owner" };

  const existingMember = await db
    .select({ userId: memberships.userId })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(
      and(
        eq(memberships.organizationId, input.organizationId),
        eq(users.email, input.email),
      ),
    )
    .limit(1);

  if (existingMember.length > 0) {
    return { ok: false, reason: "already_member" };
  }

  const token = createToken();
  const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);

  // Re-inviting replaces the pending row instead of creating a second one, so
  // the partial unique index and the UI cannot disagree.
  const [pending] = await db
    .select({ id: invitations.id })
    .from(invitations)
    .where(
      and(
        eq(invitations.organizationId, input.organizationId),
        eq(invitations.email, input.email),
        isNull(invitations.acceptedAt),
      ),
    )
    .limit(1);

  try {
    if (pending) {
      const [updated] = await db
        .update(invitations)
        .set({
          role: input.role,
          token,
          expiresAt,
          invitedById: input.actorId,
        })
        .where(eq(invitations.id, pending.id))
        .returning({
          id: invitations.id,
          email: invitations.email,
          token: invitations.token,
        });

      return { ok: true, invitation: updated };
    }

    const [created] = await db
      .insert(invitations)
      .values({
        organizationId: input.organizationId,
        email: input.email,
        role: input.role,
        token,
        expiresAt,
        invitedById: input.actorId,
      })
      .returning({
        id: invitations.id,
        email: invitations.email,
        token: invitations.token,
      });

    return { ok: true, invitation: created };
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ConflictError(
        "An invitation for this email is already pending. Reload and try again.",
      );
    }
    throw error;
  }
}

export async function revokeInvitation(input: {
  organizationId: string;
  actorId: string;
  invitationId: string;
}): Promise<void> {
  const actor = await requireMembership(input.organizationId, input.actorId);
  assertCan(actor.role, "member:invite");

  // The organization id is part of the filter, not just checked beforehand:
  // holding an id from another tenant must not be enough to delete it.
  await db
    .delete(invitations)
    .where(
      and(
        eq(invitations.id, input.invitationId),
        eq(invitations.organizationId, input.organizationId),
        isNull(invitations.acceptedAt),
      ),
    );
}

export async function getInvitationPreview(
  token: string,
): Promise<InvitationPreview | null> {
  const [row] = await db
    .select({
      id: invitations.id,
      email: invitations.email,
      role: invitations.role,
      expiresAt: invitations.expiresAt,
      acceptedAt: invitations.acceptedAt,
      organizationName: organizations.name,
      organizationSlug: organizations.slug,
      inviterName: users.name,
    })
    .from(invitations)
    .innerJoin(organizations, eq(organizations.id, invitations.organizationId))
    .leftJoin(users, eq(users.id, invitations.invitedById))
    .where(eq(invitations.token, token))
    .limit(1);

  if (!row) return null;

  // Accepted wins over expired: a used link keeps saying "already used".
  const { acceptedAt, ...preview } = row;
  const status: InvitationStatus = acceptedAt
    ? "accepted"
    : row.expiresAt.getTime() <= Date.now()
      ? "expired"
      : "pending";

  return { ...preview, status };
}

export type AcceptInvitationResult =
  | { ok: true; organizationSlug: string; organizationName: string }
  | {
      ok: false;
      reason: "not_found" | "expired" | "already_accepted" | "wrong_account";
    };

export async function acceptInvitation(input: {
  token: string;
  userId: string;
  userEmail: string;
}): Promise<AcceptInvitationResult> {
  return db.transaction(async (tx) => {
    const invitation = await tx.query.invitations.findFirst({
      where: eq(invitations.token, input.token),
    });

    if (!invitation) return { ok: false, reason: "not_found" } as const;
    if (invitation.acceptedAt) {
      return { ok: false, reason: "already_accepted" } as const;
    }
    if (invitation.expiresAt.getTime() <= Date.now()) {
      return { ok: false, reason: "expired" } as const;
    }
    // The invite belongs to an email, not to whoever holds the link. Otherwise
    // a forwarded link would grant access to the wrong person.
    if (invitation.email !== input.userEmail.toLowerCase()) {
      return { ok: false, reason: "wrong_account" } as const;
    }

    await tx
      .insert(memberships)
      .values({
        organizationId: invitation.organizationId,
        userId: input.userId,
        role: invitation.role,
      })
      // Accepting twice (two tabs) must not fail; the second run is a no-op.
      .onConflictDoNothing();

    await tx
      .update(invitations)
      .set({ acceptedAt: new Date() })
      .where(eq(invitations.id, invitation.id));

    const [organization] = await tx
      .select({
        slug: organizations.slug,
        name: organizations.name,
      })
      .from(organizations)
      .where(eq(organizations.id, invitation.organizationId));

    return {
      ok: true,
      organizationSlug: organization.slug,
      organizationName: organization.name,
    } as const;
  });
}
