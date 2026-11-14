/**
 * The content snapshot (ADR 0044): what `export-content.ts` writes and `seed-content.ts` reads.
 * One folder per site under `apps/content-service/seed/content/<siteId>/`:
 *   content.json             the site, its topics, its articles (every language, status, dates,
 *                            old slugs) and the media rows they use
 *   media/<id>/<width>.<ext> every stored size of those images (the bucket's own bytes)
 * Ids are kept, so a restored image has the same storage key and the bodies stay valid.
 */
import { join } from 'node:path';

export const SNAPSHOT_DIR = join(__dirname, '..', 'seed', 'content');

/** Stands for the site's media prefix (MediaUrls.sitePrefix) in a body: `{{media}}/<id>/640.webp`. */
export const MEDIA_PLACEHOLDER = '{{media}}/';

export interface SnapshotCategory {
  key: string;
  position: number;
  translations: { locale: string; name: string; slug: string }[];
}

export interface SnapshotMedia {
  id: string;
  source: string;
  prompt: string | null;
  filename: string;
  contentType: string;
  width: number;
  height: number;
  variants: { width: number; height: number; size: number }[];
  createdAt: string;
}

export interface SnapshotArticle {
  id: string;
  categoryKey: string;
  /** draft | scheduled | published: restored as it was (an unpublished article stays a draft). */
  status: string;
  featured: boolean;
  coverMediaId: string | null;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  translations: {
    locale: string;
    title: string;
    slug: string;
    excerpt: string;
    coverAlt: string | null;
    /** Sanitized HTML with MEDIA_PLACEHOLDER instead of the media prefix. */
    body: string;
    readingMinutes: number;
    seoTitle: string | null;
    seoDescription: string | null;
  }[];
  /** Old slugs that answer 301 (article_slug_redirects). */
  redirects: { locale: string; slug: string }[];
}

export interface SiteSnapshot {
  site: { id: string; name: string; locales: string[]; defaultLocale: string };
  categories: SnapshotCategory[];
  media: SnapshotMedia[];
  articles: SnapshotArticle[];
}

export const contentFile = (siteId: string) => join(SNAPSHOT_DIR, siteId, 'content.json');
export const mediaDir = (siteId: string) => join(SNAPSHOT_DIR, siteId, 'media');
