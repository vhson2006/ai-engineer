import type { Metadata } from 'next';
import { localizedPath } from '@web/core/i18n/paths';
import { LOCALE_CODES, type Locale } from '@/i18n/locales';

/**
 * Metadata of a blog page: title (the layout adds " · <salon>"), description, canonical URL and
 * its other languages. Articles are also typed as such for link previews.
 */
export function blogMetadata({
  locale,
  path,
  title,
  description,
  publishedTime,
}: {
  locale: Locale;
  path: string;
  title: string;
  description: string;
  publishedTime?: string;
}): Metadata {
  return {
    title,
    description,
    alternates: {
      canonical: localizedPath(locale, path),
      languages: Object.fromEntries(LOCALE_CODES.map((code) => [code, localizedPath(code, path)])),
    },
    openGraph: publishedTime ? { type: 'article', title, description, publishedTime } : { type: 'website', title, description },
  };
}
