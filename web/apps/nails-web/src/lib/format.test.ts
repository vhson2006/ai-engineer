import { describe, expect, it } from 'vitest';
import { website } from '@/website';
import { formatHours, formatPrice, formatTime } from './format';

describe('menu formatting', () => {
  it('prices in US dollars, "+" for starting prices', () => {
    expect(formatPrice('en', { amount: 59, plus: true })).toBe('$59+');
    expect(formatPrice('en', { amount: 39 })).toBe('$39');
    expect(formatPrice('vi', { amount: 39 })).toMatch(/^39\s?\$$/);
  });

  it('opening hours in the salon local time, per language', () => {
    expect(formatTime('en', '09:30')).toBe('9:30 AM');
    expect(formatTime('en', '19:00')).toBe('7:00 PM');
    expect(formatTime('vi', '19:00')).toBe('19:00');
    expect(formatHours('en', '10:00', '19:00')).toBe('10:00 AM – 7:00 PM');
  });
});

describe("article dates (the kit, with this site's US options)", () => {
  it('formats a calendar date per language, without a time zone shift', () => {
    expect(website.date('en', '2026-11-10')).toBe('November 10, 2026');
    expect(website.date('vi', '2026-11-02')).toMatch(/^2 tháng 11,? 2026$/);
    expect(website.date('en', '2026-01-01')).toBe('January 1, 2026');
    // An instant late on Nov 12 in New York is already Nov 13 in UTC: the salon's date wins.
    expect(website.instantDate('en', '2026-11-13T03:00:00.000Z')).toBe('November 12, 2026');
  });
});
