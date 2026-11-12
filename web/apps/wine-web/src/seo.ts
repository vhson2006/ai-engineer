import type { Metadata } from 'next';
import { localizedPath } from '@web/core/i18n/paths';
import { localizedPageMetadata, type PreviewImage } from '@web/core/i18n/seo';
import { mapsHref, winery } from '@/content/winery';
import { DEFAULT_LOCALE, LOCALE_CODES, LOCALES, type Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages';
import { SITE_URL } from '@/site';

export type { PreviewImage };

/**
 * The link preview of every page without its own image: the brand card drawn per language by
 * src/app/og/[image]/route.ts (a route, not opengraph-image.tsx: a file-based image would
 * override an article's cover). An article without a cover gets its own card (articlePreview).
 */
export function defaultPreview(t: Messages, locale: Locale): PreviewImage {
  return { url: `/og/${locale}.png`, width: 1200, height: 630, alt: t.meta.title };
}

/** An article's card (topic + title on the brand card): src/app/og/bai-viet/[lang]/[image]/route.ts. */
export function articlePreview(locale: Locale, slug: string, title: string): PreviewImage {
  return { url: `/og/bai-viet/${locale}/${slug}.png`, width: 1200, height: 630, alt: title };
}

const INTL = Object.fromEntries(LOCALE_CODES.map((code) => [code, LOCALES[code].intl])) as Record<Locale, string>;

/**
 * Full metadata of a public page (ADR 0021): canonical + hreflang (+ x-default), Open Graph and
 * the Twitter/X card (localizedPageMetadata). `paths`: the page's path in each language that has it.
 */
export function pageMetadata({
  t,
  locale,
  paths,
  title,
  description,
  image,
  article,
}: {
  t: Messages;
  locale: Locale;
  paths: Partial<Record<Locale, string>>;
  /** Omitted on the home page (the layout's default title). */
  title?: string;
  description: string;
  /** Else the site's preview card. */
  image?: PreviewImage;
  article?: { publishedTime: string };
}): Metadata {
  return localizedPageMetadata({
    locale,
    intl: INTL,
    defaultLocale: DEFAULT_LOCALE,
    paths,
    siteName: winery.name,
    title,
    fullTitle: title ? `${title} · ${winery.name}` : t.meta.title,
    description,
    image: image ?? defaultPreview(t, locale),
    article,
  });
}

/** The same path in every language. */
export function samePath(path: string): Record<Locale, string> {
  return Object.fromEntries(LOCALE_CODES.map((code) => [code, path])) as Record<Locale, string>;
}

export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).href;
}

/**
 * schema.org graph (JSON-LD): the winery (name, address, phones, map, Zalo) and the website on the
 * home page, extended with an Article on article pages. Only facts shown on the site
 * (src/content/winery.ts); stable @ids so pages refer to the same organization.
 */
export function structuredData(
  t: Messages,
  locale: Locale,
  page?: { article: { path: string; title: string; description: string; image: string; publishedAt: string } },
) {
  const organization = {
    '@type': 'Winery',
    '@id': absoluteUrl('/#organization'),
    name: winery.fullName,
    alternateName: winery.name,
    description: t.meta.description,
    url: absoluteUrl(localizedPath(locale, '/')),
    logo: absoluteUrl('/icon.svg'),
    image: [absoluteUrl(defaultPreview(t, locale).url), absoluteUrl('/images/storefront.jpg')],
    foundingDate: String(winery.since),
    telephone: winery.orderPhone.href.replace('tel:', ''),
    address: {
      '@type': 'PostalAddress',
      streetAddress: winery.addressLines[0],
      addressLocality: 'Bến Lức',
      addressRegion: 'Long An',
      addressCountry: 'VN',
    },
    hasMap: mapsHref,
    currenciesAccepted: 'VND',
    sameAs: [winery.zalo.href],
  };
  const website = {
    '@type': 'WebSite',
    '@id': absoluteUrl('/#website'),
    url: absoluteUrl(localizedPath(locale, '/')),
    name: winery.name,
    inLanguage: LOCALES[locale].intl,
    publisher: { '@id': organization['@id'] },
  };
  const graph: object[] = [website, organization];
  if (page) {
    const url = absoluteUrl(localizedPath(locale, page.article.path));
    graph.push({
      '@type': 'Article',
      '@id': `${url}#article`,
      url,
      mainEntityOfPage: url,
      headline: page.article.title,
      description: page.article.description,
      image: absoluteUrl(page.article.image),
      datePublished: page.article.publishedAt,
      inLanguage: LOCALES[locale].intl,
      author: { '@id': organization['@id'] },
      publisher: { '@id': organization['@id'] },
    });
  }
  return { '@context': 'https://schema.org', '@graph': graph };
}
