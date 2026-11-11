import { describe, expect, it } from "vitest";

import { isForeignKeyViolation, isUniqueViolation } from "./errors";

function pgError(code: string, constraint?: string): Error {
  return Object.assign(new Error("postgres failure"), { code, constraint });
}

describe("isUniqueViolation", () => {
  it("sees through the wrapper Drizzle adds", () => {
    const wrapped = new Error("Failed query", {
      cause: pgError("23505", "organizations_slug_unique"),
    });

    expect(isUniqueViolation(wrapped)).toBe(true);
    expect(isUniqueViolation(wrapped, "organizations_slug_unique")).toBe(true);
    expect(isUniqueViolation(wrapped, "users_email_unique")).toBe(false);
  });

  it("ignores unrelated errors", () => {
    expect(isUniqueViolation(new Error("boom"))).toBe(false);
    expect(isUniqueViolation(pgError("23503"))).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
  });
});

describe("isForeignKeyViolation", () => {
  it("detects 23503", () => {
    expect(isForeignKeyViolation(pgError("23503"))).toBe(true);
    expect(isForeignKeyViolation(pgError("23505"))).toBe(false);
  });
});
