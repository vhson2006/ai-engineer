import { LOCALES, type Locale } from '@/i18n/locales';

/** A price in đồng, in the visitor's language: "35.000 ₫" (vi) / "₫35,000" (en). Client-safe. */
export function formatVnd(locale: Locale, amount: number): string {
  return new Intl.NumberFormat(LOCALES[locale].intl, { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);
}

/** "07:00" → "07:00" (vi) / "07:00" (en-GB): the shop's local time, no time zone math. */
export function formatTime(locale: Locale, hhmm: string): string {
  const [hours, minutes] = hhmm.split(':').map(Number);
  return new Intl.DateTimeFormat(LOCALES[locale].intl, { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }).format(
    new Date(Date.UTC(2000, 0, 1, hours, minutes)),
  );
}

/** A publication date "2026-11-10" in the visitor's language: "10 tháng 11, 2026" / "10 November 2026". */
/** The shop's time zone: a publication instant is shown as the day it was in Vietnam. */
const SHOP_TIME_ZONE = 'Asia/Ho_Chi_Minh';

/** An instant (ISO date-time from the API) as a date, in the shop's time zone. */
export function formatInstantDate(locale: Locale, iso: string): string {
  return new Intl.DateTimeFormat(LOCALES[locale].intl, { day: 'numeric', month: 'long', year: 'numeric', timeZone: SHOP_TIME_ZONE }).format(new Date(iso));
}

export function formatDate(locale: Locale, isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  // A calendar date, not an instant: format it in UTC so no time zone shifts the day.
  return new Intl.DateTimeFormat(LOCALES[locale].intl, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, month - 1, day)),
  );
}
