import type { Metadata } from 'next';
import { localizedPath } from '@web/core/i18n/paths';
import { localizedPageMetadata, type PreviewImage } from '@web/core/i18n/seo';
import { mapsHref, shop } from '@/content/shop';
import { DEFAULT_LOCALE, LOCALE_CODES, LOCALES, type Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages';
import { SITE_URL } from '@/site';

/** The link preview of every page without its own image: the shop sign on the brand green. */
export const DEFAULT_OG_IMAGE = { url: '/images/og-default.jpg', width: 1200, height: 630 } as const;

export type { PreviewImage };

/** Full metadata of a public page (ADR 0021), see localizedPageMetadata. Else DEFAULT_OG_IMAGE. */
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
  image?: PreviewImage;
  article?: { publishedTime: string };
}): Metadata {
  return localizedPageMetadata({
    locale,
    intl: Object.fromEntries(LOCALE_CODES.map((code) => [code, LOCALES[code].intl])) as Record<Locale, string>,
    defaultLocale: DEFAULT_LOCALE,
    paths,
    siteName: shop.fullName,
    title,
    fullTitle: title ? `${title} · ${shop.fullName}` : t.meta.title,
    description,
    image: image ?? { ...DEFAULT_OG_IMAGE, alt: t.meta.ogImageAlt },
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

const DAYS = {
  weekdays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  weekend: ['Saturday', 'Sunday'],
} as const;

/**
 * schema.org structured data (JSON-LD) for the home page: the shop as a local business (name,
 * address, phone, opening hours, map: Google's local results) and the website. Only facts shown
 * on the page (src/content/shop.ts); stable @ids so other pages can refer to them.
 */
export function structuredData(t: Messages, locale: Locale) {
  const home = absoluteUrl(localizedPath(locale, '/'));
  const business = {
    '@type': 'LaundryOrDryCleaner',
    '@id': absoluteUrl('/#business'),
    name: shop.fullName,
    description: t.meta.description,
    url: home,
    image: [absoluteUrl(DEFAULT_OG_IMAGE.url), absoluteUrl('/images/machines.jpg'), absoluteUrl('/images/shelves.jpg')],
    logo: absoluteUrl('/icon.svg'),
    telephone: shop.phone.href.replace('tel:', ''),
    address: {
      '@type': 'PostalAddress',
      streetAddress: shop.address.street,
      addressLocality: shop.address.ward,
      addressRegion: 'Thành phố Hồ Chí Minh',
      addressCountry: 'VN',
    },
    hasMap: mapsHref,
    currenciesAccepted: 'VND',
    openingHoursSpecification: (['weekdays', 'weekend'] as const).map((key) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: DAYS[key].map((day) => `https://schema.org/${day}`),
      opens: shop.hours[key].open,
      closes: shop.hours[key].close,
    })),
    sameAs: [shop.zaloHref],
  };
  const website = {
    '@type': 'WebSite',
    '@id': absoluteUrl('/#website'),
    url: home,
    name: shop.fullName,
    inLanguage: LOCALES[locale].intl,
    publisher: { '@id': business['@id'] },
  };
  return { '@context': 'https://schema.org', '@graph': [website, business] };
}
