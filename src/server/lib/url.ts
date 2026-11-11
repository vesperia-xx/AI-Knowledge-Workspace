import "server-only";

import { headers } from "next/headers";

/**
 * Builds an absolute URL for links we show to the user (invitations).
 *
 * Behind a proxy these headers are set by the platform; locally they fall back
 * to localhost. Phase 10 replaces this with an explicit APP_URL: trusting a
 * Host header is fine for display, not for anything security-sensitive.
 */
export async function absoluteUrl(path: string): Promise<string> {
  const headerList = await headers();
  const host =
    headerList.get("x-forwarded-host") ??
    headerList.get("host") ??
    "localhost:3000";
  const proto =
    headerList.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");

  return `${proto}://${host}${path}`;
}
