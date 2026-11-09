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
