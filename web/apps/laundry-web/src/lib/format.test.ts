import { describe, expect, it } from 'vitest';
import { formatDate } from './format';

describe('article dates', () => {
  it('formats a calendar date per language, without a time zone shift', () => {
    expect(formatDate('en', '2026-11-10')).toBe('10 November 2026');
    expect(formatDate('vi', '2026-11-03')).toMatch(/^3 tháng 11,? 2026$/);
    expect(formatDate('en', '2026-01-01')).toBe('1 January 2026');
  });
});
