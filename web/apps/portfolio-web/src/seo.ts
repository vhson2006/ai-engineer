import type { Metadata } from 'next';
import { localizedPath } from '@web/core/i18n/paths';
import { localizedAlternates } from '@web/core/i18n/seo';
import { profile } from '@/content/profile';
import { LOCALE_CODES, LOCALES, type Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages';
import { SITE_URL } from '@/site';

/**
 * Full metadata of a public page (ADR 0021): title, description, canonical + hreflang, Open Graph
 * and Twitter card. A page's `openGraph` REPLACES the layout's (no deep merge), so it is always
 * built complete here. The OG image comes from app/[lang]/opengraph-image.tsx (file convention).
 */
export function publicPageMetadata({
  t,
  locale,
  path,
  title,
  description,
  type = 'website',
}: {
  t: Messages;
  locale: Locale;
  path: string;
  /** Page title; omitted on the home page (the layout's default title is used). */
  title?: string;
  description: string;
  type?: 'website' | 'profile';
}): Metadata {
  const siteName = `${profile.name} · ${t.profile.role}`;
  return {
    ...(title ? { title } : {}),
    description,
    alternates: localizedAlternates(LOCALE_CODES, locale, path),
    openGraph: {
      type,
      siteName,
      title: title ? `${title} · ${profile.name}` : siteName,
      description,
      url: localizedPath(locale, path),
      locale: ogLocale(locale),
      alternateLocale: LOCALE_CODES.filter((code) => code !== locale).map(ogLocale),
    },
    twitter: {
      card: 'summary_large_image',
      title: title ? `${title} · ${profile.name}` : siteName,
      description,
    },
  };
}

/** Private pages (sign-in, dashboard): never indexed, links not followed. */
export const privatePageRobots: Metadata['robots'] = { index: false, follow: false };

/** 'vi' → 'vi_VN' (Open Graph wants language_TERRITORY). */
export function ogLocale(locale: Locale): string {
  return LOCALES[locale].intl.replace('-', '_');
}

export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).href;
}

/**
 * schema.org structured data (JSON-LD): who the site is about, for search engines' rich results.
 * One graph with stable @ids: the WebSite, the Person, and (About page) the ProfilePage.
 */
export function structuredData(t: Messages, locale: Locale, page: { path: string; profilePage?: { name: string; modified: Date } }) {
  const home = absoluteUrl(localizedPath(locale, '/'));
  const person = {
    '@type': 'Person',
    '@id': absoluteUrl('/#person'),
    name: profile.name,
    jobTitle: t.profile.role,
    description: t.profile.tagline,
    url: home,
    email: `mailto:${profile.contact.email}`,
    sameAs: profile.contact.links.map((link) => link.href),
    knowsAbout: t.profile.skills.flatMap((group) => group.items),
  };
  const website = {
    '@type': 'WebSite',
    '@id': absoluteUrl('/#website'),
    url: home,
    name: `${profile.name} · ${t.profile.role}`,
    inLanguage: LOCALES[locale].intl,
    publisher: { '@id': person['@id'] },
  };
  const graph: object[] = [website, person];
  if (page.profilePage) {
    const url = absoluteUrl(localizedPath(locale, page.path));
    graph.push({
      '@type': 'ProfilePage',
      '@id': `${url}#page`,
      url,
      name: page.profilePage.name,
      inLanguage: LOCALES[locale].intl,
      isPartOf: { '@id': website['@id'] },
      mainEntity: { '@id': person['@id'] },
      dateModified: page.profilePage.modified.toISOString(),
    });
  }
  return { '@context': 'https://schema.org', '@graph': graph };
}
