import type { Locale } from '@web/site-kit/locales';
import type { Price } from '@/content/salon';
import { website } from '@/website';

/** "$59+" (en) / "59 $+" (vi): a menu price in the visitor's language (US dollars). Client-safe. */
export function formatPrice(locale: Locale, price: Price): string {
  const amount = new Intl.NumberFormat(website.intl(locale), {
    style: 'currency',
    currency: 'USD',
    currencyDisplay: 'narrowSymbol',
    maximumFractionDigits: 0,
  }).format(price.amount);
  return price.plus ? `${amount}+` : amount;
}

/** "10:00" → "10:00 AM" (en-US) / "10:00" (vi-VN): the salon's local time, no leading zero in English. */
export function formatTime(locale: Locale, hhmm: string): string {
  const [hours, minutes] = hhmm.split(':').map(Number);
  return new Intl.DateTimeFormat(website.intl(locale), { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }).format(
    new Date(Date.UTC(2000, 0, 1, hours, minutes)),
  );
}

export function formatHours(locale: Locale, open: string, close: string): string {
  return `${formatTime(locale, open)} – ${formatTime(locale, close)}`;
}
