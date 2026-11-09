import { describe, expect, it } from 'vitest';
import { formatVnd } from './format';

describe('formatVnd', () => {
  it('formats đồng per language, without decimals', () => {
    expect(formatVnd('vi', 100_000)).toMatch(/^100\.000\s₫$/);
    expect(formatVnd('en', 100_000)).toBe('₫100,000');
  });
});
