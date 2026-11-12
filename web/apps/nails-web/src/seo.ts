import type { Metadata } from 'next';
import { localizedPath } from '@web/core/i18n/paths';
import { localizedPageMetadata, type PreviewImage } from '@web/core/i18n/seo';
import { salon } from '@/content/salon';
import { DEFAULT_LOCALE, LOCALE_CODES, LOCALES, type Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages';
import { SITE_URL } from '@/site';

export type { PreviewImage };

/**
 * The link preview of every page without its own image: the bento card drawn per language by
 * src/app/og/[image]/route.ts (a route, not opengraph-image.tsx: a file-based image would
 * override an article's cover).
 */
export function defaultPreview(t: Messages, locale: Locale): PreviewImage {
  return { url: `/og/${locale}.png`, width: 1200, height: 630, alt: t.meta.ogImageAlt };
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
    siteName: salon.fullName,
    title,
    fullTitle: title ? `${title} · ${salon.fullName}` : t.meta.title,
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

const DAYS: Record<(typeof salon.hours)[number]['id'], string[]> = {
  monThu: ['Monday', 'Tuesday', 'Wednesday', 'Thursday'],
  fri: ['Friday'],
  sat: ['Saturday'],
  sun: ['Sunday'],
};

/**
 * schema.org structured data (JSON-LD) for the home page: the salon as a NailSalon (name, address,
 * phone, hours, map, booking page: Google's local results) and the website. Only facts shown on
 * the page (src/content/salon.ts); stable @ids so other pages can refer to them.
 */
export function structuredData(t: Messages, locale: Locale) {
  const home = absoluteUrl(localizedPath(locale, '/'));
  const business = {
    '@type': 'NailSalon',
    '@id': absoluteUrl('/#business'),
    name: salon.fullName,
    legalName: salon.legalName,
    description: t.meta.description,
    url: home,
    image: [absoluteUrl(defaultPreview(t, locale).url), absoluteUrl('/images/spa-candle.jpg')],
    logo: absoluteUrl('/images/logo-envy.png'),
    telephone: salon.phones[0].href.replace('tel:', ''),
    address: {
      '@type': 'PostalAddress',
      streetAddress: salon.address.street,
      addressLocality: salon.address.city,
      addressRegion: salon.address.region,
      postalCode: salon.address.postalCode,
      addressCountry: 'US',
    },
    hasMap: salon.mapsHref,
    currenciesAccepted: salon.currency,
    openingHoursSpecification: salon.hours.map((row) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: DAYS[row.id].map((day) => `https://schema.org/${day}`),
      opens: row.open,
      closes: row.close,
    })),
    potentialAction: { '@type': 'ReserveAction', target: salon.bookingUrl },
    sameAs: salon.socials.map((social) => social.href),
  };
  const website = {
    '@type': 'WebSite',
    '@id': absoluteUrl('/#website'),
    url: home,
    name: salon.fullName,
    inLanguage: LOCALES[locale].intl,
    publisher: { '@id': business['@id'] },
  };
  return { '@context': 'https://schema.org', '@graph': [website, business] };
}
