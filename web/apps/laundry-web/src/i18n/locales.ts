import { localizedPath } from '@web/core/i18n/paths';
import type { LocaleRouting } from '@web/core/i18n/routing';

/** The site's languages (see apps/portfolio-web/src/i18n/locales.ts for how to add one). Client-safe. */
export const LOCALES = {
  vi: { name: 'Tiếng Việt', intl: 'vi-VN' },
  en: { name: 'English', intl: 'en-GB' },
} as const;

export type Locale = keyof typeof LOCALES;
export const LOCALE_CODES = Object.keys(LOCALES) as Locale[];
/** A neighbourhood laundry: Vietnamese first; English through the language switcher. */
export const DEFAULT_LOCALE: Locale = 'vi';

export function isLocale(value: string): value is Locale {
  return value in LOCALES;
}

export const LOCALE_OPTIONS = LOCALE_CODES.map((code) => ({ code, name: LOCALES[code].name }));

export const ROUTING: LocaleRouting<Locale> = {
  locales: LOCALE_CODES,
  defaultLocale: DEFAULT_LOCALE,
  bypass: [],
  // A first visit always lands on DEFAULT_LOCALE (not the browser's language); the switcher is remembered.
  detectLanguage: false,
  // This site's own cookie: in dev every app runs on localhost and would share NEXT_LOCALE.
  cookieName: 'laundry_locale',
};

/** '/' → '/vi' (every internal link goes through this). */
export function href(locale: Locale, path: string): string {
  return localizedPath(locale, path);
}
