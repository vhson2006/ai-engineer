import { beforeEach, describe, expect, it, vi } from 'vitest';

const limitAction = vi.fn();
const getSessionUser = vi.fn();
vi.mock('./limit', () => ({ limitAction }));
vi.mock('../auth/session', () => ({ getSessionUser }));

const { guardAction, signedOut } = await import('./guard');
const POLICY = { name: 'mutation', limit: 30, windowS: 60 } as never;
const limited = { ok: false, code: 'rate_limited', message: 'Too many requests.', retryAfterS: 9 };

describe('guardAction (the start of every Server Action)', () => {
  beforeEach(() => {
    limitAction.mockReset().mockResolvedValue(null);
    getSessionUser.mockReset().mockResolvedValue({ id: 'u1' });
  });

  it('lets a signed-in caller through, with their id', async () => {
    await expect(guardAction(POLICY)).resolves.toEqual({ ok: true, userId: 'u1' });
    expect(limitAction).toHaveBeenCalledWith(POLICY);
  });

  it('refuses when rate limited, before looking at the session', async () => {
    limitAction.mockResolvedValue(limited);
    await expect(guardAction(POLICY)).resolves.toBe(limited);
    expect(getSessionUser).not.toHaveBeenCalled();
  });

  it('refuses without a session, or when reading it fails', async () => {
    getSessionUser.mockResolvedValue(null);
    await expect(guardAction(POLICY)).resolves.toBe(signedOut);
    getSessionUser.mockRejectedValue(new Error('redis down'));
    await expect(guardAction(POLICY)).resolves.toBe(signedOut);
  });

  it('without a policy: no rate limit, the session still checked', async () => {
    await expect(guardAction(null)).resolves.toEqual({ ok: true, userId: 'u1' });
    expect(limitAction).not.toHaveBeenCalled();
    getSessionUser.mockResolvedValue(null);
    await expect(guardAction(null)).resolves.toBe(signedOut);
  });
});
