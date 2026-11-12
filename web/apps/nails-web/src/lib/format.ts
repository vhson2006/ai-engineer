import { salon, type Price } from '@/content/salon';
import { LOCALES, type Locale } from '@/i18n/locales';

/** "$59+" (en) / "59 $+" (vi): a menu price in the visitor's language. */
export function formatPrice(locale: Locale, price: Price): string {
  const amount = new Intl.NumberFormat(LOCALES[locale].intl, {
    style: 'currency',
    currency: 'USD',
    currencyDisplay: 'narrowSymbol',
    maximumFractionDigits: 0,
  }).format(price.amount);
  return price.plus ? `${amount}+` : amount;
}

/** "10:00" → "10:00 AM" (en-US) / "10:00" (vi-VN). The salon's local time, no time zone math. */
export function formatTime(locale: Locale, hhmm: string): string {
  const [hours, minutes] = hhmm.split(':').map(Number);
  return new Intl.DateTimeFormat(LOCALES[locale].intl, { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }).format(
    new Date(Date.UTC(2000, 0, 1, hours, minutes)),
  );
}

export function formatHours(locale: Locale, open: string, close: string): string {
  return `${formatTime(locale, open)} – ${formatTime(locale, close)}`;
}

/**
 * A publication instant (ISO, from the API) as a date in the visitor's language, on the salon's
 * clock: "November 12, 2026" / "12 tháng 11, 2026".
 */
export function formatInstantDate(locale: Locale, iso: string): string {
  return new Intl.DateTimeFormat(LOCALES[locale].intl, { day: 'numeric', month: 'long', year: 'numeric', timeZone: salon.timeZone }).format(new Date(iso));
}

/** A calendar date "2026-01-01" (no time zone shift): "January 1, 2026" / "1 tháng 1, 2026". */
export function formatDate(locale: Locale, isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Intl.DateTimeFormat(LOCALES[locale].intl, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, month - 1, day)),
  );
}
