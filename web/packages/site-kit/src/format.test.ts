import { describe, expect, it } from 'vitest';
import { formatDate, formatHours, formatInstantDate, formatVnd } from './format';

describe('format', () => {
  it('prices in đồng, per language', () => {
    expect(formatVnd('vi', 350000).replace(/\s/g, ' ')).toBe('350.000 ₫');
    expect(formatVnd('en', 350000)).toBe('₫350,000');
  });

  it('opening hours without time zone shifts', () => {
    expect(formatHours('vi', { open: '07:00', close: '22:30' })).toBe('07:00 – 22:30');
    expect(formatHours('en', { open: '00:00', close: '23:59' })).toBe('24/7');
  });

  it('a publication instant is the day it was in Vietnam', () => {
    // 2026-11-12 18:30 UTC is already 13 November in Vietnam (UTC+7).
    expect(formatInstantDate('en', '2026-11-12T18:30:00Z')).toBe('13 November 2026');
    expect(formatDate('en', '2026-11-12')).toBe('12 November 2026');
  });
});
