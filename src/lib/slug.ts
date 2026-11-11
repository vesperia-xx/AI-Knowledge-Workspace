const MAX_LENGTH = 40;
const FALLBACK = "workspace";

/**
 * Turns a display name into a URL-safe slug.
 *
 * Deliberately pure and deterministic: the caller decides how to resolve
 * collisions, and the behaviour is easy to test.
 *
 *   "Acme Corp"   -> "acme-corp"
 *   "  ÁÉÍ ÓÚ  "  -> "aei-ou"
 *   "!!!"         -> "workspace"
 */
export function slugify(value: string): string {
  const slug = value
    .normalize("NFKD")
    // Strip combining marks left by NFKD: á -> a.
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_LENGTH)
    // A trailing hyphen can appear after truncation.
    .replace(/-+$/g, "");

  return slug.length >= 3 ? slug : FALLBACK;
}

/** "acme" + 2 -> "acme-2". Used when the base slug is taken. */
export function slugWithSuffix(slug: string, attempt: number): string {
  if (attempt <= 1) return slug;
  return `${slug}-${attempt}`;
}
