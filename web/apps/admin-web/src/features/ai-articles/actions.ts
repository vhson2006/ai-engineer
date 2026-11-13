'use server';

import { refresh } from 'next/cache';
import { once } from '@web/core/actions/idempotency';
import { guardAction } from '@web/core/actions/guard';
import { fromApiFailure, isUuid, type ActionFailure, type ActionResult } from '@web/core/actions/result';
import { createArticleDraft, writeArticleDraft } from '@web/core/api';
import { LIMITS } from '@web/core/security/rate-limit';
import { parseInput } from '@web/core/validation';
import { isSiteId } from '../sites/site-id';
import { briefSchema, newAiArticleSchema } from './schema';

/**
 * Articles written by AI (ADR 0041; web/.claude/rules/forms.md). Every input is
 * attacker-controlled: parsed, then the API input is built field by field. The AI steps run in
 * other processes: these actions only start them.
 */

const badTarget: ActionFailure = { ok: false, code: 'not_found', message: 'This item no longer exists.' };
const reload: ActionFailure = { ok: false, code: 'invalid_input', message: 'Please reload the page.', errors: [] };

/** The idea: the AI writes a brief and an outline first. Answers the job's id (its page). */
export async function startAiArticleAction(siteId: unknown, input: unknown): Promise<ActionResult<{ id: string }>> {
  const start = await guardAction(LIMITS.mutation);
  if (!start.ok) return start;
  if (!isSiteId(siteId)) return badTarget;
  const parsed = parseInput(newAiArticleSchema, input);
  if (!parsed.ok) return parsed;
  const v = parsed.data;
  if (!v.submissionId) return reload;
  return once(`ai-article:create:${start.userId}:${v.submissionId}`, async () => {
    const result = await createArticleDraft(siteId, {
      categoryId: v.categoryId,
      locale: v.locale,
      idea: v.idea,
      ...(v.audience && { audience: v.audience }),
      ...(v.keyword && { keyword: v.keyword }),
      length: v.length,
      images: v.images,
    });
    if (!result.ok) return fromApiFailure(result);
    return { ok: true, data: { id: result.data.id } };
  });
}

/** The brief as edited: the article is written (202; the page polls). */
export async function writeAiArticleAction(siteId: unknown, id: unknown, input: unknown): Promise<ActionResult<null>> {
  const start = await guardAction(LIMITS.mutation);
  if (!start.ok) return start;
  if (!isSiteId(siteId) || !isUuid(id)) return badTarget;
  const parsed = parseInput(briefSchema, input);
  if (!parsed.ok) return parsed;
  const result = await writeArticleDraft(siteId, id, { prompt: parsed.data.prompt, outline: parsed.data.outline });
  if (!result.ok) return fromApiFailure(result);
  refresh();
  return { ok: true, data: null };
}
