'use server';

import { refresh } from 'next/cache';
import { once } from '@web/core/actions/idempotency';
import { guardAction } from '@web/core/actions/guard';
import { fromApiFailure, isUuid, type ActionFailure, type ActionResult } from '@web/core/actions/result';
import { createCategory, deleteCategory, updateCategory, type CategoryInput } from '@web/core/api';
import { LIMITS } from '@web/core/security/rate-limit';
import { parseInput } from '@web/core/validation';
import { isSiteId } from '../sites/site-id';
import { categorySchema, type CategoryValues } from './schema';

/**
 * Topics of a site (forms.md; /new-form). The API checks content:write and the site group of the
 * caller (ADR 0028); the languages of the site are checked there too (422 unsupported_locale).
 */

const badTarget: ActionFailure = { ok: false, code: 'not_found', message: 'This topic no longer exists.' };

/** Field by field, never the raw input. */
function toInput(values: CategoryValues): CategoryInput {
  return {
    key: values.key.trim(),
    position: values.position,
    translations: values.translations.map((t) => ({ locale: t.locale, name: t.name.trim(), slug: t.slug.trim() })),
  };
}

export async function createCategoryAction(siteId: unknown, input: unknown): Promise<ActionResult<{ id: string }>> {
  const start = await guardAction(LIMITS.mutation);
  if (!start.ok) return start;
  if (!isSiteId(siteId)) return badTarget;
  const parsed = parseInput(categorySchema, input);
  if (!parsed.ok) return parsed;
  const values = parsed.data;
  if (!values.submissionId) return { ok: false, code: 'invalid_input', message: 'Please reload the page.', errors: [] };

  return once(`category:create:${start.userId}:${values.submissionId}`, async () => {
    const result = await createCategory(siteId, toInput(values));
    if (!result.ok) return fromApiFailure(result);
    refresh();
    return { ok: true, data: { id: result.data.id } };
  });
}

export async function updateCategoryAction(siteId: unknown, id: unknown, input: unknown): Promise<ActionResult<{ id: string }>> {
  const start = await guardAction(LIMITS.mutation);
  if (!start.ok) return start;
  if (!isSiteId(siteId) || !isUuid(id)) return badTarget;
  const parsed = parseInput(categorySchema, input);
  if (!parsed.ok) return parsed;

  const result = await updateCategory(siteId, id, toInput(parsed.data));
  if (!result.ok) return fromApiFailure(result);
  refresh();
  return { ok: true, data: { id: result.data.id } };
}

export async function deleteCategoryAction(siteId: unknown, id: unknown): Promise<ActionResult<null>> {
  const start = await guardAction(LIMITS.mutation);
  if (!start.ok) return start;
  if (!isSiteId(siteId) || !isUuid(id)) return badTarget;

  const result = await deleteCategory(siteId, id);
  if (!result.ok) return fromApiFailure(result);
  refresh();
  return { ok: true, data: null };
}
