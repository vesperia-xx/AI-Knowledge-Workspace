/**
 * Plan catalogue: the single source of truth for quotas.
 *
 * Kept free of server imports so the pricing UI can render the same numbers
 * the services enforce. No payment provider is involved: an upgrade is a
 * recorded plan change, not a transaction.
 */
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

export function isPlanType(value: unknown): value is PlanType {
  return typeof value === "string" && value in PLANS;
}
