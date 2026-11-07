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
