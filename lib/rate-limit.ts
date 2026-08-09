import "server-only";

type RateLimitEntry = { attempts: number; resetAt: number };
type RateLimitStore = Map<string, RateLimitEntry>;

const globalRateLimit = globalThis as typeof globalThis & { __bitacoraRateLimits?: RateLimitStore };
const store = globalRateLimit.__bitacoraRateLimits ?? new Map<string, RateLimitEntry>();
globalRateLimit.__bitacoraRateLimits = store;

export type RateLimitResult = { allowed: boolean; limit: number; remaining: number; retryAfter: number };

export function getRequestAddress(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (forwarded || request.headers.get("x-real-ip") || "unknown").slice(0, 80);
}

export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const current = store.get(key);
  const entry = !current || current.resetAt <= now ? { attempts: 0, resetAt: now + windowMs } : current;
  entry.attempts += 1;
  store.set(key, entry);

  if (store.size > 2_000) {
    for (const [storedKey, value] of store) {
      if (value.resetAt <= now) store.delete(storedKey);
    }
  }

  return {
    allowed: entry.attempts <= limit,
    limit,
    remaining: Math.max(0, limit - entry.attempts),
    retryAfter: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
  };
}

export function rateLimitHeaders(result: RateLimitResult) {
  return {
    "Retry-After": String(result.retryAfter),
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
  };
}
