import { describe, expect, it } from 'vitest';
import { salon } from '@/content/salon';
import { dayKey, hoursFor, nextDays, slotsFor } from './slots';

// 2026-11-09 is a Monday; months are 0-based in the Date constructor.
const monday = new Date(2026, 10, 9);
const sunday = new Date(2026, 10, 15);

describe('booking slots', () => {
  it('maps weekdays to the salon hours rows', () => {
    expect(hoursFor(salon.hours, monday)?.id).toBe('monThu');
    expect(hoursFor(salon.hours, new Date(2026, 10, 13))?.id).toBe('fri');
    expect(hoursFor(salon.hours, new Date(2026, 10, 14))?.id).toBe('sat');
    expect(hoursFor(salon.hours, sunday)?.id).toBe('sun');
  });

  it('offers half-hour starts from opening to an hour before closing', () => {
    const slots = slotsFor(salon.hours, sunday, monday);
    expect(slots[0]).toBe('11:30');
    expect(slots.at(-1)).toBe('16:00');
    expect(slots).toHaveLength(10);
  });

  it('drops past and too-soon times on the current day', () => {
    const now = new Date(2026, 10, 9, 14, 10);
    const slots = slotsFor(salon.hours, monday, now);
    expect(slots[0]).toBe('15:00');
    expect(slots.at(-1)).toBe('18:00');
  });

  it('has no times left after the last start', () => {
    expect(slotsFor(salon.hours, monday, new Date(2026, 10, 9, 17, 45))).toEqual([]);
  });

  it('lists consecutive days across a month end', () => {
    const days = nextDays(new Date(2026, 10, 29, 20, 0), 3).map(dayKey);
    expect(days).toEqual(['2026-11-29', '2026-11-30', '2026-12-01']);
  });
});
