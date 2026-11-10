"use server";

import { AuthError } from "next-auth";
import { z } from "zod";

import { signIn, signOut } from "@/auth";
import { logger } from "@/server/lib/logger";
import {
  loginSchema,
  registerSchema,
  type AuthFormState,
} from "@/server/auth/form-state";
import { createAccount } from "@/server/services/accounts";

/** Only same-origin, relative paths: prevents an open redirect via ?callbackUrl. */
function safeRedirect(value: FormDataEntryValue | null): string {
  const fallback = "/dashboard";
  if (typeof value !== "string" || !value.startsWith("/")) return fallback;
  return value.startsWith("//") ? fallback : value;
}

/**
 * `signIn` signals success by throwing a redirect. Only AuthError means the
 * credentials were rejected; anything else must be rethrown or the redirect is
 * swallowed and the user appears to stay on the login page.
 */
async function signInWithCredentials(
  email: string,
  password: string,
  redirectTo: string,
): Promise<AuthFormState> {
  try {
    await signIn("credentials", { email, password, redirectTo });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      return { message: "Invalid email or password." };
    }
    throw error;
  }
}

export async function loginAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  return signInWithCredentials(
    parsed.data.email,
    parsed.data.password,
    safeRedirect(formData.get("callbackUrl")),
  );
}

export async function registerAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const result = await createAccount(parsed.data);

  if (!result.ok) {
    return {
      fieldErrors: { email: ["An account with this email already exists."] },
    };
  }

  logger.info("user.registered", { userId: result.userId });

  return signInWithCredentials(
    parsed.data.email,
    parsed.data.password,
    "/dashboard",
  );
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}
