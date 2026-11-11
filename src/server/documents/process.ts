import "server-only";

import { chunkText } from "@/server/documents/chunk";
import { extractDocumentText } from "@/server/documents/extract";
import { isDocumentExtension } from "@/server/documents/file-types";
import { readStoredFile } from "@/server/storage/local";
import { isAppError } from "@/server/lib/errors";
import { logger } from "@/server/lib/logger";
import {
  claimDocument,
  completeDocument,
  failDocument,
} from "@/server/services/document-processing";

export type ProcessDocumentInput = {
  documentId: string;
  organizationId: string;
};

/**
 * The whole processing step, independent from BullMQ.
 *
 * Keeping it free of queue types means the pipeline can be tested by calling
 * it directly, and a future CLI `--retry-all` command could reuse it.
 */
export async function processDocument(
  input: ProcessDocumentInput,
): Promise<void> {
  const document = await claimDocument(input);

  if (!document) {
    // Deleted between enqueue and pickup. Nothing to do.
    logger.warn("documents.process.missing", input);
    return;
  }

  try {
    if (!isDocumentExtension(document.extension)) {
      throw new Error(`Unsupported stored extension: ${document.extension}`);
    }

    const buffer = await readStoredFile(document.storageKey);
    const { text, pageCount } = await extractDocumentText(
      document.extension,
      buffer,
    );
    const chunks = chunkText(text);

    await completeDocument({
      documentId: document.id,
      organizationId: document.organizationId,
      chunks,
      pageCount,
    });

    logger.info("documents.processed", {
      documentId: document.id,
      organizationId: document.organizationId,
      chunks: chunks.length,
    });
  } catch (error) {
    // A broken file will fail again on every retry: it is the user's cue, not
    // a transient outage. The worker turns AppError into an unrecoverable job.
    const message = isAppError(error)
      ? error.message
      : "Processing failed. It will be retried.";

    await failDocument({
      documentId: document.id,
      organizationId: document.organizationId,
      message,
    }).catch((dbError: unknown) => {
      logger.error("documents.process.fail_write_failed", {
        documentId: document.id,
        message: dbError instanceof Error ? dbError.message : String(dbError),
      });
    });

    logger.error("documents.process.failed", {
      documentId: document.id,
      organizationId: document.organizationId,
      message: error instanceof Error ? error.message : String(error),
    });

    throw error;
  }
}
