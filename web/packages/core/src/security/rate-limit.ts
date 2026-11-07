import 'server-only';
import { redisKeyPrefix } from '../server/env';
import { redis } from '../server/redis';
import { hashedKey } from './sealed';

/**
 * Rate limits of the web app (ADR 0017): fixed-window counters in Redis, shared by every replica.
 *
 *   const limit = await rateLimit(LIMITS.login, clientIp(request.headers));
 *   if (!limit.allowed) → refuse (Retry-After: limit.retryAfterS)
 *
 * Server Actions use `limitAction()` (lib/actions/limit.ts), which turns a refusal into an
 * ActionResult. The API itself is limited again by KrakenD (per endpoint and per token).
 *
 * Key: <prefix>rl:<policy>:<sha256(subject)>:<window number>. INCR, then EXPIRE on the first hit
 * (the "web" Redis ACL user has +incr +expire for this). Fails OPEN: if Redis is down, the
 * request goes through (and is logged) — a rate limiter must never take the site down.
 */

export interface RateLimitPolicy {
  /** Short name, part of the key: login, upload… */
  name: string;
  /** Requests allowed per window. */
  limit: number;
  windowS: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Seconds until the window resets (for Retry-After). */
  retryAfterS: number;
}

/** The two Redis commands a counter needs (injected in tests). */
export interface CounterStore {
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<unknown>;
}

const redisStore: CounterStore = {
  incr: (key) => redis().incr(key),
  expire: (key, seconds) => redis().expire(key, seconds),
};

/** The limits used by the app. Generous: they stop floods and scripts, not people. */
export const LIMITS = {
  /** GET /auth/login stores a PKCE transaction in Redis each time: per client IP. */
  login: { name: 'login', limit: 10, windowS: 300 },
  /** Upload tickets (presigned URLs): per user. */
  upload: { name: 'upload', limit: 30, windowS: 300 },
  /** Other state-changing Server Actions (delete…): per user. */
  mutation: { name: 'mutation', limit: 60, windowS: 300 },
  /** File exports (many API pages per request): per user. */
  export: { name: 'export', limit: 10, windowS: 300 },
} as const satisfies Record<string, RateLimitPolicy>;

export async function rateLimit(
  policy: RateLimitPolicy,
  subject: string,
  options: { store?: CounterStore; now?: number } = {},
): Promise<RateLimitResult> {
  const { store = redisStore, now = Date.now() } = options;
  const window = Math.floor(now / 1000 / policy.windowS);
  const retryAfterS = Math.max(1, (window + 1) * policy.windowS - Math.floor(now / 1000));
  const key = `${hashedKey(`${redisKeyPrefix()}rl:${policy.name}:`, subject)}:${window}`;
  try {
    const count = await store.incr(key);
    if (count === 1) await store.expire(key, policy.windowS + 1);
    return { allowed: count <= policy.limit, remaining: Math.max(0, policy.limit - count), retryAfterS };
  } catch (error) {
    console.error(`[rate-limit] ${policy.name}: counter unavailable, allowing the request:`, error instanceof Error ? error.message : error);
    return { allowed: true, remaining: policy.limit, retryAfterS };
  }
}

/**
 * The client's IP. The edge nginx SETS X-Real-IP to the address it sees (overwriting anything the
 * client sent); only the edge can reach this app in prod (NetworkPolicy portfolio-web-from-edge).
 * Behind a cloud load balancer that address is the LB's unless PROXY protocol is enabled (prod
 * follow-up). Direct dev access (localhost:3000) has no header: "direct".
 */
export function clientIp(headers: Headers): string {
  const real = headers.get('x-real-ip')?.trim();
  if (real) return real;
  const forwarded = headers.get('x-forwarded-for')?.split(',').map((s) => s.trim()).filter(Boolean);
  return forwarded?.at(-1) ?? 'direct'; // the last hop is the one our proxy appended
}
