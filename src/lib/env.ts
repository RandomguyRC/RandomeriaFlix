import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(32),
  VIEWER_PASSWORD_HASH: z.string().min(20),
  ADMIN_PASSWORD_HASH: z.string().min(20),
  UPLOAD_DIR: z.string().default("data/uploads"),
  APP_NAME: z.string().default("RandomeriaFlix"),
});

function getEnv() {
  // Only parse on the server side
  if (typeof window !== "undefined") {
    return null;
  }
  return envSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    VIEWER_PASSWORD_HASH: process.env.VIEWER_PASSWORD_HASH,
    ADMIN_PASSWORD_HASH: process.env.ADMIN_PASSWORD_HASH,
    UPLOAD_DIR: process.env.UPLOAD_DIR,
    APP_NAME: process.env.APP_NAME,
  });
}

// Lazy singleton
let _env: ReturnType<typeof envSchema.parse> | null = null;

export function env() {
  if (!_env) {
    _env = getEnv();
  }
  return _env!;
}
