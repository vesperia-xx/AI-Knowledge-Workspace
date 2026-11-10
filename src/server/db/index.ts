import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { env } from "@/env";

import * as schema from "./schema";

const globalForDb = globalThis as unknown as { pool?: Pool };

/**
 * A single pool per process. In development Next.js re-evaluates modules on
 * every edit; without caching the pool on `globalThis` each reload would open
 * a new set of connections until Postgres refuses them.
 */
export const pool =
  globalForDb.pool ??
  new Pool({
    connectionString: env.DATABASE_URL,
    max: 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pool = pool;
}

export const db = drizzle(pool, { schema });
