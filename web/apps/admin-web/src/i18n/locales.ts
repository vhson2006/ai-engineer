import { localizedPath } from '@web/core/i18n/paths';
import type { LocaleRouting } from '@web/core/i18n/routing';

/**
 * The admin site's languages (same set as portfolio-web). To add one (e.g. French):
 *   1. copy messages/en.json to messages/fr.json and translate the values (keep the keys);
 *   2. add `fr` below (name in its own language, Intl locale for dates and numbers);
 *   3. add its loader in messages.ts.
 * TypeScript and messages.test.ts then refuse a missing or extra key. Client-safe (no messages).
 */
export const LOCALES = {
  en: { name: 'English', intl: 'en-GB' },
  vi: { name: 'Tiếng Việt', intl: 'vi-VN' },
} as const;

export type Locale = keyof typeof LOCALES;
export const LOCALE_CODES = Object.keys(LOCALES) as Locale[];
export const DEFAULT_LOCALE: Locale = 'en';

export function isLocale(value: string): value is Locale {
  return value in LOCALES;
}

/** For the language menu: [{ code: 'en', name: 'English' }, ...]. */
export const LOCALE_OPTIONS = LOCALE_CODES.map((code) => ({ code, name: LOCALES[code].name }));

/** Proxy routing: pages are under /<locale>; Route Handlers are not localized. */
export const ROUTING: LocaleRouting<Locale> = {
  locales: LOCALE_CODES,
  defaultLocale: DEFAULT_LOCALE,
  bypass: ['/auth/', '/exports/'],
};

/** '/about' → '/vi/about' (every internal link in a page goes through this). */
export function href(locale: Locale, path: string): string {
  return localizedPath(locale, path);
}
