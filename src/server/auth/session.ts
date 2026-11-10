import "server-only";

import { eq } from "drizzle-orm";
import { cache } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";

export type CurrentUser = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
};

/**
 * Data access layer for the signed-in user.
 *
 * The JWT only proves *who* the caller is. This function turns that claim into
 * a row that still exists, so deleting a user or changing their role takes
 * effect on the next request instead of when the token expires.
 *
 * `cache` deduplicates calls within a single render pass (layout + page both
 * asking for the user hit the database once).
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { id: true, name: true, email: true, image: true },
  });

  return user ?? null;
});

/** For pages and layouts: redirects instead of returning null. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
