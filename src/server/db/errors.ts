/**
 * Postgres error helpers for Drizzle.
 *
 * Drizzle wraps driver errors in a `DrizzleQueryError` whose own `code` is
 * undefined; the Postgres payload lives in `cause`. Looking only at the thrown
 * object silently breaks "retry on conflict" logic, so every check goes through
 * this walker instead.
 */

function postgresErrorDetails(error: unknown): {
  code?: string;
  constraint?: string;
} | null {
  let current: unknown = error;

  // The chain is short (wrap -> pg error); the bound is only a safety net.
  for (let depth = 0; depth < 5 && current; depth += 1) {
    if (typeof current === "object") {
      const candidate = current as { code?: unknown; constraint?: unknown; cause?: unknown };
      if (typeof candidate.code === "string") {
        return {
          code: candidate.code,
          constraint:
            typeof candidate.constraint === "string"
              ? candidate.constraint
              : undefined,
        };
      }
      current = candidate.cause;
      continue;
    }
    break;
  }

  return null;
}

/** 23505 = unique_violation. Optionally narrowed to one constraint name. */
export function isUniqueViolation(
  error: unknown,
  constraint?: string,
): boolean {
  const details = postgresErrorDetails(error);
  if (details?.code !== "23505") return false;
  return constraint ? details.constraint === constraint : true;
}

/** 23503 = foreign_key_violation. */
export function isForeignKeyViolation(error: unknown): boolean {
  return postgresErrorDetails(error)?.code === "23503";
}
