import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { hashPassword } from "@/server/auth/password";

export type CreateAccountInput = {
  name: string;
  email: string;
  password: string;
};

export type CreateAccountResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "email_taken" };

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23505"
  );
}

/**
 * Creates a password account.
 *
 * The duplicate check gives a readable error; the unique index on `users.email`
 * is the real guard, because two requests can pass the check simultaneously.
 * Both paths return the same result so the caller cannot tell them apart.
 */
export async function createAccount(
  input: CreateAccountInput,
): Promise<CreateAccountResult> {
  const existing = await db.query.users.findFirst({
    where: eq(users.email, input.email),
    columns: { id: true },
  });

  if (existing) return { ok: false, reason: "email_taken" };

  const passwordHash = await hashPassword(input.password);

  try {
    const [row] = await db
      .insert(users)
      .values({
        name: input.name,
        email: input.email,
        passwordHash,
      })
      .returning({ id: users.id });

    return { ok: true, userId: row.id };
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, reason: "email_taken" };
    throw error;
  }
}
