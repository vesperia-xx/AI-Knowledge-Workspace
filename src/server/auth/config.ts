import type { NextAuthConfig } from "next-auth";

/**
 * Configuration shared by the app and the proxy.
 *
 * It deliberately contains no providers, no adapter and no imports that touch
 * Postgres or bcrypt: `proxy.ts` runs this file on every matched request, and
 * it must not open a database pool or load a password hasher just to read a
 * signed cookie.
 */
export const authConfig = {
  pages: { signIn: "/login" },
  session: {
    strategy: "jwt",
    // 30 days. A JWT cannot be revoked before it expires, which is why the DAL
    // re-reads the user from the database on every request.
    maxAge: 60 * 60 * 24 * 30,
  },
  trustHost: true,
  callbacks: {
    jwt({ token, user }) {
      // `user` is only defined on the request that signs the user in.
      if (user) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      // The cookie carries the user id; everything else is loaded from the DB.
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
