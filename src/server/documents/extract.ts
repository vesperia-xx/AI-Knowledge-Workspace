import "server-only";

import mammoth from "mammoth";
import { extractText as extractPdfText, getDocumentProxy } from "unpdf";

import {
  MAX_TEXT_CHARS,
  type DocumentExtension,
} from "@/server/documents/file-types";
import { ValidationError } from "@/server/lib/errors";

export type ExtractedText = {
  text: string;
  pageCount: number | null;
};

/**
 * Collapses the whitespace differences between PDF, Word and plain text so
 * chunking behaves the same for every format.
 */
function normalizeText(input: string): string {
  return input
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Parses the file and returns its text.
 *
 * A file that is well-formed but unreadable (scanned PDF without OCR, corrupt
 * ZIP) is a user problem, not a bug, so it becomes a `ValidationError` and the
 * worker will not retry it. Anything else (missing file, out of memory) is
 * left as-is and retried.
 */
export async function extractDocumentText(
  extension: DocumentExtension,
  buffer: Buffer,
): Promise<ExtractedText> {
  let raw = "";
  let pageCount: number | null = null;

  try {
    switch (extension) {
      case "pdf": {
        const pdf = await getDocumentProxy(new Uint8Array(buffer));
        const result = await extractPdfText(pdf, { mergePages: true });
        raw = result.text;
        pageCount = result.totalPages;
        break;
      }
      case "docx": {
        const result = await mammoth.extractRawText({ buffer });
        raw = result.value;
        break;
      }
      case "txt":
      case "md": {
        raw = buffer.toString("utf8");
        break;
      }
    }
  } catch (error) {
    throw new ValidationError(
      "This file could not be read. If it is a scanned PDF, try a text-based version.",
      { cause: error },
    );
  }

  // The full text is kept bounded: one enormous document must not be able to
  // fill the database or make a single request take minutes.
  const text = normalizeText(raw).slice(0, MAX_TEXT_CHARS);

  if (text.length === 0) {
    throw new ValidationError(
      "No text could be extracted from this file. Scanned PDFs need OCR first.",
    );
  }

  return { text, pageCount };
}
