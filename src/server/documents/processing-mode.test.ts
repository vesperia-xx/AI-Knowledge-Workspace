import { describe, expect, it } from "vitest";

import { resolveProcessingMode } from "./processing-mode";

describe("resolveProcessingMode", () => {
  it("uses the BullMQ worker outside serverless platforms", () => {
    expect(resolveProcessingMode({})).toBe("queue");
  });

  it("processes inline on Vercel, where no worker runs", () => {
    expect(resolveProcessingMode({ VERCEL: "1" })).toBe("inline");
  });

  it("lets an explicit setting win over platform detection", () => {
    expect(resolveProcessingMode({ VERCEL: "1", DOCUMENT_PROCESSING: "queue" })).toBe(
      "queue",
    );
    expect(resolveProcessingMode({ DOCUMENT_PROCESSING: "inline" })).toBe(
      "inline",
    );
  });
});
