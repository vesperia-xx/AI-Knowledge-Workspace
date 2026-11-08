type LogLevel = "debug" | "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const MIN_LEVEL: LogLevel = process.env.NODE_ENV === "production" ? "info" : "debug";

function write(level: LogLevel, message: string, context?: LogContext) {
  if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[MIN_LEVEL]) return;

  const entry = {
    level,
    message,
    time: new Date().toISOString(),
    ...context,
  };

  // Structured output in production so logs can be shipped and queried.
  const line =
    process.env.NODE_ENV === "production"
      ? JSON.stringify(entry)
      : `[${level}] ${message}${context ? ` ${JSON.stringify(context)}` : ""}`;

  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

/**
 * Minimal structured logger. It is intentionally dependency-free so the
 * project stays easy to read; a production deployment can swap the sink
 * for pino, Axiom or similar without touching call sites.
 */
export const logger = {
  debug: (message: string, context?: LogContext) => write("debug", message, context),
  info: (message: string, context?: LogContext) => write("info", message, context),
  warn: (message: string, context?: LogContext) => write("warn", message, context),
  error: (message: string, context?: LogContext) => write("error", message, context),
};
