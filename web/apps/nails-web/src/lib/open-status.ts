import { rowForWeekday, toMinutes, type HoursRow } from '@/features/booking/slots';

/** The salon's wall clock: weekday (0 = Sunday) and minutes since midnight. */
export type SalonClock = { weekday: number; minutes: number };

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** What time it is at the salon (its time zone, whatever the visitor's). Client-safe. */
export function salonClock(now: Date, timeZone: string): SalonClock {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  return { weekday: WEEKDAYS.indexOf(get('weekday')), minutes: Number(get('hour')) * 60 + Number(get('minute')) };
}

export type OpenStatus = { open: true; closes: string } | { open: false; opens: { inDays: number; weekday: number; time: string } | null };

/** Open now (until when), or when it next opens (`inDays` 0 = later today). */
export function openStatus(hours: readonly HoursRow[], clock: SalonClock): OpenStatus {
  const today = rowForWeekday(hours, clock.weekday);
  if (today && clock.minutes >= toMinutes(today.open) && clock.minutes < toMinutes(today.close)) {
    return { open: true, closes: today.close };
  }
  for (let inDays = 0; inDays <= 7; inDays += 1) {
    const weekday = (clock.weekday + inDays) % 7;
    const row = rowForWeekday(hours, weekday);
    if (row && (inDays > 0 || clock.minutes < toMinutes(row.open))) return { open: false, opens: { inDays, weekday, time: row.open } };
  }
  return { open: false, opens: null };
}
