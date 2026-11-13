import { ARTICLE_LENGTHS, ARTICLE_MAX_IMAGES, ARTICLE_MAX_OUTLINE, ARTICLE_PROMPT_MAX_LENGTH } from '@web/core/api/ai-article-limits';
import { z } from 'zod';

/*
 * Articles written by AI (ADR 0041). These mirror the DTOs of libs/common (article-drafts.ts);
 * the API checks everything again (the topic is the site's own, the job is the site's own).
 */

const submissionId = z.preprocess((v) => (v === '' ? undefined : v), z.uuid('invalid').optional());

export const newAiArticleSchema = z.object({
  submissionId,
  categoryId: z.uuid('required'),
  locale: z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/, 'invalid'),
  idea: z.string('required').trim().min(3, 'tooShort').max(500, 'tooLong'),
  audience: z.string().trim().max(200, 'tooLong'),
  keyword: z.string().trim().max(80, 'tooLong'),
  length: z.enum(ARTICLE_LENGTHS, 'invalid'),
  images: z.coerce.number().int().min(0, 'invalid').max(ARTICLE_MAX_IMAGES, 'invalid'),
});
export type NewAiArticleValues = z.input<typeof newAiArticleSchema>;

/** The brief as edited; the outline is one heading per line. */
export const briefSchema = z.object({
  prompt: z.string('required').trim().min(50, 'tooShort').max(ARTICLE_PROMPT_MAX_LENGTH, 'tooLong'),
  outline: z
    .string('required')
    .transform((text) =>
      text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.string().max(200, 'tooLong')).min(1, 'required').max(ARTICLE_MAX_OUTLINE, 'tooLong')),
});
export type BriefValues = z.input<typeof briefSchema>;
export type BriefOutput = z.output<typeof briefSchema>;
