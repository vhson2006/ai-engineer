import { LOCALES, type Locale } from '@/i18n/locales';

/** A price in Vietnamese đồng, in the visitor's language: "100.000 ₫" (vi) / "₫100,000" (en). */
export function formatVnd(locale: Locale, amount: number): string {
  return new Intl.NumberFormat(LOCALES[locale].intl, { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);
}

/** A publication date "2026-11-09" in the visitor's language: "9 tháng 11, 2026" / "9 November 2026". */
export function formatDate(locale: Locale, isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  // A calendar date, not an instant: format it in UTC so no time zone shifts the day.
  return new Intl.DateTimeFormat(LOCALES[locale].intl, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, month - 1, day)),
  );
}

/** The winery's clock: an article's publication instant is shown as its date in Vietnam. */
const WINERY_TIME_ZONE = 'Asia/Ho_Chi_Minh';

/** A publication instant (ISO, from the API) as a date in the visitor's language, Vietnam time. */
export function formatInstantDate(locale: Locale, iso: string): string {
  return new Intl.DateTimeFormat(LOCALES[locale].intl, { day: 'numeric', month: 'long', year: 'numeric', timeZone: WINERY_TIME_ZONE }).format(new Date(iso));
}
