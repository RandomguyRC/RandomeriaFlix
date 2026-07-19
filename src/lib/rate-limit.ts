// Simple in-memory rate limiter for a single-process deployment
// (fine for a small self-hosted VM; if you ever run multiple instances
// behind a load balancer, swap this for a shared store like Redis).

interface Attempt {
  count: number;
  firstAttempt: number;
  lockedUntil: number | null;
}

const attempts = new Map<string, Attempt>();

const WINDOW_MS = 10 * 60 * 1000; // 10 minute window
const MAX_ATTEMPTS = 5; // allowed failures within the window
const LOCKOUT_MS = 15 * 60 * 1000; // lock out for 15 minutes after exceeding

// Periodically clean up old entries so the map doesn't grow forever
setInterval(() => {
  const now = Date.now();
  for (const [key, a] of attempts) {
    if ((a.lockedUntil ?? 0) < now && now - a.firstAttempt > WINDOW_MS) {
      attempts.delete(key);
    }
  }
}, 5 * 60 * 1000).unref?.();

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

export function checkRateLimit(key: string): RateLimitResult {
  const now = Date.now();
  const entry = attempts.get(key);

  if (entry?.lockedUntil && entry.lockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((entry.lockedUntil - now) / 1000),
    };
  }

  return { allowed: true };
}

// Call after a FAILED login attempt
export function recordFailedAttempt(key: string) {
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || now - entry.firstAttempt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAttempt: now, lockedUntil: null });
    return;
  }

  entry.count += 1;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_MS;
  }
}

// Call after a SUCCESSFUL login to clear any history for this key
export function clearAttempts(key: string) {
  attempts.delete(key);
}

// Best-effort client IP extraction behind a reverse proxy (nginx/Caddy/Cloudflare)
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}
