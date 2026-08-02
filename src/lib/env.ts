import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(32),
  VIEWER_PASSWORD_HASH: z.string().min(20),
  ADMIN_PASSWORD_HASH: z.string().min(20),
  UPLOAD_DIR: z.string().default("data/uploads"),
  APP_NAME: z.string().default("RandomeriaFlix"),

  // Live chat notifications (all optional — features silently no-op if unset)
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_WEBHOOK_SECRET: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),

  // Web push (Add to Home Screen notifications) — optional, silently no-op if unset
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().optional(),
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
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    TELEGRAM_WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    SMTP_FROM: process.env.SMTP_FROM,
    VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
    VAPID_SUBJECT: process.env.VAPID_SUBJECT,
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
