import 'server-only';
import { headers } from 'next/headers';
import { getSessionUser } from '../auth/session';
import { clientIp, rateLimit, type RateLimitPolicy } from '../security/rate-limit';
import type { ActionFailure } from './result';

/**
 * Rate limit for a Server Action, per signed-in user (per client IP when signed out).
 * Call it first in every state-changing action (.claude/rules/forms.md):
 *
 *   const limited = await limitAction(LIMITS.upload);
 *   if (limited) return limited;
 *
 * Returns null when allowed, otherwise an ActionFailure the UI can show (`rate_limited`).
 */
export async function limitAction(policy: RateLimitPolicy): Promise<ActionFailure | null> {
  const user = await getSessionUser();
  const subject = user ? `user:${user.id}` : `ip:${clientIp(await headers())}`;
  const result = await rateLimit(policy, subject);
  if (result.allowed) return null;
  return {
    ok: false,
    code: 'rate_limited',
    message: `Too many requests. Please wait ${formatWait(result.retryAfterS)} and try again.`,
    retryAfterS: result.retryAfterS,
  };
}

function formatWait(seconds: number): string {
  return seconds < 90 ? `${seconds} seconds` : `${Math.ceil(seconds / 60)} minutes`;
}
