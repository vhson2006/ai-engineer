import { localizedPath } from '@web/core/i18n/paths';
import type { LocaleRouting } from '@web/core/i18n/routing';

/** The site's languages (see apps/portfolio-web/src/i18n/locales.ts for how to add one). Client-safe. */
export const LOCALES = {
  en: { name: 'English', intl: 'en-US' },
  vi: { name: 'Tiếng Việt', intl: 'vi-VN' },
} as const;

export type Locale = keyof typeof LOCALES;
export const LOCALE_CODES = Object.keys(LOCALES) as Locale[];
/** A salon in North Carolina: English unless the visitor's browser prefers Vietnamese. */
export const DEFAULT_LOCALE: Locale = 'en';

export function isLocale(value: string): value is Locale {
  return value in LOCALES;
}

export const LOCALE_OPTIONS = LOCALE_CODES.map((code) => ({ code, name: LOCALES[code].name }));

export const ROUTING: LocaleRouting<Locale> = {
  locales: LOCALE_CODES,
  defaultLocale: DEFAULT_LOCALE,
  bypass: [],
};

/** '/' → '/vi' (every internal link goes through this). */
export function href(locale: Locale, path: string): string {
  return localizedPath(locale, path);
}
