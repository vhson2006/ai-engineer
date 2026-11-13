import 'server-only';
import { getSessionUser } from '../auth/session';
import type { RateLimitPolicy } from '../security/rate-limit';
import { limitAction } from './limit';
import type { ActionFailure } from './result';

export const signedOut: ActionFailure = { ok: false, code: 'unauthenticated', message: 'Please sign in again.' };

/**
 * The start of every Server Action (.claude/rules/forms.md 3, 3a): the rate limit first, then the
 * session re-checked (a Server Action is a POST to any page: the page's check doesn't protect it).
 * `null` policy: no limit (reads such as polling), the session still checked.
 *
 *   const start = await guardAction(LIMITS.mutation);
 *   if (!start.ok) return start;
 *   // start.userId: the caller, for once() keys
 */
export async function guardAction(policy: RateLimitPolicy | null): Promise<ActionFailure | { ok: true; userId: string }> {
  const limited = policy && (await limitAction(policy));
  if (limited) return limited;
  const user = await getSessionUser().catch(() => null);
  return user ? { ok: true, userId: user.id } : signedOut;
}
