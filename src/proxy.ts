import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/server/auth/config";

/**
 * Next.js 16 renamed Middleware to Proxy and runs it on the Node.js runtime.
 *
 * This file only performs *optimistic* checks: it reads the signed session
 * cookie and redirects. It never touches the database, because it runs before
 * every matched request. The authoritative check lives in the DAL
 * (`src/server/auth/session.ts`).
 */
const { auth } = NextAuth(authConfig);

const AUTH_ROUTES = new Set(["/login", "/register"]);
const PROTECTED_PREFIXES = ["/dashboard", "/onboarding", "/app"];

export default auth((request) => {
  const { pathname, search } = request.nextUrl;
  const isAuthenticated = Boolean(request.auth?.user);
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (!isAuthenticated && isProtected) {
    const url = new URL("/login", request.nextUrl);
    url.searchParams.set("callbackUrl", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  if (isAuthenticated && AUTH_ROUTES.has(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  // Only the routes that need a decision. Everything else skips the proxy.
  matcher: [
    "/dashboard/:path*",
    "/onboarding",
    "/app/:path*",
    "/login",
    "/register",
  ],
};
