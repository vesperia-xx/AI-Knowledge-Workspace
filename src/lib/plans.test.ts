import { describe, expect, it } from "vitest";

import { PLANS, isPlanType } from "./plans";

describe("plan catalogue", () => {
  it("increases every quota with each tier", () => {
    expect(PLANS.free.maxDocuments).toBeLessThan(PLANS.pro.maxDocuments);
    expect(PLANS.pro.maxDocuments).toBeLessThan(PLANS.enterprise.maxDocuments);

    expect(PLANS.free.maxMembers).toBeLessThan(PLANS.pro.maxMembers);
    expect(PLANS.pro.maxMembers).toBeLessThan(PLANS.enterprise.maxMembers);
  });

  it("recognises only known plan ids", () => {
    expect(isPlanType("free")).toBe(true);
    expect(isPlanType("enterprise")).toBe(true);
    expect(isPlanType("gold")).toBe(false);
    expect(isPlanType(undefined)).toBe(false);
  });
});
