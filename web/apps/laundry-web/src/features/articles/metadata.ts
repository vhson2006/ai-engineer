import type { Metadata } from 'next';
import { localizedPath } from '@web/core/i18n/paths';
import { LOCALE_CODES, type Locale } from '@/i18n/locales';

/**
 * Metadata of an articles page: title (the layout adds " · <shop>"), description, canonical URL and
 * its other languages. Slugs differ per language (articles, topics): `paths` has the path in each
 * language that has one; a language without it is left out of hreflang.
 */
export function articlesMetadata({
  locale,
  paths,
  title,
  description,
  publishedTime,
  image,
}: {
  locale: Locale;
  paths: Partial<Record<Locale, string>>;
  title: string;
  description: string;
  publishedTime?: string;
  /** Link preview image (an article's cover from the media library); else the site's default. */
  image?: { url: string; width: number; height: number; alt: string };
}): Metadata {
  const images = image ? [image] : undefined;
  return {
    title,
    description,
    alternates: {
      canonical: localizedPath(locale, paths[locale] ?? '/'),
      languages: Object.fromEntries(LOCALE_CODES.flatMap((code) => (paths[code] ? [[code, localizedPath(code, paths[code])]] : []))),
    },
    openGraph: publishedTime
      ? { type: 'article', title, description, publishedTime, ...(images && { images }) }
      : { type: 'website', title, description, ...(images && { images }) },
    ...(images && { twitter: { card: 'summary_large_image', images } }),
  };
}

/** The same path in every language (the article index). */
export function samePath(path: string): Record<Locale, string> {
  return Object.fromEntries(LOCALE_CODES.map((code) => [code, path])) as Record<Locale, string>;
}
