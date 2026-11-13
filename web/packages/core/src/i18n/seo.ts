import type { Metadata } from 'next';
import { localizedPath } from './paths';

/**
 * SEO helpers for sub-path localized sites (ADR 0020, ADR 0021). Pure: usable in metadata,
 * sitemap.ts and tests. Paths are relative; Next.js resolves them against `metadataBase`.
 */

/** hreflang map: every language + x-default (the path without a locale: the proxy picks the language). */
export function languageAlternates(locales: readonly string[], path: string): Record<string, string> {
  return {
    ...Object.fromEntries(locales.map((locale) => [locale, localizedPath(locale, path)])),
    'x-default': path,
  };
}

/** `alternates` for a page's metadata: canonical = this language's URL, plus every hreflang. */
export function localizedAlternates(locales: readonly string[], locale: string, path: string) {
  return { canonical: localizedPath(locale, path), languages: languageAlternates(locales, path) };
}

export interface SitemapPage {
  path: string;
  priority?: number;
  changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
}

/**
 * One sitemap entry per page AND language, each listing its alternates (Google's recommended
 * way to declare hreflang in a sitemap). URLs are absolute: a sitemap has no base URL.
 */
export function localizedSitemap(
  siteUrl: string,
  locales: readonly string[],
  pages: readonly SitemapPage[],
  lastModified: Date,
) {
  const absolute = (path: string) => new URL(path, siteUrl).href;
  return pages.flatMap((page) =>
    locales.map((locale) => ({
      url: absolute(localizedPath(locale, page.path)),
      lastModified,
      changeFrequency: page.changeFrequency ?? 'monthly',
      priority: page.priority ?? 0.5,
      alternates: {
        languages: Object.fromEntries(
          Object.entries(languageAlternates(locales, page.path)).map(([lang, path]) => [lang, absolute(path)]),
        ),
      },
    })),
  );
}

export interface PreviewImage {
  url: string;
  width: number;
  height: number;
  alt: string;
}

/**
 * Full metadata of a public page of a localized site (ADR 0021): description, canonical +
 * hreflang (+ x-default when every language shares the path), Open Graph (what Facebook, Zalo,
 * TikTok, LinkedIn show) and the Twitter/X card. A page's `openGraph` REPLACES the layout's (no
 * deep merge), so it is always built complete here. `paths`: the page's path in each language
 * that has it (articles have a slug per language). `intl`: each language's Intl tag ('vi-VN').
 */
export function localizedPageMetadata<L extends string>({
  locale,
  intl,
  defaultLocale,
  paths,
  siteName,
  title,
  fullTitle,
  description,
  image,
  article,
}: {
  locale: L;
  intl: Record<L, string>;
  defaultLocale: L;
  paths: Partial<Record<L, string>>;
  siteName: string;
  /** The page's own title (the layout's template adds the site name); omitted on the home page. */
  title?: string;
  /** The title shown in link previews (with the site name). */
  fullTitle: string;
  description: string;
  image: PreviewImage;
  article?: { publishedTime: string };
}): Metadata {
  const codes = Object.keys(intl) as L[];
  const url = localizedPath(locale, paths[locale] ?? '/');
  const languages: Record<string, string> = Object.fromEntries(
    codes.flatMap((code) => (paths[code] ? [[code, localizedPath(code, paths[code])]] : [])),
  );
  // x-default: the path without a language, where the proxy picks one (only when all share it).
  if (paths[defaultLocale] && codes.every((code) => paths[code] === paths[defaultLocale])) {
    languages['x-default'] = paths[defaultLocale];
  }
  const ogLocale = (code: L) => intl[code].replace('-', '_');
  const images = [image];
  return {
    ...(title ? { title } : {}),
    description,
    alternates: { canonical: url, languages },
    openGraph: {
      ...(article ? { type: 'article', publishedTime: article.publishedTime } : { type: 'website' }),
      siteName,
      title: fullTitle,
      description,
      url,
      locale: ogLocale(locale),
      alternateLocale: codes.filter((code) => code !== locale && paths[code]).map(ogLocale),
      images,
    },
    twitter: { card: 'summary_large_image', title: fullTitle, description, images },
  };
}
