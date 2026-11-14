import type { LocaleRouting } from '@web/core/i18n/routing';
import type { Business, OpeningHours } from './business';
import { formatDate, formatHours, formatInstantDate } from './format';
import { LOCALES, type Locale } from './locales';

/** The legal pages a site can have (texts: the kit's dictionaries, or the site's own `legal`). */
export type LegalPage = 'privacy' | 'terms' | 'dataDeletion';
export const LEGAL_ORDER: LegalPage[] = ['privacy', 'terms', 'dataDeletion'];

/**
 * Same path in every language (like the articles): social platforms ask for these URLs when an
 * app or a login is registered, so they never change once published.
 */
const LEGAL_PATHS: Record<LegalPage, string> = {
  privacy: '/chinh-sach-bao-mat',
  terms: '/dieu-khoan-su-dung',
  dataDeletion: '/xoa-du-lieu',
};

/** When the kit's legal texts (src/messages, legal.*) last changed. */
export const KIT_LEGAL_UPDATED = '2026-11-13';

/** What a site may change; everything has the default of the sample sites (ADR 0042). */
export interface WebsiteOptions {
  /** The languages, in the switcher's order. Default: Vietnamese, English. */
  locales?: readonly Locale[];
  /** A first visit opens this language (ADR 0038). Default: the first of `locales`. */
  defaultLocale?: Locale;
  /** Intl locale per language when it differs from the kit's, e.g. `{ en: 'en-US' }`. */
  intl?: Partial<Record<Locale, string>>;
  /** The business's time zone (publication dates). Default Asia/Ho_Chi_Minh. */
  timeZone?: string;
  /** ISO 4217 code (JSON-LD `currenciesAccepted`). Default VND. */
  currency?: string;
  paths?: {
    /** The articles index. Default `/bai-viet`. */
    articles?: string;
    /** Prefix of a topic's page. Default `<articles>/chu-de`. */
    topics?: string;
    /** The legal pages this site has, and their paths. Default: all three, Vietnamese paths. */
    legal?: Partial<Record<LegalPage, string>>;
  };
  /** When the legal texts last changed (one date, or one per page): the kit's, unless the site has its own texts. */
  legalUpdated?: string | Partial<Record<LegalPage, string>>;
}

/**
 * One business site's configuration, bound to its facts: languages, URLs of the shared pages,
 * legal pages, formatting. Client-safe (the proxy, client components): defined once per site in
 * `src/website.ts`, passed to `createSite` and to the kit's components.
 */
export function defineWebsite(business: Business, options: WebsiteOptions = {}) {
  const locales: readonly Locale[] = options.locales ?? ['vi', 'en'];
  const defaultLocale = options.defaultLocale ?? locales[0];
  const timeZone = options.timeZone ?? 'Asia/Ho_Chi_Minh';
  const intl = (locale: Locale): string => options.intl?.[locale] ?? LOCALES[locale].intl;
  const articles = options.paths?.articles ?? '/bai-viet';
  const topics = options.paths?.topics ?? `${articles}/chu-de`;
  const legalPaths = options.paths?.legal ?? LEGAL_PATHS;
  const legalPages = LEGAL_ORDER.filter((page) => legalPaths[page]);
  const samePath = (path: string) => Object.fromEntries(locales.map((code) => [code, path])) as Record<Locale, string>;

  return {
    business,
    locales,
    defaultLocale,
    timeZone,
    currency: options.currency ?? 'VND',
    intl,
    /** Every language's Intl locale (hreflang, Open Graph). */
    intlByLocale: Object.fromEntries(locales.map((code) => [code, intl(code)])) as Record<Locale, string>,
    /** The language switcher's options. */
    localeOptions: locales.map((code) => ({ code, name: LOCALES[code].name })),
    /** The proxy's language routing: no detection, the site's own cookie (ADR 0038). */
    routing: { locales: [...locales], defaultLocale, bypass: [], detectLanguage: false, cookieName: business.cookieName } satisfies LocaleRouting<Locale>,
    samePath,
    /** "/bai-viet", "/bai-viet/<slug>", "/bai-viet/chu-de/<topic slug>" (pass through href(locale, …)). */
    paths: {
      articles,
      article: (slug: string) => `${articles}/${slug}`,
      topic: (slug: string) => `${topics}/${slug}`,
    },
    legalPages,
    legalPath: (page: LegalPage): string => {
      const path = legalPaths[page];
      if (!path) throw new Error(`${business.siteId} has no ${page} page`);
      return path;
    },
    /** When a legal page's text last changed (shown on it). */
    legalUpdated: (page: LegalPage): string => {
      const updated = options.legalUpdated ?? KIT_LEGAL_UPDATED;
      return typeof updated === 'string' ? updated : (updated[page] ?? KIT_LEGAL_UPDATED);
    },
    /** Pages in every language under one path (the sitemap adds the articles). */
    publicPages: [
      { path: '/', priority: 1, changeFrequency: 'monthly' as const },
      { path: articles, priority: 0.8, changeFrequency: 'weekly' as const },
      ...legalPages.map((page) => ({ path: legalPaths[page]!, priority: 0.2, changeFrequency: 'yearly' as const })),
    ],
    /** A publication instant as a date in the business's time zone. */
    instantDate: (locale: Locale, iso: string) => formatInstantDate(locale, iso, intl(locale), timeZone),
    /** A calendar date ("2026-11-13"). */
    date: (locale: Locale, isoDate: string) => formatDate(locale, isoDate, intl(locale)),
    /** Opening hours "07:00 – 19:00". */
    hours: (locale: Locale, row: Pick<OpeningHours, 'open' | 'close'>) => formatHours(locale, row, intl(locale)),
  };
}

export type Website = ReturnType<typeof defineWebsite>;
