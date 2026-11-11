/**
 * Deterministic text splitter.
 *
 * Retrieval quality in Phase 4 depends on chunks being small enough to be
 * specific and large enough to carry an idea. We cut near a paragraph or
 * sentence boundary when one is available, overlap consecutive chunks so a
 * sentence crossing a boundary is still retrievable, and never emit an empty
 * chunk.
 */

export type ChunkOptions = {
  maxChars?: number;
  overlapChars?: number;
};

export type TextChunk = {
  index: number;
  content: string;
  charCount: number;
};

const DEFAULT_MAX_CHARS = 900;
const DEFAULT_OVERLAP_CHARS = 150;

/**
 * Picks where to end a chunk. Paragraph breaks beat sentence ends; both must
 * land past the halfway point so a chunk is not cut absurdly short.
 */
function findBoundary(text: string, start: number, end: number): number {
  const window = text.slice(start, end);
  const minUseful = Math.floor(window.length / 2);

  const paragraph = window.lastIndexOf("\n\n");
  if (paragraph > minUseful) return start + paragraph;

  const sentence = window.lastIndexOf(". ");
  if (sentence > minUseful) return start + sentence + 1;

  const space = window.lastIndexOf(" ");
  if (space > minUseful) return start + space;

  return end;
}

/** Moves the next start past a partial word unless the gap is tiny. */
function alignStart(text: string, start: number): number {
  const nextSpace = text.indexOf(" ", start);
  if (nextSpace !== -1 && nextSpace - start < 40) return nextSpace + 1;
  return start;
}

export function chunkText(
  text: string,
  options: ChunkOptions = {},
): TextChunk[] {
  const maxChars = Math.max(200, options.maxChars ?? DEFAULT_MAX_CHARS);
  const overlapChars = Math.min(
    Math.max(0, options.overlapChars ?? DEFAULT_OVERLAP_CHARS),
    Math.floor(maxChars / 3),
  );

  const normalized = text.trim();
  if (normalized.length === 0) return [];

  const chunks: TextChunk[] = [];
  let start = 0;

  while (start < normalized.length) {
    let end = Math.min(start + maxChars, normalized.length);

    if (end < normalized.length) {
      end = Math.max(findBoundary(normalized, start, end), start + 1);
    }

    const content = normalized.slice(start, end).trim();
    if (content.length > 0) {
      chunks.push({
        index: chunks.length,
        content,
        charCount: content.length,
      });
    }

    if (end >= normalized.length) break;

    // Guarantee progress even when a boundary was found immediately.
    start = Math.max(end - overlapChars, start + 1);
    start = alignStart(normalized, start);
  }

  return chunks;
}
