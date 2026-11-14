import { localizedPath } from '@web/core/i18n/paths';

/**
 * Every language the kit speaks (its own strings in src/messages/<code>.json). A site chooses its
 * order and its default with `defineWebsite` (ADR 0038). To add one: an entry here, the kit's
 * dictionary, and each site's. Client-safe.
 */
export const LOCALES = {
  vi: { name: 'Tiếng Việt', intl: 'vi-VN' },
  en: { name: 'English', intl: 'en-GB' },
} as const;

export type Locale = keyof typeof LOCALES;
/** Every language of the kit (static params of the [lang] segment, dictionaries). */
export const LOCALE_CODES = Object.keys(LOCALES) as Locale[];

export function isLocale(value: string): value is Locale {
  return value in LOCALES;
}

/** '/' → '/vi' (every internal link goes through this). */
export function href(locale: Locale, path: string): string {
  return localizedPath(locale, path);
}
