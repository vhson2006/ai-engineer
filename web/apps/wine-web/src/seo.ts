import type { Metadata } from 'next';
import { localizedPath } from '@web/core/i18n/paths';
import { localizedAlternates } from '@web/core/i18n/seo';
import { winery } from '@/content/winery';
import { LOCALE_CODES, LOCALES, type Locale } from '@/i18n/locales';
import { SITE_URL } from '@/site';

/**
 * Full metadata of a public page (ADR 0021): title, description, canonical + hreflang, Open Graph
 * and Twitter card. A page's `openGraph` REPLACES the layout's (no deep merge), so it is always
 * built complete here. Images come from the nearest opengraph-image.tsx (file convention).
 */
export function publicPageMetadata({
  locale,
  path,
  title,
  description,
  article,
}: {
  locale: Locale;
  path: string;
  /** Page title; omitted on the home page (the layout's default title is used). */
  title?: string;
  description: string;
  /** Article pages: Open Graph type `article` with its dates and section. */
  article?: { publishedTime: string; section: string };
}): Metadata {
  const fullTitle = title ? `${title} · ${winery.name}` : winery.name;
  return {
    ...(title ? { title } : {}),
    description,
    alternates: localizedAlternates(LOCALE_CODES, locale, path),
    openGraph: {
      ...(article ? { type: 'article', publishedTime: article.publishedTime, section: article.section } : { type: 'website' }),
      siteName: winery.name,
      title: fullTitle,
      description,
      url: localizedPath(locale, path),
      locale: ogLocale(locale),
      alternateLocale: LOCALE_CODES.filter((code) => code !== locale).map(ogLocale),
    },
    twitter: { card: 'summary_large_image', title: fullTitle, description },
  };
}

/** 'vi' → 'vi_VN' (Open Graph wants language_TERRITORY). */
export function ogLocale(locale: Locale): string {
  return LOCALES[locale].intl.replace('-', '_');
}

export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).href;
}

/** schema.org graph (JSON-LD) of the company, extended with an Article on article pages. */
export function structuredData(
  locale: Locale,
  page?: { article: { path: string; title: string; description: string; image: string; publishedAt: string } },
) {
  const organization = {
    '@type': 'Organization',
    '@id': absoluteUrl('/#organization'),
    name: winery.fullName,
    alternateName: winery.name,
    url: absoluteUrl(localizedPath(locale, '/')),
    foundingDate: String(winery.since),
    telephone: winery.orderPhone.display,
    address: { '@type': 'PostalAddress', streetAddress: winery.addressLines.join(', '), addressCountry: 'VN' },
  };
  const graph: object[] = [organization];
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
