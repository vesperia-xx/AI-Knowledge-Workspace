export type ErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL";

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION: 422,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};

export interface AppErrorOptions {
  code?: ErrorCode;
  status?: number;
  cause?: unknown;
  /** When false, the message is replaced with a generic one in API responses. */
  expose?: boolean;
}

/**
 * Base class for expected, domain-level failures. Anything that is not an
 * AppError is treated as an unexpected bug and never leaks its message.
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly expose: boolean;

  constructor(message: string, options: AppErrorOptions = {}) {
    super(message, { cause: options.cause });
    this.name = new.target.name;
    this.code = options.code ?? "INTERNAL";
    this.status = options.status ?? STATUS_BY_CODE[this.code];
    this.expose = options.expose ?? this.code !== "INTERNAL";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "You must sign in to continue.", options: AppErrorOptions = {}) {
    super(message, { code: "UNAUTHORIZED", ...options });
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have access to this resource.", options: AppErrorOptions = {}) {
    super(message, { code: "FORBIDDEN", ...options });
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found.", options: AppErrorOptions = {}) {
    super(message, { code: "NOT_FOUND", ...options });
  }
}

export class ValidationError extends AppError {
  constructor(message = "The submitted data is invalid.", options: AppErrorOptions = {}) {
    super(message, { code: "VALIDATION", ...options });
  }
}

export class ConflictError extends AppError {
  constructor(message = "That action conflicts with the current state.", options: AppErrorOptions = {}) {
    super(message, { code: "CONFLICT", ...options });
  }
}

export class RateLimitError extends AppError {
  constructor(message = "Too many requests. Try again shortly.", options: AppErrorOptions = {}) {
    super(message, { code: "RATE_LIMITED", ...options });
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export interface ErrorResponseBody {
  error: {
    code: ErrorCode;
    message: string;
  };
}

/**
 * Maps any thrown value to a safe HTTP response. Unexpected errors are logged
 * by the caller and exposed as a generic 500, never with their real message.
 */
export function toErrorResponse(error: unknown): {
  status: number;
  body: ErrorResponseBody;
} {
  if (isAppError(error)) {
    return {
      status: error.status,
      body: {
        error: {
          code: error.code,
          message: error.expose ? error.message : "Something went wrong.",
        },
      },
    };
  }

  return {
    status: 500,
    body: { error: { code: "INTERNAL", message: "Something went wrong." } },
  };
}
