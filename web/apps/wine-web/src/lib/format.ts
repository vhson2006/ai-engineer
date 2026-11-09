import { LOCALES, type Locale } from '@/i18n/locales';

/** A price in Vietnamese đồng, in the visitor's language: "100.000 ₫" (vi) / "₫100,000" (en). */
export function formatVnd(locale: Locale, amount: number): string {
  return new Intl.NumberFormat(LOCALES[locale].intl, { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);
}
