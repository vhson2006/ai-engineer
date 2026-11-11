import 'server-only';
import type { StaticImageData } from 'next/image';
import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages';
import classicFrench from '../../../public/images/gallery/envy-3.png';
import milkyPink from '../../../public/images/gallery/envy-4.jpg';
import coralPedicure from '../../../public/images/gallery/envy-6.jpg';
import mintGoldFoil from '../../../public/images/gallery/envy-8.png';
import neonFrench from '../../../public/images/gallery/envy-9.jpg';
import source from '@/content/articles.json';

/**
 * Blog articles. FOR NOW read from src/content/articles.json (sample content written from the
 * salon's menu, FAQ and policy, for reviewing the frontend). The JSON has the shape the content
 * service will return (ADR 0026); when it exists, replace the bodies of listArticles/getArticle
 * with `apiFetch` calls (server only), and images come from object storage (STORAGE_ORIGINS).
 */

export type ArticleCategory = keyof Messages['articles']['categories'];

/** URL segment of each topic (/blog/topic/<segment>). */
export const CATEGORY_SLUGS: Record<ArticleCategory, string> = {
  care: 'nail-care',
  services: 'services',
  salon: 'salon',
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

const IMAGES = { classicFrench, coralPedicure, milkyPink, mintGoldFoil, neonFrench };
export type ImageKey = keyof typeof IMAGES;
export const IMAGE_KEYS = Object.keys(IMAGES) as ImageKey[];

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

/** Every article in a language, newest first (optionally one topic). */
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

/** Slugs to prerender (generateStaticParams). */
export function articleSlugs(): string[] {
  return source.items.map((item) => item.slug);
}

/** "/blog", "/blog/<slug>", "/blog/topic/<segment>" (pass through href(locale, …)). */
export const articlePaths = {
  index: '/blog',
  article: (slug: string) => `/blog/${slug}`,
  category: (category: ArticleCategory) => `/blog/topic/${CATEGORY_SLUGS[category]}`,
};
