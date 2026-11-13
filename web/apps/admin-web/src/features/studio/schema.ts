import { z } from 'zod';

/*
 * Video studio forms (ADR 0039). They mirror the DTOs of libs/common (studio.dto.ts); the API checks
 * everything again, including that every image, avatar and article belongs to the site.
 */

const slotId = z.string().regex(/^[a-z][a-z0-9-]{0,39}$/, 'invalid');
const optionalUuid = z.union([z.uuid('invalid'), z.literal('')]);
const submissionId = z.preprocess((v) => (v === '' ? undefined : v), z.uuid('invalid').optional());

export const newProjectSchema = z.object({
  submissionId,
  templateId: slotId,
  title: z.string('required').trim().min(1, 'required').max(120, 'tooLong'),
  language: z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/, 'invalid'),
});
export type NewProjectValues = z.input<typeof newProjectSchema>;

/** Title, brief and every slot (empty string = not chosen). */
export const inputsSchema = z.object({
  title: z.string('required').trim().min(1, 'required').max(120, 'tooLong'),
  brief: z.string().trim().max(1000, 'tooLong'),
  images: z.record(slotId, optionalUuid),
  avatars: z.record(slotId, optionalUuid),
  voices: z.record(slotId, z.string().max(40, 'tooLong')),
  facts: z.record(slotId, z.string().max(12_000, 'tooLong')),
});
export type InputsValues = z.input<typeof inputsSchema>;

/** The script as edited (hashtags: one string, separated by spaces). */
export const scriptSchema = z.object({
  hooks: z.array(z.string().max(600, 'tooLong')).max(3),
  scenes: z
    .array(
      z.object({
        id: slotId,
        voice: z.string('required').trim().min(1, 'required').max(600, 'tooLong'),
        onScreen: z.string().trim().max(200, 'tooLong'),
      }),
    )
    .min(1)
    .max(12),
  caption: z.string().trim().max(2200, 'tooLong'),
  hashtags: z.string().max(1000, 'tooLong'),
});
export type ScriptValues = z.input<typeof scriptSchema>;

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'invalidColor');

/** The brand kit (banned phrases: one per line). */
export const brandSchema = z.object({
  brandName: z.string('required').trim().min(1, 'required').max(100, 'tooLong'),
  tagline: z.string().trim().max(200, 'tooLong'),
  phone: z.string().trim().max(40, 'tooLong'),
  callToAction: z.string().trim().max(200, 'tooLong'),
  tone: z.string().trim().max(300, 'tooLong'),
  footerNote: z.string().trim().max(200, 'tooLong'),
  bannedPhrases: z.string().max(5000, 'tooLong'),
  primaryColor: hex,
  accentColor: hex,
  logoMediaId: optionalUuid,
});
export type BrandValues = z.input<typeof brandSchema>;

export const avatarSchema = z.object({
  submissionId,
  name: z.string('required').trim().min(1, 'required').max(80, 'tooLong'),
  mediaId: z.uuid('required'),
  voice: z.string('required').min(1, 'required').max(40, 'tooLong'),
  consentNote: z.string('required').trim().min(10, 'tooShort').max(500, 'tooLong'),
});
export type AvatarValues = z.input<typeof avatarSchema>;

export const STUDIO_STEPS = ['script', 'voice', 'render'] as const;
export type StudioStep = (typeof STUDIO_STEPS)[number];

/** "#giat say  #sfaster" → ["#giatsay"…]: the words, each with one leading #. */
export function splitHashtags(text: string): string[] {
  return text
    .split(/[\s,]+/)
    .map((tag) => tag.replace(/^#+/, '').trim())
    .filter(Boolean)
    .slice(0, 15)
    .map((tag) => `#${tag.slice(0, 59)}`);
}

/** One phrase per line, trimmed, no duplicates or empty lines. */
export function splitLines(text: string): string[] {
  return [...new Set(text.split('\n').map((line) => line.trim()).filter(Boolean))].slice(0, 50).map((line) => line.slice(0, 100));
}
