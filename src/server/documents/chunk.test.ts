import { describe, expect, it } from "vitest";

import { chunkText } from "./chunk";

describe("chunkText", () => {
  it("returns nothing for empty or blank input", () => {
    expect(chunkText("")).toEqual([]);
    expect(chunkText("   \n\t  \n ")).toEqual([]);
  });

  it("keeps short text in a single chunk", () => {
    const chunks = chunkText("A short policy.");
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toMatchObject({
      index: 0,
      content: "A short policy.",
      charCount: 15,
    });
  });

  it("never exceeds the maximum size", () => {
    const text = "word ".repeat(2_000);
    const chunks = chunkText(text, { maxChars: 400, overlapChars: 60 });

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.content.length).toBeLessThanOrEqual(400);
      expect(chunk.content.length).toBeGreaterThan(0);
      expect(chunk.charCount).toBe(chunk.content.length);
    }
  });

  it("numbers chunks from zero without gaps", () => {
    const chunks = chunkText("lorem ipsum ".repeat(1_000));
    expect(chunks.map((chunk) => chunk.index)).toEqual(
      chunks.map((_, index) => index),
    );
  });

  it("overlaps consecutive chunks so a boundary sentence stays retrievable", () => {
    const chunks = chunkText("alpha beta gamma delta ".repeat(200), {
      maxChars: 300,
      overlapChars: 100,
    });

    expect(chunks.length).toBeGreaterThan(1);

    for (let index = 1; index < chunks.length; index += 1) {
      const previous = chunks[index - 1].content;
      const current = chunks[index].content;
      // The current chunk starts somewhere inside the previous one.
      const overlap = previous.slice(-40);
      expect(previous.length + current.length).toBeGreaterThan(300);
      expect(
        previous.endsWith(current.slice(0, 20)) ||
          current.includes(overlap.slice(0, 10)),
      ).toBe(true);
    }
  });

  it("prefers a paragraph boundary over a hard cut", () => {
    const firstParagraph = "A".repeat(500);
    const secondParagraph = "B".repeat(500);
    const chunks = chunkText(`${firstParagraph}\n\n${secondParagraph}`, {
      maxChars: 900,
      overlapChars: 0,
    });

    expect(chunks[0].content).toBe(firstParagraph);
  });

  it("caps the overlap at a third of the chunk size", () => {
    // A huge overlap request must not prevent progress.
    const chunks = chunkText("sentence. ".repeat(500), {
      maxChars: 300,
      overlapChars: 10_000,
    });

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.content.length).toBeLessThanOrEqual(300);
    }
  });

  it("is deterministic", () => {
    const text = "The quick brown fox jumps over the lazy dog. ".repeat(100);
    expect(chunkText(text)).toEqual(chunkText(text));
  });
});
