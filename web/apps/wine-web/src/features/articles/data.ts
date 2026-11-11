import 'server-only';
import type { StaticImageData } from 'next/image';
import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages';
import cabinet from '../../../public/images/cabinet.jpg';
import displayJars from '../../../public/images/display-jars.jpg';
import factory from '../../../public/images/factory.jpg';
import hapNong from '../../../public/images/p-can-hap-nong.jpg';
import nepGoDen from '../../../public/images/p-can-nep-go-den.jpg';
import ruouCan from '../../../public/images/ruou-can.jpg';
import showroom from '../../../public/images/showroom.jpg';
import storefront from '../../../public/images/storefront.jpg';
import towerRack from '../../../public/images/tower-rack.jpg';
import source from '@/content/articles.json';

/**
 * Articles ("Bài viết"). FOR NOW read from src/content/articles.json (sample content assembled
 * from facts already on the site, for reviewing the frontend). The JSON has the shape the API
 * will return; when the API exists, replace the bodies of listArticles/getArticle with
 * `apiFetch` calls (server only) and images come from object storage (STORAGE_ORIGINS).
 */

export type ArticleCategory = keyof Messages['articles']['categories'];

/** URL segment of each category (/bai-viet/chu-de/<segment>): Vietnamese, the site's main language. */
export const CATEGORY_SLUGS: Record<ArticleCategory, string> = {
  brand: 'thuong-hieu',
  craft: 'san-xuat',
  serving: 'thuong-thuc',
  guide: 'cam-nang',
  partners: 'hop-tac',
};
export const CATEGORIES = Object.keys(CATEGORY_SLUGS) as ArticleCategory[];

export function categoryFromSlug(slug: string): ArticleCategory | undefined {
  return CATEGORIES.find((category) => CATEGORY_SLUGS[category] === slug);
}

/** A block of an article's body. The API will send the same blocks (never raw HTML). */
export type ArticleBlock =
  | { type: 'p' | 'h2' | 'quote'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'image'; image: ImageKey; alt: string; caption?: string };

export type ArticleSummary = {
  slug: string;
  category: ArticleCategory;
  publishedAt: string;
  featured: boolean;
  title: string;
  excerpt: string;
  cover: StaticImageData;
  coverAlt: string;
  readingMinutes: number;
};
export type Article = ArticleSummary & { body: ArticleBlock[] };

const IMAGES = { cabinet, displayJars, factory, hapNong, nepGoDen, ruouCan, showroom, storefront, towerRack };
export type ImageKey = keyof typeof IMAGES;

export function articleImage(key: ImageKey): StaticImageData {
  return IMAGES[key];
}

type SourceItem = (typeof source.items)[number];

function toArticle(item: SourceItem, locale: Locale): Article {
  const text = item.i18n[locale];
  const body = text.body as ArticleBlock[];
  const words = [text.title, text.excerpt, ...body.flatMap((block) => ('text' in block ? [block.text] : 'items' in block ? block.items : []))]
    .join(' ')
    .split(/\s+/).length;
  return {
    slug: item.slug,
    category: item.category as ArticleCategory,
    publishedAt: item.publishedAt,
    featured: item.featured,
    title: text.title,
    excerpt: text.excerpt,
    cover: IMAGES[item.cover as ImageKey],
    coverAlt: text.coverAlt,
    readingMinutes: Math.max(1, Math.round(words / 200)),
    body,
  };
}

/** Every article in a language, newest first (optionally one category). */
export async function listArticles(locale: Locale, category?: ArticleCategory): Promise<ArticleSummary[]> {
  return source.items
    .filter((item) => !category || item.category === category)
    .map((item) => toArticle(item, locale))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export async function getArticle(locale: Locale, slug: string): Promise<Article | null> {
  const item = source.items.find((entry) => entry.slug === slug);
  return item ? toArticle(item, locale) : null;
}

/** Slugs to prerender (generateStaticParams) and list in the sitemap. */
export function articleSlugs(): { slug: string; publishedAt: string }[] {
  return source.items.map((item) => ({ slug: item.slug, publishedAt: item.publishedAt }));
}

/** "/bai-viet", "/bai-viet/<slug>", "/bai-viet/chu-de/<segment>" (pass through href(locale, …)). */
export const articlePaths = {
  index: '/bai-viet',
  article: (slug: string) => `/bai-viet/${slug}`,
  category: (category: ArticleCategory) => `/bai-viet/chu-de/${CATEGORY_SLUGS[category]}`,
};
