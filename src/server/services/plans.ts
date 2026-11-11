import "server-only";

import { db } from "@/server/db";
import { organizations, memberships } from "@/server/db/schema";
import { eq, sql } from "drizzle-orm";
import { countDocuments } from "@/server/services/documents";
import { ForbiddenError } from "@/server/lib/errors";

export const PLANS = {
  free: {
    name: "Free",
    maxDocuments: 10,
    maxMembers: 3,
    maxChatQueriesPerMonth: 100,
  },
  pro: {
    name: "Pro",
    maxDocuments: 100,
    maxMembers: 15,
    maxChatQueriesPerMonth: 1000,
  },
  enterprise: {
    name: "Enterprise",
    maxDocuments: 10000,
    maxMembers: 100,
    maxChatQueriesPerMonth: 50000,
  },
} as const;

export type PlanType = keyof typeof PLANS;

export async function getOrganizationPlan(organizationId: string): Promise<PlanType> {
  const [org] = await db
    .select({ plan: organizations.plan })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  return (org?.plan as PlanType) ?? "free";
}

export async function checkOrgLimit(
  organizationId: string,
  limitType: "documents" | "members" | "queries"
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const planType = await getOrganizationPlan(organizationId);
  const plan = PLANS[planType];

  if (limitType === "documents") {
    const current = await countDocuments(organizationId);
    const limit = plan.maxDocuments;
    return { allowed: current < limit, current, limit };
  }

  if (limitType === "members") {
    const [row] = await db
      .select({ count: sql<number>`count(*)` })
      .from(memberships)
      .where(eq(memberships.organizationId, organizationId));
      
    const current = Number(row?.count ?? 0);
    const limit = plan.maxMembers;
    return { allowed: current < limit, current, limit };
  }

  return { allowed: true, current: 0, limit: plan.maxChatQueriesPerMonth };
}

export async function enforceOrgLimit(
  organizationId: string,
  limitType: "documents" | "members" | "queries"
): Promise<void> {
  const { allowed, current, limit } = await checkOrgLimit(organizationId, limitType);
  if (!allowed) {
    throw new ForbiddenError(
      `Has alcanzado el límite de ${limitType} (${current}/${limit}) para el plan actual.`
    );
  }
}

export async function updateOrganizationPlan(input: {
  organizationId: string;
  plan: PlanType;
}): Promise<void> {
  await db
    .update(organizations)
    .set({ plan: input.plan })
    .where(eq(organizations.id, input.organizationId));
}
