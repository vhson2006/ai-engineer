import type { ArticleDraftStatus, ArticleLength } from './ai-article-limits';
import { apiFetch } from './fetch';

/*
 * Articles written by AI (ADR 0041): /api/content/sites/{siteId}/article-drafts. Shapes mirror
 * nest-microservice libs/common/src/contracts/content/article-drafts.ts: change them together.
 */

export {
  ARTICLE_DRAFT_BUSY,
  ARTICLE_DRAFT_STATUSES,
  ARTICLE_LENGTHS,
  ARTICLE_MAX_IMAGES,
  ARTICLE_MAX_OUTLINE,
  ARTICLE_PROMPT_MAX_LENGTH,
  type ArticleDraftStatus,
  type ArticleLength,
} from './ai-article-limits';

export interface ArticleDraft {
  id: string;
  siteId: string;
  categoryId: string;
  locale: string;
  idea: { topic: string; idea: string; audience?: string; keyword?: string; length: ArticleLength; images: number };
  status: ArticleDraftStatus;
  /** The brief (prompted on), as written by AI then confirmed. */
  prompt: string | null;
  outline: string[];
  /** completed: the draft article. */
  articleId: string | null;
  /** Numbers to check, and skipped steps (images_quota, images_failed). */
  warnings: string[];
  error: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface ArticleDraftInput {
  categoryId: string;
  locale: string;
  idea: string;
  audience?: string;
  keyword?: string;
  length: ArticleLength;
  images: number;
}

const drafts = (siteId: string) => `/api/content/sites/${encodeURIComponent(siteId)}/article-drafts`;

/** 201: the job, `prompting` (the brief comes first). Not retried: wrap in `once()`. */
export function createArticleDraft(siteId: string, input: ArticleDraftInput) {
  return apiFetch<ArticleDraft>(drafts(siteId), { method: 'POST', body: input });
}

export function getArticleDraft(siteId: string, id: string) {
  return apiFetch<ArticleDraft>(`${drafts(siteId)}/${encodeURIComponent(id)}`);
}

/** 202: the confirmed brief is written as a draft article (poll the job). */
export function writeArticleDraft(siteId: string, id: string, input: { prompt: string; outline: string[] }) {
  return apiFetch<ArticleDraft>(`${drafts(siteId)}/${encodeURIComponent(id)}/write`, { method: 'POST', body: input });
}
