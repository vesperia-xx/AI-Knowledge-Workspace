import { defineConfig } from "drizzle-kit";

// `next dev` and `next build` load `.env.local`. `drizzle-kit` only loads `.env`,
// so the CLI would otherwise see a different database than the app. Node's
// built-in loader keeps both reading the same file without duplicating values.
try {
  process.loadEnvFile(".env.local");
} catch {
  // Optional: CI and production provide the variables through the environment.
}

const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.",
  );
}

export default defineConfig({
  schema: "./src/server/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
