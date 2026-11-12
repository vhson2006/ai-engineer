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

/**
 * An image of the media library (ADR 0034), optimized sizes on the CDN: the widest in `url`,
 * every size in `srcset` (`<url> 640w, …`). Render it with <img src srcset sizes width height>.
 */
export interface MediaImage {
  id: string;
  url: string;
  width: number;
  height: number;
  srcset: string;
}

export interface Media extends MediaImage {
  siteId: string;
  filename: string;
  contentType: 'image/webp' | 'image/jpeg';
  /** failed: an AI image that could not be made (ADR 0037). */
  status: 'pending' | 'ready' | 'failed';
  /** upload: from the admin's browser; ai: generated from `prompt` (ADR 0037). */
  source: 'upload' | 'ai';
  prompt: string | null;
  /** status failed: why (provider_refused, provider_unavailable, not_generated…). */
  error: string | null;
  variants: { width: number; height: number; size: number; url: string }[];
  createdBy: string;
  createdAt: string;
}

/** Answer to createMediaUpload: PUT each size to its URL with exactly its headers, then completeMedia. */
export interface MediaUpload {
  media: Media;
  uploads: { width: number; method: 'PUT'; url: string; headers: Record<string, string>; expiresAt: string }[];
}

/** One optimized size, as declared before the upload (CreateMediaUploadDto). */
export interface MediaVariantInput {
  width: number;
  height: number;
  size: number;
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
  /** Cover image (media library); its alt text per language: coverAlt. */
  cover: MediaImage | null;
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
  cover: MediaImage | null;
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
  input: { categoryId: string; featured?: boolean; coverMediaId?: string | null; translations: ArticleTranslationInput[] },
) {
  return apiFetch<Article>(`${site(siteId)}/articles`, {
    method: 'POST',
    body: {
      categoryId: input.categoryId,
      featured: input.featured,
      coverMediaId: input.coverMediaId,
      translations: input.translations,
    },
  });
}

/**
 * `translations` replaces every language; `coverMediaId: null` removes the cover (undefined keeps
 * it). Live or scheduled articles need content:publish. 422 invalid_cover: not an image of the site.
 */
export function updateArticle(
  siteId: string,
  id: string,
  input: { categoryId?: string; featured?: boolean; coverMediaId?: string | null; translations?: ArticleTranslationInput[] },
) {
  return apiFetch<Article>(article(siteId, id), {
    method: 'PATCH',
    body: {
      categoryId: input.categoryId,
      featured: input.featured,
      coverMediaId: input.coverMediaId,
      translations: input.translations,
    },
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

// ─────────────────────────────── Machine translation (ADR 0036) ───────────────────────────────
// Asynchronous: content-service asks ai-service, the result comes back as a DRAFT translation.

/** A segment to review after a machine translation: its numbers or its formatting changed. */
export interface TranslationWarning {
  kind: 'numbers' | 'markup';
  text: string;
}

export interface TranslationJob {
  id: string;
  siteId: string;
  articleId: string;
  sourceLocale: string;
  targetLocale: string;
  status: 'pending' | 'completed' | 'failed';
  /** failed: provider_unavailable, provider_refused, invalid_output, article_not_draft, translation_exists… */
  error: string | null;
  detail: string | null;
  warnings: TranslationWarning[];
  provider: string | null;
  model: string | null;
  createdBy: string;
  createdAt: string;
  completedAt: string | null;
}

/**
 * Machine-translate a DRAFT into `targetLocale` from `sourceLocale` (202, a pending job). 409
 * not_a_draft, 409 translation_exists (send overwrite), 422 invalid_locale / missing_source / too_large.
 * Asking again while a job is pending returns that job.
 */
export function startArticleTranslation(
  siteId: string,
  id: string,
  targetLocale: string,
  input: { sourceLocale: string; overwrite?: boolean },
) {
  return apiFetch<TranslationJob>(article(siteId, id, `/translations/${encodeURIComponent(targetLocale)}/auto`), {
    method: 'POST',
    body: { sourceLocale: input.sourceLocale, overwrite: input.overwrite },
  });
}

/** The article's latest translation jobs, newest first. */
export function listTranslationJobs(siteId: string, id: string) {
  return apiFetch<TranslationJob[]>(article(siteId, id, '/translation-jobs'));
}

// ─────────────────────────────── Media library (ADR 0034) ───────────────────────────────
// The bytes never come through here: the browser optimizes the image, PUTs every size to the
// presigned URLs (createMediaUploader, @web/core/files/media-upload), then completes.

const media = (siteId: string, id = '', suffix = '') =>
  `${site(siteId)}/media${id ? `/${encodeURIComponent(id)}` : ''}${suffix}`;

/** Ready images of a site, newest first. */
export function listMedia(siteId: string, params: { page?: number; limit?: number } = {}) {
  return apiFetch<Paginated<Media>>(media(siteId), { query: params });
}

/** Declare an optimized image and its sizes. Not retried (a retry would leave a pending image). */
export function createMediaUpload(
  siteId: string,
  input: { filename: string; contentType: Media['contentType']; variants: MediaVariantInput[] },
) {
  return apiFetch<MediaUpload>(media(siteId), {
    method: 'POST',
    body: {
      filename: input.filename,
      contentType: input.contentType,
      variants: input.variants.map(({ width, height, size }) => ({ width, height, size })),
    },
  });
}

/** Every size uploaded → ready. 409 upload_incomplete, 422 upload_mismatch (the image is removed). */
export function completeMedia(siteId: string, id: string) {
  return apiFetch<Media>(media(siteId, id, '/complete'), { method: 'POST' });
}

export { IMAGE_ASPECT_RATIOS, IMAGE_GENERATION_MAX_COUNT, IMAGE_PROMPT_MAX_LENGTH, type ImageAspectRatio } from './image-generation';
import type { ImageAspectRatio } from './image-generation';

/** An AI image generation (ADR 0037): its images, pending until ai-service answers. */
export interface MediaGeneration {
  jobId: string;
  /** completed may hold failed images (each one is made separately). */
  status: 'pending' | 'completed' | 'failed';
  media: Media[];
  /** Images the site may still generate this calendar month (UTC). */
  remaining: number;
}

/**
 * Generate 1-4 images from a description (202, pending). Counted in the site's monthly quota:
 * 422 quota_exceeded. Not retried (each image is paid for).
 */
export function generateMedia(
  siteId: string,
  input: { prompt: string; aspectRatio: ImageAspectRatio; count: number },
) {
  return apiFetch<MediaGeneration>(media(siteId, '', '/generate'), {
    method: 'POST',
    body: { prompt: input.prompt, aspectRatio: input.aspectRatio, count: input.count },
  });
}

/** Poll until `status` is no longer pending. */
export function getMediaGeneration(siteId: string, jobId: string) {
  return apiFetch<MediaGeneration>(`${site(siteId)}/media/generations/${encodeURIComponent(jobId)}`);
}

/** 409 media_in_use while an article uses it (cover or body); 409 generation_in_progress. */
export function deleteMedia(siteId: string, id: string) {
  return apiFetch<void>(media(siteId, id), { method: 'DELETE' });
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
