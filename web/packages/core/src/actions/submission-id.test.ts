import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { newSubmissionId } from './submission-id';

describe('newSubmissionId', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns a UUID v4', () => {
    expect(z.uuid().safeParse(newSubmissionId()).success).toBe(true);
  });

  it('works where crypto.randomUUID is missing (http on a non-localhost host)', () => {
    vi.stubGlobal('crypto', { getRandomValues: globalThis.crypto.getRandomValues.bind(globalThis.crypto) });
    const ids = new Set(Array.from({ length: 100 }, () => newSubmissionId()));
    expect(ids.size).toBe(100);
    for (const id of ids) {
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      expect(z.uuid().safeParse(id).success).toBe(true);
    }
  });
});
