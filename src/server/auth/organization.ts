import "server-only";

import { and, eq } from "drizzle-orm";
import { cache } from "react";
import { notFound } from "next/navigation";

import { db } from "@/server/db";
import { memberships, organizations } from "@/server/db/schema";
import type { MemberRole } from "@/server/db/schema";
import { getCurrentUser, requireUser, type CurrentUser } from "./session";

export type OrganizationSummary = {
  id: string;
  name: string;
  slug: string;
};

export type OrganizationContext = {
  organization: OrganizationSummary;
  role: MemberRole;
  user: CurrentUser;
};

/**
 * Resolves the tenant for a request.
 *
 * The slug comes from the URL and is untrusted. It is joined against the
 * caller's membership, so a user can only ever resolve workspaces they belong
 * to; there is no separate "is this slug allowed" check to forget.
 */
export const getOrganizationContext = cache(
  async (
    slug: string,
  ): Promise<{ organization: OrganizationSummary; role: MemberRole } | null> => {
    const user = await getCurrentUser();
    if (!user) return null;

    const [row] = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        role: memberships.role,
      })
      .from(memberships)
      .innerJoin(organizations, eq(organizations.id, memberships.organizationId))
      .where(
        and(eq(organizations.slug, slug), eq(memberships.userId, user.id)),
      )
      .limit(1);

    if (!row) return null;

    const { role, ...organization } = row;
    return { organization, role };
  },
);

/**
 * For layouts and pages. A non-member gets 404, not 403: answering "you are not
 * allowed" would confirm that the workspace exists.
 */
export async function requireOrganization(
  slug: string,
): Promise<OrganizationContext> {
  const user = await requireUser();
  const context = await getOrganizationContext(slug);
  if (!context) notFound();

  return { ...context, user };
}
