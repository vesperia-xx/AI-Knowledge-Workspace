import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/server/db";
import { isUniqueViolation } from "@/server/db/errors";
import { memberships, organizations } from "@/server/db/schema";
import { slugify, slugWithSuffix } from "@/lib/slug";
import { assertCan } from "@/server/auth/authorization";
import { ConflictError, NotFoundError } from "@/server/lib/errors";
import { requireMembership } from "./memberships";

const MAX_SLUG_ATTEMPTS = 20;

export type OrganizationSummary = {
  id: string;
  name: string;
  slug: string;
};

export async function listOrganizationsForUser(
  userId: string,
): Promise<OrganizationSummary[]> {
  return db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
    })
    .from(memberships)
    .innerJoin(organizations, eq(organizations.id, memberships.organizationId))
    .where(eq(memberships.userId, userId))
    .orderBy(organizations.name);
}

/**
 * Creates the workspace and its first owner in one transaction: an organization
 * without an owner would be unreachable forever.
 *
 * The slug is generated from the name and never changes afterwards. Renaming is
 * cheap to allow; changing URLs breaks every link and bookmark people shared.
 */
export async function createOrganization(input: {
  userId: string;
  name: string;
}): Promise<OrganizationSummary> {
  const base = slugify(input.name);

  for (let attempt = 1; attempt <= MAX_SLUG_ATTEMPTS; attempt += 1) {
    const slug = slugWithSuffix(base, attempt);

    try {
      return await db.transaction(async (tx) => {
        const [organization] = await tx
          .insert(organizations)
          .values({ name: input.name, slug, createdById: input.userId })
          .returning({
            id: organizations.id,
            name: organizations.name,
            slug: organizations.slug,
          });

        await tx.insert(memberships).values({
          organizationId: organization.id,
          userId: input.userId,
          role: "owner",
        });

        return organization;
      });
    } catch (error) {
      // Another request took the slug between the attempt and the insert.
      if (
        isUniqueViolation(error, "organizations_slug_unique") &&
        attempt < MAX_SLUG_ATTEMPTS
      ) {
        continue;
      }
      throw error;
    }
  }

  throw new ConflictError("Could not find an available workspace URL.");
}

export async function renameOrganization(input: {
  organizationId: string;
  actorId: string;
  name: string;
}): Promise<void> {
  const actor = await requireMembership(input.organizationId, input.actorId);
  assertCan(actor.role, "org:update");

  const updated = await db
    .update(organizations)
    .set({ name: input.name })
    .where(eq(organizations.id, input.organizationId))
    .returning({ id: organizations.id });

  if (updated.length === 0) {
    throw new NotFoundError("Workspace not found.");
  }
}

export async function getOrganizationBySlug(orgSlug: string) {
  const [org] = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      createdById: organizations.createdById,
    })
    .from(organizations)
    .where(eq(organizations.slug, orgSlug));

  if (!org) {
    throw new NotFoundError("Workspace not found.");
  }

  return org;
}
