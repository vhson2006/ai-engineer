import type { MediaImage } from './content.media';
/**
 * Response contracts of content-service (ADR 0026). Dates are ISO strings. Mirrored for the web
 * apps in web/packages/core/src/api/content.ts.
 */

/** A language code: `vi`, `en`, `en-US`. */
export const LOCALE_PATTERN = /^[a-z]{2}(-[A-Z]{2})?$/;
/** Lowercase words joined by hyphens: site ids, category keys, slugs. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * draft      being written; only admins see it
 * scheduled  published automatically at `scheduledAt` (a job checks every minute)
 * published  live on the site
 */
export const ARTICLE_STATUSES = ['draft', 'scheduled', 'published'] as const;
export type ArticleStatus = (typeof ARTICLE_STATUSES)[number];

/**
 * The tags an article body may contain: text (ADR 0031) and layout blocks (ADR 0033).
 * content-service sanitizes every body on write with this allow-list (links: http, https, mailto
 * only; images: site-relative paths only; classes: ARTICLE_HTML_CLASSES only); everything else is
 * removed. The sites render the stored HTML as is.
 */
export const ARTICLE_HTML_TAGS = [
  'p',
  'br',
  'h2',
  'h3',
  'strong',
  'em',
  'u',
  's',
  'code',
  'pre',
  'blockquote',
  'ul',
  'ol',
  'li',
  'hr',
  'a',
  // layout blocks (ADR 0033)
  'section',
  'div',
  'figure',
  'figcaption',
  'img',
] as const;

/**
 * The only classes an article body may carry, per tag (ADR 0033): the layout vocabulary the sites
 * style in @web/ui/article-layout.css. Any other class is dropped; no inline style ever.
 */
export const ARTICLE_HTML_CLASSES = {
  section: [
    'tpl-cols',
    'tpl-cols-3',
    'tpl-split',
    'tpl-split-reverse',
    'tpl-callout',
    'tpl-note',
    'tpl-tip',
    'tpl-warn',
    'tpl-stats',
    'tpl-timeline',
    'tpl-gallery',
    'tpl-gallery-3',
    'tpl-mosaic',
    'tpl-steps',
    'tpl-qa',
    'tpl-compare',
    'tpl-toc',
    'tpl-faq',
    'tpl-cta',
    'tpl-chapter',
    'tpl-dark',
    'tpl-cards',
    'tpl-summary',
    'tpl-ranked',
    'tpl-facts',
  ],
  div: ['tpl-item', 'tpl-media', 'tpl-body', 'tpl-highlight'],
  figure: ['tpl-wide', 'tpl-full', 'tpl-left', 'tpl-right', 'tpl-portrait', 'tpl-framed'],
  p: [
    'tpl-lead',
    'tpl-kicker',
    'tpl-dropcap',
    'tpl-q',
    'tpl-a',
    'tpl-small',
    'tpl-stat',
    'tpl-label',
    'tpl-byline',
    'tpl-rank',
  ],
  blockquote: ['tpl-pull', 'tpl-center'],
  hr: ['tpl-ornament'],
  ol: ['tpl-steps', 'tpl-numbered'],
  ul: ['tpl-check', 'tpl-pros', 'tpl-cons', 'tpl-inline'],
  h2: ['tpl-chapter-title', 'tpl-center'],
  h3: ['tpl-year', 'tpl-small-heading'],
} as const satisfies Partial<Record<(typeof ARTICLE_HTML_TAGS)[number], readonly string[]>>;

export interface SiteResponse {
  id: string;
  name: string;
  /** Every language the site publishes in: a published article has a translation for each. */
  locales: string[];
  defaultLocale: string;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryTranslationResponse {
  locale: string;
  name: string;
  slug: string;
}

export interface CategoryResponse {
  id: string;
  siteId: string;
  key: string;
  position: number;
  translations: CategoryTranslationResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface ArticleTranslationResponse {
  locale: string;
  title: string;
  slug: string;
  excerpt: string;
  coverAlt: string | null;
  /** Sanitized HTML (ARTICLE_HTML_TAGS). */
  body: string;
  readingMinutes: number;
  seoTitle: string | null;
  seoDescription: string | null;
}

/** An article as admins see it: every language, any status. */
export interface ArticleResponse {
  id: string;
  siteId: string;
  categoryId: string;
  status: ArticleStatus;
  featured: boolean;
  /** Cover image (media library of the site); its alt text is per language: coverAlt. */
  cover: MediaImage | null;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  translations: ArticleTranslationResponse[];
}

/** A published article in ONE language, as a site shows it in a list. */
export interface PublishedArticleSummary {
  id: string;
  locale: string;
  /** The CURRENT slug: when a site asked for an older one, it redirects (301) to this. */
  slug: string;
  title: string;
  excerpt: string;
  coverAlt: string | null;
  /** Cover image, optimized sizes on the CDN (srcset), or null. */
  cover: MediaImage | null;
  readingMinutes: number;
  featured: boolean;
  publishedAt: string;
  category: { key: string; slug: string; name: string };
}

/** A published article in ONE language, with its body and its other languages (hreflang). */
export interface PublishedArticleResponse extends PublishedArticleSummary {
  /** Sanitized HTML (ARTICLE_HTML_TAGS). */
  body: string;
  seoTitle: string | null;
  seoDescription: string | null;
  /** The same article in every language of the site: `{ locale, slug }`. */
  alternates: { locale: string; slug: string }[];
}

export const TRANSLATION_JOB_STATUSES = ['pending', 'completed', 'failed'] as const;
export type TranslationJobStatus = (typeof TRANSLATION_JOB_STATUSES)[number];

/** A segment the reviewer should check: its numbers or its inline markup changed. */
export interface TranslationWarning {
  kind: 'numbers' | 'markup';
  /** The start of the translated text, to find it in the article. */
  text: string;
}

/**
 * A machine translation of an article (ADR 0036). `completed`: the target language is saved as
 * a draft translation to review; `failed`: `error` says why (ai-service's TranslationFailure, or
 * article_not_draft / translation_exists / invalid_output when putting it back).
 */
export interface TranslationJobResponse {
  id: string;
  siteId: string;
  articleId: string;
  sourceLocale: string;
  targetLocale: string;
  status: TranslationJobStatus;
  error: string | null;
  detail: string | null;
  warnings: TranslationWarning[];
  provider: string | null;
  model: string | null;
  createdBy: string;
  createdAt: string;
  completedAt: string | null;
}
