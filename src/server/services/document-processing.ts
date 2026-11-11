import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/server/db";
import { documentChunks, documents } from "@/server/db/schema";
import type { TextChunk } from "@/server/documents/chunk";

export type DocumentForProcessing = {
  id: string;
  organizationId: string;
  storageKey: string;
  extension: string;
};

/**
 * Moves a document to `processing` and returns what the worker needs.
 *
 * The filter includes the organization on purpose: a malformed job cannot make
 * the worker touch another tenant's file. Returns null when the document was
 * deleted between enqueueing and pickup, which is a normal outcome.
 */
export async function claimDocument(input: {
  documentId: string;
  organizationId: string;
}): Promise<DocumentForProcessing | null> {
  const [document] = await db
    .update(documents)
    .set({ status: "processing", errorMessage: null })
    .where(
      and(
        eq(documents.id, input.documentId),
        eq(documents.organizationId, input.organizationId),
      ),
    )
    .returning({
      id: documents.id,
      organizationId: documents.organizationId,
      storageKey: documents.storageKey,
      extension: documents.extension,
    });

  return document ?? null;
}

const INSERT_BATCH_SIZE = 200;

/**
 * Replaces the document's chunks and marks it ready in one transaction.
 *
 * Deleting first makes the job idempotent: a retry after a crash halfway
 * through leaves no duplicates and no partial state.
 */
export async function completeDocument(input: {
  documentId: string;
  organizationId: string;
  chunks: TextChunk[];
  pageCount: number | null;
}): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .delete(documentChunks)
      .where(eq(documentChunks.documentId, input.documentId));

    for (let offset = 0; offset < input.chunks.length; offset += INSERT_BATCH_SIZE) {
      const batch = input.chunks
        .slice(offset, offset + INSERT_BATCH_SIZE)
        .map((chunk) => ({
          documentId: input.documentId,
          chunkIndex: chunk.index,
          content: chunk.content,
          charCount: chunk.charCount,
        }));

      if (batch.length > 0) await tx.insert(documentChunks).values(batch);
    }

    await tx
      .update(documents)
      .set({
        status: "ready",
        errorMessage: null,
        chunkCount: input.chunks.length,
        pageCount: input.pageCount,
      })
      .where(
        and(
          eq(documents.id, input.documentId),
          eq(documents.organizationId, input.organizationId),
        ),
      );
  });
}

export async function failDocument(input: {
  documentId: string;
  organizationId: string;
  message: string;
}): Promise<void> {
  await db
    .update(documents)
    .set({ status: "failed", errorMessage: input.message.slice(0, 500) })
    .where(
      and(
        eq(documents.id, input.documentId),
        eq(documents.organizationId, input.organizationId),
      ),
    );
}
