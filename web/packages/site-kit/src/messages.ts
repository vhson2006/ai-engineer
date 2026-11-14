import type kit from './messages/en.json';
import type { LegalPage } from './website';

/** The kit's own strings (src/messages/<lang>.json): common UI, articles, legal pages, 404. */
export type KitMessages = typeof kit;

/** One legal page: intro and numbered sections; `{name}`, `{address}`… are the business's facts. */
export interface LegalDoc {
  title: string;
  description: string;
  intro: string;
  sections: { id: string; title: string; paragraphs: string[]; items: string[] }[];
}

/** The legal pages' words: the kit's (generic) or a site's own, for the pages it has. */
export type LegalTexts = {
  updated: string;
  contents: string;
  related: string;
  links: Partial<Record<LegalPage, string>>;
} & Partial<Record<LegalPage, LegalDoc>>;

/**
 * What every site's dictionary must also have (its own words, used by the kit's pages): the
 * home page metadata, the articles section of this business, the footer tagline and the opening
 * hours labels (`hours[<OpeningHours.key>]`).
 */
export interface SiteBaseMessages {
  meta: { title: string; description: string; ogImageAlt: string };
  blog: {
    title: string;
    intro: string;
    metaTitle: string;
    metaDescription: string;
    latestIntro: string;
    ctaTitle: string;
    ctaText: string;
  };
  footer: { tagline: string };
  hours: Record<string, string>;
}

/** A site's whole dictionary as the kit sees it. */
export type BaseMessages = Omit<KitMessages, 'legal'> & { legal: LegalTexts } & SiteBaseMessages;

/** A site's merged dictionary: the kit's strings with the site's own on top (mergeMessages). */
export type Dictionary<S> = Omit<KitMessages, keyof S> & {
  [K in keyof S]: K extends keyof KitMessages ? Omit<KitMessages[K], keyof S[K]> & S[K] : S[K];
};

/**
 * A site's dictionary: the kit's strings, then the site's own, merged one level deep (a site
 * rewords `common.call` or adds `articles.share` without repeating the rest). A site that has its
 * own legal texts gives `legal.privacy`, `legal.terms`… whole: they replace the kit's.
 */
export function mergeMessages<S extends SiteBaseMessages>(kitMessages: KitMessages, site: S): Dictionary<S> {
  const merged: Record<string, unknown> = { ...kitMessages };
  for (const [key, value] of Object.entries(site)) {
    const base = merged[key];
    merged[key] = isObject(base) && isObject(value) ? { ...base, ...value } : value;
  }
  return merged as Dictionary<S>;
}

const isObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
