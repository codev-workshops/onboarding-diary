/**
 * Environment configuration.
 *
 * Parsed once, at first import, so that a misconfigured deployment fails at
 * startup with a readable message rather than at the first database query
 * (S13: secrets come from the environment only, never from committed defaults).
 */
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(', ');
    throw new Error(`Invalid environment configuration — ${issues}`);
  }
  return parsed.data;
}

export const env: Env = loadEnv();
