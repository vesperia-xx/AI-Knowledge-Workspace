import "server-only";

import { randomUUID } from "node:crypto";

import { and, count, desc, eq } from "drizzle-orm";

import { db } from "@/server/db";
import { documentChunks, documents, users } from "@/server/db/schema";
import type { DocumentStatus } from "@/server/db/schema";
import { assertCan, can } from "@/server/auth/authorization";
import {
  detectFileType,
  MAX_UPLOAD_BYTES,
  type DetectionFailure,
} from "@/server/documents/file-types";
import { enqueueDocumentProcessing } from "@/server/documents/queue";
import {
  deleteStoredFile,
  saveFile,
  storageKeyFor,
} from "@/server/storage/local";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/server/lib/errors";
import { logger } from "@/server/lib/logger";
import { requireMembership } from "./memberships";

export type DocumentSummary = {
  id: string;
  name: string;
  extension: string;
  mimeType: string;
  sizeBytes: number;
  status: DocumentStatus;
  errorMessage: string | null;
  pageCount: number | null;
  chunkCount: number;
  createdAt: Date;
  uploadedById: string | null;
  uploadedByName: string | null;
};

const DETECTION_MESSAGES: Record<DetectionFailure, string> = {
  empty: "That file is empty.",
  too_large: `Files must be ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB or smaller.`,
  unsupported_type: "Upload a PDF, Word (.docx), Markdown or plain text file.",
  content_mismatch: "The file content does not match its extension.",
};

export async function listDocuments(
  organizationId: string,
): Promise<DocumentSummary[]> {
  return db
    .select({
      id: documents.id,
      name: documents.name,
      extension: documents.extension,
      mimeType: documents.mimeType,
      sizeBytes: documents.sizeBytes,
      status: documents.status,
      errorMessage: documents.errorMessage,
      pageCount: documents.pageCount,
      chunkCount: documents.chunkCount,
      createdAt: documents.createdAt,
      uploadedById: documents.uploadedById,
      uploadedByName: users.name,
    })
    .from(documents)
    .leftJoin(users, eq(users.id, documents.uploadedById))
    .where(eq(documents.organizationId, organizationId))
    .orderBy(desc(documents.createdAt));
}

export async function countDocuments(organizationId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(documents)
    .where(eq(documents.organizationId, organizationId));

  return row?.value ?? 0;
}

/**
 * Stores the bytes, records the row and queues processing.
 *
 * The file is written before the row so a database failure can delete it; the
 * reverse order would leave a row pointing at nothing. If the queue is down,
 * the document is kept with status `failed` and can be retried from the UI
 * instead of losing the upload.
 */
export async function createDocument(input: {
  organizationId: string;
  actorId: string;
  fileName: string;
  buffer: Buffer;
}): Promise<{ id: string; name: string; status: DocumentStatus }> {
  const actor = await requireMembership(input.organizationId, input.actorId);
  assertCan(actor.role, "document:upload");

  const detection = detectFileType(input.fileName, input.buffer);
  if (!detection.ok) {
    throw new ValidationError(DETECTION_MESSAGES[detection.reason]);
  }

  const { extension, mimeType } = detection.file;
  const id = randomUUID();
  const storageKey = storageKeyFor(input.organizationId, id, extension);

  await saveFile(storageKey, input.buffer);

  try {
    await db.insert(documents).values({
      id,
      organizationId: input.organizationId,
      uploadedById: input.actorId,
      name: input.fileName.slice(0, 200),
      storageKey,
      extension,
      mimeType,
      sizeBytes: input.buffer.length,
    });
  } catch (error) {
    await deleteStoredFile(storageKey).catch((cleanupError: unknown) => {
      logger.warn("documents.orphan_file", {
        storageKey,
        message: String(cleanupError),
      });
    });
    throw error;
  }

  let status: DocumentStatus = "pending";

  try {
    await enqueueDocumentProcessing({
      documentId: id,
      organizationId: input.organizationId,
    });
  } catch (error) {
    status = "failed";
    logger.error("documents.enqueue.failed", {
      documentId: id,
      message: error instanceof Error ? error.message : String(error),
    });
    await db
      .update(documents)
      .set({
        status,
        errorMessage: "Processing could not be queued. Try again.",
      })
      .where(eq(documents.id, id));
  }

  logger.info("documents.created", {
    documentId: id,
    organizationId: input.organizationId,
    extension,
    sizeBytes: input.buffer.length,
    status,
  });

  return { id, name: input.fileName.slice(0, 200), status };
}

/**
 * Resolves a document and checks the caller may manage it.
 *
 * The matrix grants deletion to owners and admins, but the uploader can always
 * delete their own file. That is a property of the row, so it belongs here and
 * not in the role table.
 */
async function requireManageableDocument(input: {
  organizationId: string;
  actorId: string;
  documentId: string;
}) {
  const actor = await requireMembership(input.organizationId, input.actorId);

  const document = await db.query.documents.findFirst({
    where: and(
      eq(documents.id, input.documentId),
      eq(documents.organizationId, input.organizationId),
    ),
    columns: {
      id: true,
      uploadedById: true,
      storageKey: true,
      status: true,
    },
  });

  if (!document) throw new NotFoundError("Document not found.");

  const allowed =
    can(actor.role, "document:delete") ||
    document.uploadedById === input.actorId;

  if (!allowed) {
    throw new ForbiddenError("You cannot manage this document.");
  }

  return document;
}

export async function deleteDocument(input: {
  organizationId: string;
  actorId: string;
  documentId: string;
}): Promise<void> {
  const document = await requireManageableDocument(input);

  // Chunks disappear through the ON DELETE CASCADE on document_chunks.
  await db
    .delete(documents)
    .where(
      and(
        eq(documents.id, document.id),
        eq(documents.organizationId, input.organizationId),
      ),
    );

  await deleteStoredFile(document.storageKey).catch((error: unknown) => {
    // The row is gone; a leftover file is a cleanup issue, not a failed request.
    logger.warn("documents.delete_file_failed", {
      documentId: document.id,
      message: error instanceof Error ? error.message : String(error),
    });
  });

  logger.info("documents.deleted", {
    documentId: document.id,
    organizationId: input.organizationId,
  });
}

export async function retryDocument(input: {
  organizationId: string;
  actorId: string;
  documentId: string;
}): Promise<void> {
  const document = await requireManageableDocument(input);

  if (document.status !== "failed") {
    throw new ConflictError("Only failed documents can be retried.");
  }

  await db.transaction(async (tx) => {
    await tx
      .delete(documentChunks)
      .where(eq(documentChunks.documentId, document.id));

    await tx
      .update(documents)
      .set({
        status: "pending",
        errorMessage: null,
        chunkCount: 0,
        pageCount: null,
      })
      .where(
        and(
          eq(documents.id, document.id),
          eq(documents.organizationId, input.organizationId),
        ),
      );
  });

  try {
    await enqueueDocumentProcessing({
      documentId: document.id,
      organizationId: input.organizationId,
    });
  } catch (error) {
    await db
      .update(documents)
      .set({
        status: "failed",
        errorMessage: "Processing could not be queued. Try again.",
      })
      .where(eq(documents.id, document.id));

    logger.error("documents.retry.enqueue_failed", {
      documentId: document.id,
      message: error instanceof Error ? error.message : String(error),
    });
    throw new ConflictError("Processing could not be queued. Try again.");
  }
}
