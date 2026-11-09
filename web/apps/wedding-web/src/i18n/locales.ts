import { localizedPath } from '@web/core/i18n/paths';
import type { LocaleRouting } from '@web/core/i18n/routing';

/** The site's languages (see apps/portfolio-web/src/i18n/locales.ts for how to add one). Client-safe. */
export const LOCALES = {
  vi: { name: 'Tiếng Việt', intl: 'vi-VN' },
  en: { name: 'English', intl: 'en-GB' },
} as const;

export type Locale = keyof typeof LOCALES;
export const LOCALE_CODES = Object.keys(LOCALES) as Locale[];
/** A Vietnamese wedding: Vietnamese unless the guest's browser prefers English. */
export const DEFAULT_LOCALE: Locale = 'vi';

export function isLocale(value: string): value is Locale {
  return value in LOCALES;
}

export const LOCALE_OPTIONS = LOCALE_CODES.map((code) => ({ code, name: LOCALES[code].name }));

export const ROUTING: LocaleRouting<Locale> = {
  locales: LOCALE_CODES,
  defaultLocale: DEFAULT_LOCALE,
  // The .ics file (add to calendar) is a Route Handler, not a page.
  bypass: ['/calendar.ics'],
};

/** '/' → '/vi' (every internal link goes through this). */
export function href(locale: Locale, path: string): string {
  return localizedPath(locale, path);
}
