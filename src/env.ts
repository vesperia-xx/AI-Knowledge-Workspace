import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.url().refine(
    (val) => val.startsWith('postgres://') || val.startsWith('postgresql://'),
    { message: "DATABASE_URL debe empezar por postgres:// o postgresql://" }
  ),
  REDIS_URL: z.url().refine(
    (val) => val.startsWith('redis://'),
    { message: "REDIS_URL debe empezar por redis://" }
  ),
  AUTH_SECRET: z.string().min(32, { message: "AUTH_SECRET debe tener al menos 32 caracteres" }),
});

export function parseEnv(source: NodeJS.ProcessEnv) {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    throw new Error(z.prettifyError(result.error));
  }

  return result.data;
}

export const env = parseEnv(process.env);