/**
 * What we accept, and how we prove it is what it claims to be.
 *
 * The browser-provided MIME type is a hint an attacker controls, so it is
 * ignored. The extension picks a parser and the first bytes of the file must
 * agree with it. Keeping this pure makes it testable without a database, a
 * request or a real file.
 */

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Roughly 100k tokens: enough for a real handbook, small enough to bound work. */
export const MAX_TEXT_CHARS = 400_000;

const MIME_TYPES = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain",
  md: "text/markdown",
} as const;

export type DocumentExtension = keyof typeof MIME_TYPES;

export type DetectedFile = {
  extension: DocumentExtension;
  mimeType: string;
};

export type DetectionFailure =
  | "empty"
  | "too_large"
  | "unsupported_type"
  | "content_mismatch";

export type DetectionResult =
  | { ok: true; file: DetectedFile }
  | { ok: false; reason: DetectionFailure };

export const ACCEPTED_EXTENSIONS = Object.keys(MIME_TYPES) as DocumentExtension[];

export function isDocumentExtension(value: string): value is DocumentExtension {
  return value in MIME_TYPES;
}

export function mimeTypeForExtension(extension: DocumentExtension): string {
  return MIME_TYPES[extension];
}

export function extensionOf(fileName: string): string | null {
  const dot = fileName.lastIndexOf(".");
  if (dot <= 0 || dot === fileName.length - 1) return null;
  return fileName.slice(dot + 1).toLowerCase();
}

function startsWithBytes(buffer: Buffer, bytes: number[]): boolean {
  if (buffer.length < bytes.length) return false;
  return bytes.every((byte, index) => buffer[index] === byte);
}

function looksBinary(buffer: Buffer): boolean {
  // Text formats are decoded as UTF-8; a NUL byte in the first block is a
  // strong signal that somebody renamed a binary file to .txt.
  const sample = buffer.subarray(0, 8192);
  return sample.includes(0);
}

export function detectFileType(
  fileName: string,
  buffer: Buffer,
): DetectionResult {
  if (buffer.length === 0) return { ok: false, reason: "empty" };
  if (buffer.length > MAX_UPLOAD_BYTES) return { ok: false, reason: "too_large" };

  const extension = extensionOf(fileName);
  if (!extension || !(extension in MIME_TYPES)) {
    return { ok: false, reason: "unsupported_type" };
  }

  const typedExtension = extension as DocumentExtension;

  switch (typedExtension) {
    case "pdf":
      // Every PDF starts with "%PDF-"; the version digits follow.
      if (!startsWithBytes(buffer, [0x25, 0x50, 0x44, 0x46, 0x2d])) {
        return { ok: false, reason: "content_mismatch" };
      }
      break;
    case "docx":
      // A .docx is a ZIP container ("PK\x03\x04").
      if (!startsWithBytes(buffer, [0x50, 0x4b, 0x03, 0x04])) {
        return { ok: false, reason: "content_mismatch" };
      }
      break;
    case "txt":
    case "md":
      if (looksBinary(buffer)) {
        return { ok: false, reason: "content_mismatch" };
      }
      break;
  }

  return {
    ok: true,
    file: { extension: typedExtension, mimeType: MIME_TYPES[typedExtension] },
  };
}
