import type { MemberRole } from "@/server/db/schema";

/**
 * Shared with client components, so it lives outside the server-only
 * authorization module. The type import is erased at compile time.
 */
export const ROLE_LABELS: Record<MemberRole, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
};

export const ROLE_DESCRIPTIONS: Record<MemberRole, string> = {
  owner: "Full control, including billing and ownership changes.",
  admin: "Manage members, invitations and workspace settings.",
  member: "Use the workspace and its documents.",
};
