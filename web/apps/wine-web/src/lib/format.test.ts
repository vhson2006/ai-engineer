import { describe, expect, it } from 'vitest';
import { formatDate, formatInstantDate, formatVnd } from './format';

describe('formatVnd', () => {
  it('formats đồng per language, without decimals', () => {
    expect(formatVnd('vi', 100_000)).toMatch(/^100\.000\s₫$/);
    expect(formatVnd('en', 100_000)).toBe('₫100,000');
  });
});

describe('formatDate', () => {
  it('formats a calendar date per language without shifting the day', () => {
    expect(formatDate('en', '2026-11-09')).toBe('9 November 2026');
    expect(formatDate('vi', '2026-11-09')).toMatch(/^9 tháng 11,? 2026$/);
    expect(formatDate('en', '2026-01-01')).toBe('1 January 2026');
    // 20:00 UTC on Nov 12 is already Nov 13 in Vietnam: the winery's date wins.
    expect(formatInstantDate('en', '2026-11-12T20:00:00.000Z')).toBe('13 November 2026');
  });
});
