import { LOCALES, type Locale } from './locales';

/**
 * Formatting in the visitor's language. Each function takes an Intl locale ("vi-VN", "en-US"):
 * a site's own (`website.intl(locale)`) or, by default, the kit's (`LOCALES`). Client-safe.
 */
const intlOf = (locale: Locale, intl?: string) => intl ?? LOCALES[locale].intl;

/** A price in đồng: "350.000 ₫" (vi) / "₫350,000" (en). */
export function formatVnd(locale: Locale, amount: number, intl?: string): string {
  return new Intl.NumberFormat(intlOf(locale, intl), { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);
}

/** "07:00" in the visitor's language: the business's local time, no time zone math. */
export function formatTime(locale: Locale, hhmm: string, intl?: string): string {
  const [hours, minutes] = hhmm.split(':').map(Number);
  return new Intl.DateTimeFormat(intlOf(locale, intl), { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }).format(
    new Date(Date.UTC(2000, 0, 1, hours, minutes)),
  );
}

/** Opening hours "07:00 – 19:00"; "24/7" for 00:00 – 23:59. */
export function formatHours(locale: Locale, hours: { open: string; close: string }, intl?: string): string {
  if (hours.open === '00:00' && hours.close === '23:59') return '24/7';
  return `${formatTime(locale, hours.open, intl)} – ${formatTime(locale, hours.close, intl)}`;
}

/** An instant (ISO date-time from the API) as a date, in the business's time zone. */
export function formatInstantDate(locale: Locale, iso: string, intl?: string, timeZone = 'Asia/Ho_Chi_Minh'): string {
  return new Intl.DateTimeFormat(intlOf(locale, intl), { day: 'numeric', month: 'long', year: 'numeric', timeZone }).format(new Date(iso));
}

/** A calendar date "2026-11-13" (no time zone shift). */
export function formatDate(locale: Locale, isoDate: string, intl?: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Intl.DateTimeFormat(intlOf(locale, intl), { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, month - 1, day)),
  );
}
