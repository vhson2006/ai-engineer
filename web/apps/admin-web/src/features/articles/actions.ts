'use server';

import { refresh } from 'next/cache';
import { once } from '@web/core/actions/idempotency';
import { limitAction } from '@web/core/actions/limit';
import { fromApiFailure, isUuid, type ActionFailure, type ActionResult } from '@web/core/actions/result';
import {
  createArticle,
  deleteArticle,
  publishArticle,
  startArticleTranslation,
  unpublishArticle,
  updateArticle,
  type Article,
  type ArticleStatus,
  type ArticleTranslationInput,
  type TranslationJob,
} from '@web/core/api';
import { getSessionUser } from '@web/core/auth/session';
import { LIMITS } from '@web/core/security/rate-limit';
import { parseInput } from '@web/core/validation';
import { isSiteId } from '../sites/site-id';
import { remapFieldErrors } from './field-errors';
import { articleSchema, isStarted, publishSchema, translateSchema, type ArticleValues } from './schema';

/**
 * Article actions of the admin site (web/.claude/rules/forms.md; /new-form). Server Actions are
 * POSTs to the page (CSRF origin check in the proxy); everything in the input is attacker-controlled.
 * Access is the API's: content roles + the caller's site groups (ADR 0028) on the user's token;
 * a site the user doesn't belong to answers 404. The last write wins (ADR 0029).
 */

/** What the editor needs back: the bodies as the API stored them (sanitized, ADR 0031/0033). */
type Saved = { id: string; status: ArticleStatus; bodies: { locale: string; body: string }[] };

const signedOut: ActionFailure = { ok: false, code: 'unauthenticated', message: 'Please sign in again.' };
const badTarget: ActionFailure = { ok: false, code: 'not_found', message: 'This article no longer exists.' };

/** Rate limit + session, the start of every action. */
async function guard(): Promise<ActionFailure | { ok: true; userId: string }> {
  const limited = await limitAction(LIMITS.mutation);
  if (limited) return limited;
  const user = await getSessionUser().catch(() => null);
  return user ? { ok: true, userId: user.id } : signedOut;
}

/**
 * The languages the author started, field by field (never the raw input). `positions[i]` is the
 * form index of the i-th one sent, to put the API's field errors back on the right tab.
 */
function toInput(values: ArticleValues): { translations: ArticleTranslationInput[]; positions: number[] } {
  const positions: number[] = [];
  const translations: ArticleTranslationInput[] = [];
  values.translations.forEach((t, i) => {
    if (!isStarted(t)) return;
    positions.push(i);
    translations.push({
      locale: t.locale,
      title: t.title.trim(),
      slug: t.slug.trim(),
      excerpt: t.excerpt.trim(),
      body: t.body,
      coverAlt: t.coverAlt?.trim() || null,
      seoTitle: t.seoTitle?.trim() || null,
      seoDescription: t.seoDescription?.trim() || null,
    });
  });
  return { translations, positions };
}

const saved = (article: Article): ActionResult<Saved> => ({
  ok: true,
  data: { id: article.id, status: article.status, bodies: (article.translations ?? []).map((t) => ({ locale: t.locale, body: t.body })) },
});

/** A new draft. */
export async function createArticleAction(siteId: unknown, input: unknown): Promise<ActionResult<Saved>> {
  const start = await guard();
  if (!start.ok) return start;
  if (!isSiteId(siteId)) return badTarget;

  const parsed = parseInput(articleSchema, input);
  if (!parsed.ok) return parsed;
  const values = parsed.data;
  if (!values.submissionId) return { ok: false, code: 'invalid_input', message: 'Please reload the page.', errors: [] };

  const { translations, positions } = toInput(values);
  return once(`article:create:${start.userId}:${values.submissionId}`, async () => {
    const result = await createArticle(siteId, {
      categoryId: values.categoryId,
      featured: values.featured,
      coverMediaId: values.coverMediaId ?? null,
      translations,
    });
    if (!result.ok) return remapFieldErrors(fromApiFailure(result), positions);
    refresh();
    return saved(result.data);
  });
}

/** Category, featured, cover and EVERY language (the API replaces them). Same PATCH twice = same result. */
export async function updateArticleAction(siteId: unknown, id: unknown, input: unknown): Promise<ActionResult<Saved>> {
  const start = await guard();
  if (!start.ok) return start;
  if (!isSiteId(siteId) || !isUuid(id)) return badTarget;

  const parsed = parseInput(articleSchema, input);
  if (!parsed.ok) return parsed;
  const values = parsed.data;

  const { translations, positions } = toInput(values);
  const result = await updateArticle(siteId, id, {
    categoryId: values.categoryId,
    featured: values.featured,
    // undefined (an older form) keeps the cover; null removes it.
    coverMediaId: values.coverMediaId,
    translations,
  });
  if (!result.ok) return remapFieldErrors(fromApiFailure(result), positions);
  refresh();
  return saved(result.data);
}

/** Now, or at `at` (ISO). Needs every language of the site (422 missing_translations). */
export async function publishArticleAction(siteId: unknown, id: unknown, input: unknown): Promise<ActionResult<Saved>> {
  const start = await guard();
  if (!start.ok) return start;
  if (!isSiteId(siteId) || !isUuid(id)) return badTarget;

  const parsed = parseInput(publishSchema, input);
  if (!parsed.ok) return parsed;

  const result = await publishArticle(siteId, id, parsed.data.at);
  if (!result.ok) return fromApiFailure(result);
  refresh();
  return saved(result.data);
}

/** Off the site, or the schedule cancelled: a draft again. */
export async function unpublishArticleAction(siteId: unknown, id: unknown): Promise<ActionResult<Saved>> {
  const start = await guard();
  if (!start.ok) return start;
  if (!isSiteId(siteId) || !isUuid(id)) return badTarget;

  const result = await unpublishArticle(siteId, id);
  if (!result.ok) return fromApiFailure(result);
  refresh();
  return saved(result.data);
}

/** For good, every language. Deleting twice: the second answers 404. */
export async function deleteArticleAction(siteId: unknown, id: unknown): Promise<ActionResult<null>> {
  const start = await guard();
  if (!start.ok) return start;
  if (!isSiteId(siteId) || !isUuid(id)) return badTarget;

  const result = await deleteArticle(siteId, id);
  if (!result.ok) return fromApiFailure(result);
  return { ok: true, data: null };
}

/**
 * Machine-translate a DRAFT into another language (ADR 0036): the API answers a pending job at
 * once; the translation arrives as a draft translation a few seconds later (the page polls).
 */
export async function translateArticleAction(siteId: unknown, id: unknown, input: unknown): Promise<ActionResult<TranslationJob>> {
  const start = await guard();
  if (!start.ok) return start;
  if (!isSiteId(siteId) || !isUuid(id)) return badTarget;

  const parsed = parseInput(translateSchema, input);
  if (!parsed.ok) return parsed;
  const { targetLocale, sourceLocale, overwrite } = parsed.data;
  const result = await startArticleTranslation(siteId, id, targetLocale, { sourceLocale, overwrite });
  if (!result.ok) return fromApiFailure(result);
  refresh();
  return { ok: true, data: result.data };
}
