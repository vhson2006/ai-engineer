import { z } from 'zod';
import { SLUG_PATTERN } from '../articles/schema';

/**
 * A topic (CreateCategoryDto in libs/common): key (slug ≤ 50, never changes in URLs of other
 * data), position 0–1000, and a name (≤ 80) + slug (≤ 100) in EVERY language of the site.
 */
export const categorySchema = z.object({
  submissionId: z.preprocess((v) => (v === '' ? undefined : v), z.uuid('invalid').optional()),
  key: z.string('required').trim().min(1, 'required').max(50, 'tooLong').regex(SLUG_PATTERN, 'invalidSlug'),
  position: z.number('invalid').int('invalid').min(0, 'tooSmall').max(1000, 'tooBig'),
  translations: z
    .array(
      z.object({
        locale: z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/, 'invalid'),
        name: z.string('required').trim().min(1, 'required').max(80, 'tooLong'),
        slug: z.string('required').trim().min(1, 'required').max(100, 'tooLong').regex(SLUG_PATTERN, 'invalidSlug'),
      }),
    )
    .min(1, 'atLeastOneLanguage')
    .max(10, 'invalid'),
});

export type CategoryValues = z.input<typeof categorySchema>;
