import { describe, expect, it } from 'vitest';
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
