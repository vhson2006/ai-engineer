'use server';

import { refresh } from 'next/cache';
import { guardAction } from '@web/core/actions/guard';
import { fromApiFailure, isUuid, type ActionFailure, type ActionResult } from '@web/core/actions/result';
import {
  completeMedia,
  createMediaUpload,
  deleteMedia,
  generateMedia,
  getMediaGeneration,
  type Media,
  type MediaGeneration,
  type MediaUpload,
} from '@web/core/api';
import { LIMITS } from '@web/core/security/rate-limit';
import { parseInput } from '@web/core/validation';
import { isSiteId } from '../sites/site-id';
import { mediaGenerateSchema, mediaUploadSchema } from './schema';

/**
 * Media library actions (ADR 0034; web/.claude/rules/forms.md, files.md). The image bytes never
 * come here: the browser optimizes them and PUTs them to storage (createMediaUploader). These only
 * declare the upload, confirm it and delete images, with the user's token: the API checks the
 * role and the site again (404 for a site that isn't the user's). AI images (ADR 0037) are made
 * and stored by ai-service: these only ask for them and poll.
 */

const badTarget: ActionFailure = {
  ok: false,
  code: 'not_found',
  message: 'This image no longer exists.',
};

/** Step 2 of an upload: the optimized sizes → one presigned PUT per size. */
export async function declareMediaUploadAction(siteId: unknown, input: unknown): Promise<ActionResult<MediaUpload>> {
  const start = await guardAction(LIMITS.upload);
  if (!start.ok) return start;
  if (!isSiteId(siteId)) return badTarget;

  const parsed = parseInput(mediaUploadSchema, input);
  if (!parsed.ok) return parsed;
  const { filename, contentType, variants } = parsed.data;
  // Built field by field: nothing else from the input reaches the API.
  const result = await createMediaUpload(siteId, {
    filename,
    contentType,
    variants: variants.map(({ width, height, size }) => ({
      width,
      height,
      size,
    })),
  });
  return result.ok ? { ok: true, data: result.data } : fromApiFailure(result);
}

/** Step 4: the API checks every stored size; the image becomes ready. Idempotent. */
export async function completeMediaAction(siteId: unknown, id: unknown): Promise<ActionResult<Media>> {
  const start = await guardAction(LIMITS.upload);
  if (!start.ok) return start;
  if (!isSiteId(siteId) || !isUuid(id)) return badTarget;

  const result = await completeMedia(siteId, id);
  if (!result.ok) return fromApiFailure(result);
  refresh();
  return { ok: true, data: result.data };
}

/** 409 media_in_use while an article uses it (cover or body). */
export async function deleteMediaAction(siteId: unknown, id: unknown): Promise<ActionResult<null>> {
  const start = await guardAction(LIMITS.mutation);
  if (!start.ok) return start;
  if (!isSiteId(siteId) || !isUuid(id)) return badTarget;

  const result = await deleteMedia(siteId, id);
  if (!result.ok) return fromApiFailure(result);
  refresh();
  return { ok: true, data: null };
}

/** Generate 1-4 images from a description (paid, counted in the site's monthly quota). */
export async function generateMediaAction(siteId: unknown, input: unknown): Promise<ActionResult<MediaGeneration>> {
  const start = await guardAction(LIMITS.upload);
  if (!start.ok) return start;
  if (!isSiteId(siteId)) return badTarget;

  const parsed = parseInput(mediaGenerateSchema, input);
  if (!parsed.ok) return parsed;
  const { prompt, aspectRatio, count } = parsed.data;
  const result = await generateMedia(siteId, { prompt, aspectRatio, count });
  return result.ok ? { ok: true, data: result.data } : fromApiFailure(result);
}

/** Polled every few seconds while a generation is pending: read only, not rate limited here. */
export async function getMediaGenerationAction(siteId: unknown, jobId: unknown): Promise<ActionResult<MediaGeneration>> {
  const start = await guardAction(null);
  if (!start.ok) return start;
  if (!isSiteId(siteId) || !isUuid(jobId)) return badTarget;

  const result = await getMediaGeneration(siteId, jobId);
  return result.ok ? { ok: true, data: result.data } : fromApiFailure(result);
}
