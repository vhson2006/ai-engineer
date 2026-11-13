/**
 * Limits of articles written by AI (ADR 0041), mirroring libs/common article.events.ts. A module
 * with no imports: client components and zod schemas use it (`@web/core/api` pulls server-only
 * code).
 */
export const ARTICLE_LENGTHS = ['short', 'medium', 'long'] as const;
export type ArticleLength = (typeof ARTICLE_LENGTHS)[number];
export const ARTICLE_MAX_IMAGES = 3;
export const ARTICLE_MAX_OUTLINE = 12;
export const ARTICLE_PROMPT_MAX_LENGTH = 6000;

export const ARTICLE_DRAFT_STATUSES = ['prompting', 'prompted', 'writing', 'illustrating', 'completed', 'failed'] as const;
export type ArticleDraftStatus = (typeof ARTICLE_DRAFT_STATUSES)[number];
/** An AI step runs in another process: the page polls until it is done. */
export const ARTICLE_DRAFT_BUSY: readonly ArticleDraftStatus[] = ['prompting', 'writing', 'illustrating'];
