import { describe, expect, it } from "vitest";

import { loginSchema, registerSchema } from "./schemas";
import { hashPassword, verifyPassword } from "./password";

describe("registerSchema", () => {
  it("normalizes the email before storing it", () => {
    const result = registerSchema.safeParse({
      name: "  Ada Lovelace  ",
      email: "  ADA@Company.com ",
      password: "correct horse battery",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.email).toBe("ada@company.com");
    expect(result.data.name).toBe("Ada Lovelace");
  });

  it("reports one error per invalid field", () => {
    const result = registerSchema.safeParse({
      name: "A",
      email: "not-an-email",
      password: "short",
    });

    expect(result.success).toBe(false);
    if (result.success) return;

    const fields = result.error.issues.map((issue) => issue.path[0]);
    expect(fields).toEqual(expect.arrayContaining(["name", "email", "password"]));
  });

  it("rejects passwords longer than bcrypt can handle", () => {
    const result = registerSchema.safeParse({
      name: "Ada Lovelace",
      email: "ada@company.com",
      password: "a".repeat(73),
    });

    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("accepts an existing email in any casing", () => {
    const result = loginSchema.safeParse({
      email: "ADA@company.com",
      password: "anything",
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("ada@company.com");
  });
});

describe("password hashing", () => {
  it("verifies the original password and rejects a different one", async () => {
    const hash = await hashPassword("correct horse battery");

    expect(hash).not.toContain("correct horse battery");
    await expect(verifyPassword("correct horse battery", hash)).resolves.toBe(true);
    await expect(verifyPassword("wrong password", hash)).resolves.toBe(false);
  }, 15_000);
});
