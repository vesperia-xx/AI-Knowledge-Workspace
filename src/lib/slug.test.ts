import { describe, expect, it } from "vitest";

import { slugify, slugWithSuffix } from "./slug";

describe("slugify", () => {
  it("turns a display name into a readable URL segment", () => {
    expect(slugify("Acme Corp")).toBe("acme-corp");
    expect(slugify("  Acme   Corp!  ")).toBe("acme-corp");
    expect(slugify("Recall — AI Workspace")).toBe("recall-ai-workspace");
  });

  it("strips accents instead of dropping the letter", () => {
    expect(slugify("ÁÉÍ ÓÚ")).toBe("aei-ou");
    expect(slugify("Peña & Cía.")).toBe("pena-cia");
  });

  it("never returns an empty or too-short slug", () => {
    expect(slugify("!!!")).toBe("workspace");
    expect(slugify("ab")).toBe("workspace");
    expect(slugify("")).toBe("workspace");
  });

  it("caps the length and does not leave a trailing hyphen", () => {
    const slug = slugify("a".repeat(39) + " tail");
    expect(slug.length).toBeLessThanOrEqual(40);
    expect(slug.endsWith("-")).toBe(false);
  });
});

describe("slugWithSuffix", () => {
  it("returns the base on the first attempt", () => {
    expect(slugWithSuffix("acme", 1)).toBe("acme");
  });

  it("appends a counter for collisions", () => {
    expect(slugWithSuffix("acme", 2)).toBe("acme-2");
    expect(slugWithSuffix("acme", 7)).toBe("acme-7");
  });
});
