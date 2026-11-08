import { describe, expect, it } from "vitest";

import {
  ForbiddenError,
  NotFoundError,
  toErrorResponse,
  UnauthorizedError,
} from "./errors";

describe("toErrorResponse", () => {
  it("maps known errors to their status and code", () => {
    expect(toErrorResponse(new UnauthorizedError())).toMatchObject({
      status: 401,
      body: { error: { code: "UNAUTHORIZED" } },
    });

    expect(toErrorResponse(new ForbiddenError())).toMatchObject({
      status: 403,
      body: { error: { code: "FORBIDDEN" } },
    });

    expect(toErrorResponse(new NotFoundError())).toMatchObject({
      status: 404,
      body: { error: { code: "NOT_FOUND" } },
    });
  });

  it("never leaks unexpected error messages", () => {
    const response = toErrorResponse(new Error("column users.password leaked"));

    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe("INTERNAL");
    expect(response.body.error.message).toBe("Something went wrong.");
  });
});
