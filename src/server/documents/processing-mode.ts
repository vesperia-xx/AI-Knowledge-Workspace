export type ProcessingMode = "queue" | "inline";

/**
 * Chooses how a new document reaches the processing pipeline.
 *
 * - `queue`: a BullMQ worker consumes the job (local Docker, long-lived hosts).
 * - `inline`: the pipeline runs after the response, inside the same function
 *   (serverless platforms, where no worker process exists).
 *
 * The explicit variable wins over platform detection so a deployment can opt
 * into either behaviour without code changes.
 */
export function resolveProcessingMode(env: {
  DOCUMENT_PROCESSING?: string;
  VERCEL?: string;
}): ProcessingMode {
  if (env.DOCUMENT_PROCESSING === "inline") return "inline";
  if (env.DOCUMENT_PROCESSING === "queue") return "queue";
  return env.VERCEL ? "inline" : "queue";
}
