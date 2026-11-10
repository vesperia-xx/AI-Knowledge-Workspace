import bcrypt from "bcryptjs";

/**
 * bcrypt cost. Each increment doubles the work; 10 is the lowest value still
 * considered safe, and on this machine it takes ~460 ms in pure JavaScript.
 * Phase 9 replaces this with Argon2id, which is memory-hard and therefore
 * resists GPU cracking far better.
 */
const COST = 10;

/** bcrypt silently truncates input at 72 bytes, so the schema rejects longer. */
export const MAX_PASSWORD_BYTES = 72;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, COST);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
