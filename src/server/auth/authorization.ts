import "server-only";

import type { MemberRole } from "@/server/db/schema";
import { ForbiddenError } from "@/server/lib/errors";

/**
 * Who can do what, written as a table instead of a hierarchy.
 *
 * `role === "owner" || role === "admin"` looks shorter, but it encodes an
 * ordering that stops making sense the moment a role is added between them.
 * A matrix can be read and audited in one screen.
 */
export const PERMISSIONS = {
  "org:update": ["owner", "admin"],
  "member:invite": ["owner", "admin"],
  "member:remove": ["owner", "admin"],
  "member:role:change": ["owner"],
  "billing:manage": ["owner"],
} as const satisfies Record<string, readonly MemberRole[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: MemberRole, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly MemberRole[]).includes(role);
}

/** For services: throws instead of returning false, so callers cannot ignore it. */
export function assertCan(role: MemberRole, permission: Permission): void {
  if (!can(role, permission)) {
    throw new ForbiddenError(
      "Your role does not allow this action in this workspace.",
    );
  }
}
