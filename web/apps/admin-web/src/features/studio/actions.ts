'use server';

import { refresh } from 'next/cache';
import { once } from '@web/core/actions/idempotency';
import { guardAction } from '@web/core/actions/guard';
import { fromApiFailure, isUuid, type ActionFailure, type ActionResult } from '@web/core/actions/result';
import {
  createStudioAvatar,
  createStudioProject,
  deleteStudioAvatar,
  deleteStudioProject,
  requestStudioRender,
  requestStudioScript,
  requestStudioSuggest,
  requestStudioVoice,
  saveStudioBrandKit,
  updateStudioAvatar,
  updateStudioProject,
  type StudioInputs,
} from '@web/core/api';
import { LIMITS } from '@web/core/security/rate-limit';
import { parseInput } from '@web/core/validation';
import { isSiteId } from '../sites/site-id';
import {
  avatarSchema,
  brandSchema,
  inputsSchema,
  newProjectSchema,
  scriptSchema,
  splitHashtags,
  splitLines,
  STUDIO_STEPS,
  type StudioStep,
} from './schema';

/**
 * Video studio actions (ADR 0039; web/.claude/rules/forms.md). Everything in the input is
 * attacker-controlled: each value is parsed, then the API input is built field by field. The API
 * checks the role, the site (404 for another site) and that every image, avatar and article is
 * the site's own. Script, voice and render run in other processes: the actions only start them.
 */

const badTarget: ActionFailure = { ok: false, code: 'not_found', message: 'This item no longer exists.' };
const reload: ActionFailure = { ok: false, code: 'invalid_input', message: 'Please reload the page.', errors: [] };

/** Only the filled slots, as plain string maps. */
function slots(values: Record<string, string | undefined>): Record<string, string> {
  return Object.fromEntries(Object.entries(values).flatMap(([key, value]) => (value?.trim() ? [[key, value.trim()]] : [])));
}

/** A new video from a template; answers its id (the editor page). */
export async function createStudioProjectAction(siteId: unknown, input: unknown): Promise<ActionResult<{ id: string }>> {
  const start = await guardAction(LIMITS.mutation);
  if (!start.ok) return start;
  if (!isSiteId(siteId)) return badTarget;
  const parsed = parseInput(newProjectSchema, input);
  if (!parsed.ok) return parsed;
  const values = parsed.data;
  if (!values.submissionId) return reload;
  return once(`studio:create:${start.userId}:${values.submissionId}`, async () => {
    const result = await createStudioProject(siteId, {
      templateId: values.templateId,
      title: values.title,
      language: values.language,
      inputs: { images: {}, avatars: {}, voices: {}, facts: {} },
    });
    if (!result.ok) return fromApiFailure(result);
    refresh();
    return { ok: true, data: { id: result.data.id } };
  });
}

/** Title, brief and the slots. */
export async function saveStudioInputsAction(siteId: unknown, id: unknown, input: unknown): Promise<ActionResult<null>> {
  const start = await guardAction(LIMITS.mutation);
  if (!start.ok) return start;
  if (!isSiteId(siteId) || !isUuid(id)) return badTarget;
  const parsed = parseInput(inputsSchema, input);
  if (!parsed.ok) return parsed;
  const values = parsed.data;
  const inputs: StudioInputs = {
    images: slots(values.images),
    avatars: slots(values.avatars),
    voices: slots(values.voices),
    facts: slots(values.facts),
    narration: values.narration,
  };
  const result = await updateStudioProject(siteId, id, { title: values.title, brief: values.brief || null, inputs });
  if (!result.ok) return fromApiFailure(result);
  refresh();
  return { ok: true, data: null };
}

/** The admin's edit of the script (clears the voice: it has to be spoken again). */
export async function saveStudioScriptAction(siteId: unknown, id: unknown, input: unknown): Promise<ActionResult<null>> {
  const start = await guardAction(LIMITS.mutation);
  if (!start.ok) return start;
  if (!isSiteId(siteId) || !isUuid(id)) return badTarget;
  const parsed = parseInput(scriptSchema, input);
  if (!parsed.ok) return parsed;
  const values = parsed.data;
  const result = await updateStudioProject(siteId, id, {
    script: {
      hooks: values.hooks.map((hook) => hook.trim()).filter(Boolean),
      scenes: values.scenes.map((scene) => ({ id: scene.id, voice: scene.voice, onScreen: scene.onScreen })),
      caption: values.caption,
      hashtags: splitHashtags(values.hashtags),
    },
  });
  if (!result.ok) return fromApiFailure(result);
  refresh();
  return { ok: true, data: null };
}

