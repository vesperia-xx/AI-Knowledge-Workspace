import "server-only";

import { Queue } from "bullmq";

import { env } from "@/env";
import { DOCUMENTS_QUEUE, type DocumentJobData } from "@/server/documents/job";
import { logger } from "@/server/lib/logger";

export { DOCUMENTS_QUEUE, type DocumentJobData };

const globalForQueue = globalThis as unknown as {
  documentsQueue?: Queue<DocumentJobData>;
};

function createQueue(): Queue<DocumentJobData> {
  const queue = new Queue<DocumentJobData>(DOCUMENTS_QUEUE, {
    // BullMQ opens and owns its connections in v6.
    connection: { url: env.REDIS_URL },
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 3_000 },
      removeOnComplete: { age: 60 * 60, count: 1_000 },
      removeOnFail: { age: 24 * 60 * 60, count: 1_000 },
    },
  });

  queue.on("error", (error) => {
    logger.error("documents.queue.error", { message: error.message });
  });

  return queue;
}

/**
 * Cached on globalThis for the same reason as the Postgres pool: Next.js
 * re-evaluates modules on every edit in development, and each new Queue would
 * open another connection until Redis refuses them.
 */
export const documentsQueue = globalForQueue.documentsQueue ?? createQueue();

if (process.env.NODE_ENV !== "production") {
  globalForQueue.documentsQueue = documentsQueue;
}

export async function enqueueDocumentProcessing(
  data: DocumentJobData,
): Promise<void> {
  await documentsQueue.add("process", data);
}
