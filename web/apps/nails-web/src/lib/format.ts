import type { Price } from '@/content/salon';
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