/** Starts a step (AI script, voice, render). Starting it twice answers 409 busy: harmless. */
export async function startStudioStepAction(siteId: unknown, id: unknown, step: unknown): Promise<ActionResult<null>> {
  const start = await guardAction(LIMITS.mutation);
  if (!start.ok) return start;
  if (!isSiteId(siteId) || !isUuid(id) || !STUDIO_STEPS.includes(step as StudioStep)) return badTarget;
  const call = {
    suggest: requestStudioSuggest,
    script: requestStudioScript,
    voice: requestStudioVoice,
    render: requestStudioRender,
  }[step as StudioStep];
  const result = await call(siteId, id);
  if (!result.ok) return fromApiFailure(result);
  refresh();
  return { ok: true, data: null };
}

export async function deleteStudioProjectAction(siteId: unknown, id: unknown): Promise<ActionResult<null>> {
  const start = await guardAction(LIMITS.mutation);
  if (!start.ok) return start;
  if (!isSiteId(siteId) || !isUuid(id)) return badTarget;
  const result = await deleteStudioProject(siteId, id);
  if (!result.ok) return fromApiFailure(result);
  refresh();
  return { ok: true, data: null };
}

export async function saveStudioBrandAction(siteId: unknown, input: unknown): Promise<ActionResult<null>> {
  const start = await guardAction(LIMITS.mutation);
  if (!start.ok) return start;
  if (!isSiteId(siteId)) return badTarget;
  const parsed = parseInput(brandSchema, input);
  if (!parsed.ok) return parsed;
  const v = parsed.data;
  const result = await saveStudioBrandKit(siteId, {
    brandName: v.brandName,
    tagline: v.tagline || null,
    phone: v.phone || null,
    callToAction: v.callToAction || null,
    tone: v.tone || null,
    footerNote: v.footerNote || null,
    website: v.website || null,
    address: v.address || null,
    hours: v.hours || null,
    prices: v.prices || null,
    bannedPhrases: splitLines(v.bannedPhrases),
    primaryColor: v.primaryColor,
    accentColor: v.accentColor,
    logoMediaId: v.logoMediaId || null,
  });
  if (!result.ok) return fromApiFailure(result);
  refresh();
  return { ok: true, data: null };
}

export async function createStudioAvatarAction(siteId: unknown, input: unknown): Promise<ActionResult<null>> {
  const start = await guardAction(LIMITS.mutation);
  if (!start.ok) return start;
  if (!isSiteId(siteId)) return badTarget;
  const parsed = parseInput(avatarSchema, input);
  if (!parsed.ok) return parsed;
  const v = parsed.data;
  if (!v.submissionId) return reload;
  return once(`studio:avatar:${start.userId}:${v.submissionId}`, async () => {
    const result = await createStudioAvatar(siteId, { name: v.name, mediaId: v.mediaId, voice: v.voice, consentNote: v.consentNote });
    if (!result.ok) return fromApiFailure(result);
    refresh();
    return { ok: true, data: null };
  });
}

export async function updateStudioAvatarAction(siteId: unknown, id: unknown, input: unknown): Promise<ActionResult<null>> {
  const start = await guardAction(LIMITS.mutation);
  if (!start.ok) return start;
  if (!isSiteId(siteId) || !isUuid(id)) return badTarget;
  const parsed = parseInput(avatarSchema, input);
  if (!parsed.ok) return parsed;
  const v = parsed.data;
  const result = await updateStudioAvatar(siteId, id, { name: v.name, mediaId: v.mediaId, voice: v.voice, consentNote: v.consentNote });
  if (!result.ok) return fromApiFailure(result);
  refresh();
  return { ok: true, data: null };
}

export async function deleteStudioAvatarAction(siteId: unknown, id: unknown): Promise<ActionResult<null>> {
  const start = await guardAction(LIMITS.mutation);
  if (!start.ok) return start;
  if (!isSiteId(siteId) || !isUuid(id)) return badTarget;
  const result = await deleteStudioAvatar(siteId, id);
  if (!result.ok) return fromApiFailure(result);
  refresh();
  return { ok: true, data: null };
}
