import 'server-only';
import { apiFetch } from './fetch';
import { siteApiFetch } from './site-fetch';
import type { Paginated } from './types';

/**
 * content-service API (ADR 0026), server side only: the articles of the client sites.
 * Response contracts mirror libs/common/src/contracts/content in nest-microservice.
 *
 * Tokens need the audience `content-api` and its client roles (content:read/write/publish/admin);
 * the API also checks that the user belongs to the site (Keycloak group /sites/<siteId>).
 * Changes are not conditional: the last write wins (ADR 0029). Article bodies are HTML that the
 * API sanitizes on write (ADR 0031): render the body it returns as is, never HTML from elsewhere.
 */

export type ArticleStatus = 'draft' | 'scheduled' | 'published';

export interface Site {
  id: string;
  name: string;
  locales: string[];
  defaultLocale: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  siteId: string;
  key: string;
  position: number;
  translations: { locale: string; name: string; slug: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface ArticleTranslation {
  locale: string;
  title: string;
  slug: string;
  excerpt: string;
  coverAlt: string | null;
  body: string;
  readingMinutes: number;
  seoTitle: string | null;
  seoDescription: string | null;
}

export interface Article {
  id: string;
  siteId: string;
  categoryId: string;
  status: ArticleStatus;
  featured: boolean;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  translations: ArticleTranslation[];
}

/** A published article in one language, as a site lists it. */
export interface PublishedArticleSummary {
  id: string;
  locale: string;
  /** The current slug: if the page was asked with another one (an old slug), redirect 301 to this. */
  slug: string;
  title: string;
  excerpt: string;
  coverAlt: string | null;
  readingMinutes: number;
  featured: boolean;
  publishedAt: string;
  category: { key: string; slug: string; name: string };
}

export interface PublishedArticle extends PublishedArticleSummary {
  body: string;
  seoTitle: string | null;
  seoDescription: string | null;
  /** The same article in every language of the site (hreflang). */
  alternates: { locale: string; slug: string }[];
}

/** Input of one language (ArticleTranslationDto). */
export interface ArticleTranslationInput {
  locale: string;
  title: string;
  slug: string;
  excerpt: string;
  coverAlt?: string | null;
  body: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
}

const site = (siteId: string) => `/api/content/sites/${encodeURIComponent(siteId)}`;
const article = (siteId: string, id: string, suffix = '') =>
  `${site(siteId)}/articles/${encodeURIComponent(id)}${suffix}`;

// ─────────────────────────────── Sites and categories ───────────────────────────────

/** The sites the signed-in user manages (content:admin: every site). */
export function listSites() {
  return apiFetch<Site[]>('/api/content/sites');
}

/** One site (404 when the user doesn't belong to it). */
export function getSite(siteId: string) {
  return apiFetch<Site>(site(siteId));
}

export function listCategories(siteId: string) {
  return apiFetch<Category[]>(`${site(siteId)}/categories`);
}

/** Input of a category (CreateCategoryDto): one name + slug per language of the site. */
export interface CategoryInput {
  key: string;
  position?: number;
  translations: { locale: string; name: string; slug: string }[];
}

/** Not retried: wrap in `once()`. 409 when the key or a slug is taken. */
export function createCategory(siteId: string, input: CategoryInput) {
  return apiFetch<Category>(`${site(siteId)}/categories`, {
    method: 'POST',
    body: { key: input.key, position: input.position, translations: input.translations },
  });
}

/** `translations` replaces every language. */
export function updateCategory(siteId: string, id: string, input: Partial<CategoryInput>) {
  return apiFetch<Category>(`${site(siteId)}/categories/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: { key: input.key, position: input.position, translations: input.translations },
  });
}

/** 422 foreign_key_violation while articles still use it. */
export function deleteCategory(siteId: string, id: string) {
  return apiFetch<void>(`${site(siteId)}/categories/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// ─────────────────────────────── Articles (admin) ───────────────────────────────

export function listArticles(
  siteId: string,
  params: { page?: number; limit?: number; status?: ArticleStatus; categoryId?: string; search?: string } = {},
) {
  return apiFetch<Paginated<Article>>(`${site(siteId)}/articles`, { query: params });
}

export function getArticle(siteId: string, id: string) {
  return apiFetch<Article>(article(siteId, id));
}

/** A draft; languages may be missing until it is published. Not retried: wrap in `once()`. */
export function createArticle(
  siteId: string,
  input: { categoryId: string; featured?: boolean; translations: ArticleTranslationInput[] },
) {
  return apiFetch<Article>(`${site(siteId)}/articles`, {
    method: 'POST',
    body: { categoryId: input.categoryId, featured: input.featured, translations: input.translations },
  });
}

/** `translations` replaces every language. Live or scheduled articles need content:publish. */
export function updateArticle(
  siteId: string,
  id: string,
  input: { categoryId?: string; featured?: boolean; translations?: ArticleTranslationInput[] },
) {
  return apiFetch<Article>(article(siteId, id), {
    method: 'PATCH',
    body: { categoryId: input.categoryId, featured: input.featured, translations: input.translations },
  });
}

/** Publish now, or schedule with `at` (ISO date-time). Every language of the site is required (422). */
export function publishArticle(siteId: string, id: string, at?: string) {
  return apiFetch<Article>(article(siteId, id, '/publish'), { method: 'POST', body: at ? { at } : {} });
}

/** Back to draft: off the site, or the schedule cancelled. */
export function unpublishArticle(siteId: string, id: string) {
  return apiFetch<Article>(article(siteId, id, '/unpublish'), { method: 'POST' });
}

export function deleteArticle(siteId: string, id: string) {
  return apiFetch<void>(article(siteId, id), { method: 'DELETE' });
}

// ─────────────────────────────── Published (what a site shows) ───────────────────────────────
// Called by the PUBLIC sites with their service account (siteApiFetch, ADR 0032), not a user.

/** The topics of a site, for its public pages (names and slugs per language). */
export function listSiteCategories(siteId: string) {
  return siteApiFetch<Category[]>(`${site(siteId)}/categories`);
}

export function listPublishedArticles(
  siteId: string,
  params: { locale: string; category?: string; page?: number; limit?: number },
) {
  return siteApiFetch<Paginated<PublishedArticleSummary>>(`${site(siteId)}/published-articles`, { query: params });
}

/** An old slug finds the article too: compare `slug` with the one asked and redirect when it differs. */
export function getPublishedArticle(siteId: string, locale: string, slug: string) {
  return siteApiFetch<PublishedArticle>(`${site(siteId)}/published-articles/by-slug`, { query: { locale, slug } });
}
