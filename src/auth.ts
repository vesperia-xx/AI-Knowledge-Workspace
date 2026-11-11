import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { db } from "@/server/db";
import {
  accounts,
  sessions,
  users,
  verificationTokens,
} from "@/server/db/schema";
import { authConfig } from "@/server/auth/config";
import { loginSchema } from "@/server/auth/schemas";
import { verifyPassword } from "@/server/auth/password";

/**
 * A valid bcrypt hash of a value nobody knows. Unknown emails are compared
 * against it so a failed login takes the same time whether the account exists
 * or not; otherwise the response time tells an attacker which emails are real.
 */
const DUMMY_HASH = "$2b$10$Hjaivldq83UUxf6RHWnmhurzQP/Sve5c8ZPwT.26I54njVSbKSsmS";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  logger: {
    error(error) {
      // A wrong password is an expected outcome, not a server failure. Logging
      // it as an error would flood production logs with noise.
      if ((error as { type?: string }).type === "CredentialsSignin") return;
      console.error("[auth][error]", error);
    },
  },
  providers: [
    Credentials({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await db.query.users.findFirst({
          where: eq(users.email, parsed.data.email),
          columns: {
            id: true,
            name: true,
            email: true,
            image: true,
            passwordHash: true,
          },
        });

        const hash = user?.passwordHash ?? DUMMY_HASH;
        const passwordMatches = await verifyPassword(parsed.data.password, hash);

        if (!user?.passwordHash || !passwordMatches) return null;

        // Returning the id is what puts `sub` in the JWT. The password hash
        // never leaves this function.
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
  ],
});
