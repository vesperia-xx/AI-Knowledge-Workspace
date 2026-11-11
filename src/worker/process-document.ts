import { UnrecoverableError, type Job } from "bullmq";

import { processDocument } from "@/server/documents/process";
import type { DocumentJobData } from "@/server/documents/job";
import { isAppError } from "@/server/lib/errors";

/**
 * Adapter between BullMQ and the processing pipeline.
 *
 * A `ValidationError` is permanent (corrupt PDF, no text); retrying it three
 * times only delays the message to the user. Every other failure keeps the
 * normal retry/backoff behaviour, which covers Redis blips and disk hiccups.
 */
export async function processDocumentJob(
  job: Job<DocumentJobData>,
): Promise<void> {
  try {
    await processDocument(job.data);
  } catch (error) {
    if (isAppError(error)) {
      throw new UnrecoverableError(error.message);
    }
    throw error;
  }
}
