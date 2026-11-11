/**
 * Document processing worker. A separate process on purpose: parsing a PDF is
 * slow and must never block a request or be killed by a deploy of the web app.
 *
 * Run with `npm run worker:dev` (watch) or `npm run worker`.
 *
 * `--conditions=react-server` makes `server-only` resolve to its no-op export,
 * so this process can reuse the exact same services as the app instead of
 * duplicating queries.
 */
try {
  process.loadEnvFile(".env.local");
} catch {
  // Production passes real environment variables; no file to load.
}

async function main(): Promise<void> {
  const { Worker } = await import("bullmq");

  const { env } = await import("@/env");
  const { DOCUMENTS_QUEUE } = await import("@/server/documents/job");
  const { pool } = await import("@/server/db");
  const { logger } = await import("@/server/lib/logger");
  const { processDocumentJob } = await import("./process-document");

  const worker = new Worker(DOCUMENTS_QUEUE, processDocumentJob, {
    connection: { url: env.REDIS_URL },
    // Parsing is CPU-bound; two at a time leaves room for the web process on a
    // small machine. Scale horizontally by running more workers.
    concurrency: 2,
  });

  worker.on("completed", (job) => {
    logger.info("worker.job.completed", {
      jobId: job.id,
      documentId: job.data.documentId,
    });
  });

  worker.on("failed", (job, error) => {
    logger.error("worker.job.failed", {
      jobId: job?.id,
      documentId: job?.data.documentId,
      attemptsMade: job?.attemptsMade,
      message: error.message,
    });
  });

  worker.on("error", (error) => {
    logger.error("worker.error", { message: error.message });
  });

  logger.info("worker.started", { queue: DOCUMENTS_QUEUE, concurrency: 2 });

  let shuttingDown = false;
  async function shutdown(signal: string): Promise<void> {
    if (shuttingDown) return;
    shuttingDown = true;

    logger.info("worker.stopping", { signal });
    // close() waits for in-flight jobs; the database pool is drained after.
    await worker.close();
    await pool.end();
    process.exit(0);
  }

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  process.on("unhandledRejection", (reason) => {
    logger.error("worker.unhandled_rejection", {
      message: reason instanceof Error ? reason.message : String(reason),
    });
  });
}

main().catch((error: unknown) => {
  console.error("Worker failed to start:", error);
  process.exit(1);
});
