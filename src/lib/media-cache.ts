/**
 * Shared cache policies used by the media API so they stay consistent.
 * Images → immutable (never re-fetch), video/audio → daily revalidate.
 */
export const CACHE = {
  /** Photos — never change after upload, so browsers can cache forever. */
  IMAGE: "public, max-age=31536000, immutable",
  /** Videos & audio — long but check back daily. */
  STREAM: "public, max-age=86400, must-revalidate",
  /** Everything else. */
  DEFAULT: "public, max-age=3600",
} as const;
