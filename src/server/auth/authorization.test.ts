import { describe, expect, it, vi } from "vitest";

// The module guards a server boundary that does not exist in a unit test.
vi.mock("server-only", () => ({}));

import {
  PERMISSIONS,
  assertCan,
  can,
  type Permission,
} from "./authorization";
import { ROLE_LABELS } from "@/lib/roles";
import { ForbiddenError } from "@/server/lib/errors";

const ROLES = ["owner", "admin", "member"] as const;

describe("permission matrix", () => {
  it("keeps ownership exclusively in charge of roles and billing", () => {
    expect(can("owner", "member:role:change")).toBe(true);
    expect(can("admin", "member:role:change")).toBe(false);
    expect(can("member", "member:role:change")).toBe(false);

    expect(can("owner", "billing:manage")).toBe(true);
    expect(can("admin", "billing:manage")).toBe(false);
  });

  it("lets admins run the workspace but not change who owns it", () => {
    expect(can("admin", "org:update")).toBe(true);
    expect(can("admin", "member:invite")).toBe(true);
    expect(can("admin", "member:remove")).toBe(true);

    expect(can("member", "org:update")).toBe(false);
    expect(can("member", "member:invite")).toBe(false);
    expect(can("member", "member:remove")).toBe(false);
  });

  it("agrees with the table for every permission and role", () => {
    for (const permission of Object.keys(PERMISSIONS) as Permission[]) {
      const allowed: readonly string[] = PERMISSIONS[permission];
      for (const role of ROLES) {
        expect(can(role, permission)).toBe(allowed.includes(role));
      }
    }
  });
});

describe("assertCan", () => {
  it("throws a forbidden error instead of returning false", () => {
    expect(() => assertCan("member", "billing:manage")).toThrow(ForbiddenError);
    expect(() => assertCan("owner", "billing:manage")).not.toThrow();
  });
});

describe("role labels", () => {
  it("has a human label for every role", () => {
    expect(ROLE_LABELS).toEqual({
      owner: "Owner",
      admin: "Admin",
      member: "Member",
    });
  });
});
