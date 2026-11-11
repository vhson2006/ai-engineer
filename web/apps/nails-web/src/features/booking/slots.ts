/**
 * Days and start times offered in the booking dialog, from the salon's opening hours. Pure and
 * client-safe. Times are the salon's wall-clock "HH:MM"; the visitor's clock stands in for the
 * salon's (the booking is confirmed by phone, so a visitor in another time zone is corrected there).
 */

export type HoursRow = { readonly id: 'monThu' | 'fri' | 'sat' | 'sun'; readonly open: string; readonly close: string };

/** Which row of the opening hours applies to each weekday (Date#getDay: 0 = Sunday). */
const ROW_BY_WEEKDAY: HoursRow['id'][] = ['sun', 'monThu', 'monThu', 'monThu', 'monThu', 'fri', 'sat'];

/** Minutes between two start times. */
export const SLOT_STEP = 30;
/** The last start time is this long before closing (the shortest full service). */
export const LAST_START_BEFORE_CLOSE = 60;
/** Same-day times must be at least this far ahead. */
export const MIN_LEAD = 30;

export const toMinutes = (hhmm: string) => {
  const [hours, minutes] = hhmm.split(':').map(Number);
  return hours * 60 + minutes;
};
const toHHMM = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

/** The hours row of a weekday (0 = Sunday). */
export function rowForWeekday(hours: readonly HoursRow[], weekday: number): HoursRow | undefined {
  const id = ROW_BY_WEEKDAY[weekday];
  return hours.find((row) => row.id === id);
}

export function hoursFor(hours: readonly HoursRow[], date: Date): HoursRow | undefined {
  return rowForWeekday(hours, date.getDay());
}

/** Start times on `date`; on the same day as `now`, only those at least MIN_LEAD minutes ahead. */
export function slotsFor(hours: readonly HoursRow[], date: Date, now: Date): string[] {
  const row = hoursFor(hours, date);
  if (!row) return [];
  const last = toMinutes(row.close) - LAST_START_BEFORE_CLOSE;
  const sameDay = dayKey(date) === dayKey(now);
  const earliest = sameDay ? now.getHours() * 60 + now.getMinutes() + MIN_LEAD : 0;
  const slots: string[] = [];
  for (let minute = toMinutes(row.open); minute <= last; minute += SLOT_STEP) {
    if (minute >= earliest) slots.push(toHHMM(minute));
  }
  return slots;
}

/** `count` consecutive days starting with `now`'s day, at local midnight. */
export function nextDays(now: Date, count: number): Date[] {
  return Array.from({ length: count }, (_, index) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + index));
}

/** "2026-11-09" in local time (a stable key for a day). */
export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
