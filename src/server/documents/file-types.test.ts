import { describe, expect, it } from "vitest";

import {
  MAX_UPLOAD_BYTES,
  detectFileType,
  extensionOf,
  mimeTypeForExtension,
} from "./file-types";

const PDF_HEADER = Buffer.from("%PDF-1.7\n...");
const ZIP_HEADER = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);

describe("extensionOf", () => {
  it("reads the last extension in lowercase", () => {
    expect(extensionOf("Handbook.PDF")).toBe("pdf");
    expect(extensionOf("notes.final.md")).toBe("md");
  });

  it("rejects names without a usable extension", () => {
    expect(extensionOf("README")).toBeNull();
    expect(extensionOf(".env")).toBeNull();
    expect(extensionOf("trailing.")).toBeNull();
  });
});

describe("detectFileType", () => {
  it("rejects empty files", () => {
    expect(detectFileType("notes.txt", Buffer.alloc(0))).toEqual({
      ok: false,
      reason: "empty",
    });
  });

  it("rejects files over the limit", () => {
    const tooBig = Buffer.alloc(MAX_UPLOAD_BYTES + 1);
    expect(detectFileType("notes.txt", tooBig)).toEqual({
      ok: false,
      reason: "too_large",
    });
  });

  it("rejects unknown extensions", () => {
    expect(detectFileType("script.exe", Buffer.from("MZ"))).toEqual({
      ok: false,
      reason: "unsupported_type",
    });
    expect(detectFileType("no-extension", Buffer.from("hello"))).toEqual({
      ok: false,
      reason: "unsupported_type",
    });
  });

  it("accepts a real PDF header and reports its MIME type", () => {
    expect(detectFileType("handbook.pdf", PDF_HEADER)).toEqual({
      ok: true,
      file: {
        extension: "pdf",
        mimeType: "application/pdf",
      },
    });
  });

  it("rejects a PDF whose bytes are not a PDF", () => {
    expect(detectFileType("fake.pdf", Buffer.from("just text"))).toEqual({
      ok: false,
      reason: "content_mismatch",
    });
  });

  it("accepts a DOCX only when it is a ZIP container", () => {
    expect(detectFileType("policy.docx", ZIP_HEADER).ok).toBe(true);
    expect(detectFileType("policy.docx", Buffer.from("plain"))).toEqual({
      ok: false,
      reason: "content_mismatch",
    });
  });

  it("accepts UTF-8 text and Markdown", () => {
    const text = Buffer.from("Café policy\n\nLine two.", "utf8");
    expect(detectFileType("notes.txt", text).ok).toBe(true);
    expect(detectFileType("notes.md", text).ok).toBe(true);
  });

  it("rejects a binary file renamed to .txt", () => {
    const binary = Buffer.from([0x25, 0x00, 0x01, 0x02]);
    expect(detectFileType("renamed.txt", binary)).toEqual({
      ok: false,
      reason: "content_mismatch",
    });
  });
});

describe("mimeTypeForExtension", () => {
  it("maps every accepted extension", () => {
    expect(mimeTypeForExtension("pdf")).toBe("application/pdf");
    expect(mimeTypeForExtension("txt")).toBe("text/plain");
    expect(mimeTypeForExtension("md")).toBe("text/markdown");
    expect(mimeTypeForExtension("docx")).toContain("wordprocessingml");
  });
});
