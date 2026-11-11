import { describe, expect, it } from 'vitest';
import { gallery, menuTables, priceOf, specialties, salon, sumPrices } from '@/content/salon';
import { openStatus, salonClock } from './open-status';

const at = (weekday: number, hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return { weekday, minutes: h * 60 + m };
};

describe('open status', () => {
  it('is open during the day’s hours', () => {
    expect(openStatus(salon.hours, at(1, '12:00'))).toEqual({ open: true, closes: '19:00' });
    expect(openStatus(salon.hours, at(0, '11:30'))).toEqual({ open: true, closes: '17:00' });
  });

  it('opens later today before opening time', () => {
    expect(openStatus(salon.hours, at(5, '08:00'))).toEqual({ open: false, opens: { inDays: 0, weekday: 5, time: '09:30' } });
  });

  it('opens tomorrow after closing time', () => {
    expect(openStatus(salon.hours, at(6, '18:00'))).toEqual({ open: false, opens: { inDays: 1, weekday: 0, time: '11:30' } });
  });

  it('reads the salon clock in its own time zone', () => {
    // 2026-11-09 17:30 UTC = Monday 12:30 in Wendell, NC (EST, UTC−5).
    expect(salonClock(new Date(Date.UTC(2026, 10, 9, 17, 30)), salon.timeZone)).toEqual({ weekday: 1, minutes: 12 * 60 + 30 });
  });
});

describe('menu references', () => {
  it('every gallery look and specialty points at real menu lines', () => {
    const refs = [...gallery.flatMap((look) => [look.base, ...(look.addOn ? [look.addOn] : [])]), ...specialties.flatMap((item) => item.prices)];
    for (const ref of refs) expect(priceOf(ref), `${ref.table}.${ref.row}`).toBeDefined();
  });

  it('sums a base service and an add-on', () => {
    expect(sumPrices([menuTables.manicure[0].prices[1]!, { amount: 15, plus: true }])).toEqual({ amount: 57, plus: true });
  });
});
