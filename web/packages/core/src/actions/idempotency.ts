import 'server-only';
import type { ActionResult } from './result';
import { redisKeyPrefix } from '../server/env';
import { redis } from '../server/redis';
import { hashedKey } from '../security/sealed';

/**
 * Once-only execution of a create (order, booking, payment) per submission, so a double click, a
 * resubmit or a retried request can't create it twice (.claude/rules/forms.md, rule 6).
 *
 * The form carries a random key generated when it is rendered (`newSubmissionId()`, hidden
 * input). The first submission with that key runs `action` and stores its successful result; any
 * later one gets that same result back without running anything. While the first is still
 * running, others get 409 `duplicate_submission`. A FAILED result is not stored: fixing the input
 * and submitting again works.
 *
 *   return once(`order:${user.id}:${input.submissionId}`, () => createOrderInApi(input));
 *
 * Put the user id in the scope: keys from different users must never collide.
 * Redis: only GET / SET NX EX / DEL (the "web" ACL user can't run Lua). Key: <prefix>idem:<sha256> (REDIS_KEY_PREFIX).
 */

const PENDING = '__pending__';

export interface IdempotencyStore {
  /** SET key value NX EX ttl → true if set. */
  claim(key: string, value: string, ttlS: number): Promise<boolean>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlS: number): Promise<void>;
  del(key: string): Promise<void>;
}

const redisStore: IdempotencyStore = {
  claim: async (key, value, ttlS) => (await redis().set(key, value, 'EX', ttlS, 'NX')) === 'OK',
  get: (key) => redis().get(key),
  set: async (key, value, ttlS) => {
    await redis().set(key, value, 'EX', ttlS);
  },
  del: async (key) => {
    await redis().del(key);
  },
};

export async function once<T>(
  scope: string,
  action: () => Promise<ActionResult<T>>,
  options: { ttlS?: number; pendingTtlS?: number; store?: IdempotencyStore } = {},
): Promise<ActionResult<T>> {
  const { ttlS = 24 * 3600, pendingTtlS = 60, store = redisStore } = options;
  const key = hashedKey(`${redisKeyPrefix()}idem:`, scope);

  if (!(await store.claim(key, PENDING, pendingTtlS))) {
    const previous = await store.get(key);
    if (previous && previous !== PENDING) return JSON.parse(previous) as ActionResult<T>;
    return {
      ok: false,
      code: 'duplicate_submission',
      message: 'This form is already being submitted. Please wait a moment.',
    };
  }

  try {
    const result = await action();
    if (result.ok) await store.set(key, JSON.stringify(result), ttlS);
    else await store.del(key); // let the user fix the input and submit again
    return result;
  } catch (error) {
    await store.del(key).catch(() => undefined);
    throw error;
  }
}
