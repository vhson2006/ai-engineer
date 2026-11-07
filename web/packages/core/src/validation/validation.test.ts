import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import { parseInput } from './index';

const schema = z.object({
  name: z.string().trim().min(1, 'required').max(5, 'tooLong'),
  tags: z.array(z.string().min(1, 'required')).max(2, 'tooMany').default([]),
});

describe('parseInput', () => {
  it('returns the parsed, trimmed data and strips unknown keys', () => {
    expect(parseInput(schema, { name: '  abc ', ownerId: 'x' })).toEqual({ ok: true, data: { name: 'abc', tags: [] } });
  });

  it('returns an invalid_input failure with one field error (message key) per issue', () => {
    const result = parseInput(schema, { name: '', tags: ['a', ''] });
    expect(result).toMatchObject({ ok: false, code: 'invalid_input' });
    if (result.ok) return;
    expect(result.errors).toEqual([
      { field: 'name', message: 'required' },
      { field: 'tags.1', message: 'required' },
    ]);
  });

  it('reports a constraint on the whole array on the array field', () => {
    const result = parseInput(schema, { name: 'a', tags: ['a', 'b', 'c'] });
    expect(!result.ok && result.errors).toEqual([{ field: 'tags', message: 'tooMany' }]);
  });

  it('reports a non-object input on the whole input', () => {
    const result = parseInput(schema, 'nope');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors?.[0]?.field).toBe('');
  });
});
