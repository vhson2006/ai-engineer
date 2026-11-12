import { z } from 'zod';

/**
 * The article form, validated with the SAME schema in the browser and in the Server Actions.
 * Mirrors ArticleTranslationDto / CreateArticleDto (nest-microservice libs/common): title ≤ 200,
 * slug ≤ 150 (lowercase, digits, dashes), excerpt ≤ 500, body = HTML ≤ 200 000 (sanitized by the
 * API, ADR 0031), coverAlt ≤ 300, seoTitle ≤ 200, seoDescription ≤ 300.
 *
 * The form has one entry per language of the site. A draft may leave languages EMPTY (they are
 * not sent); a language with anything in it must be complete. At least one language.
 */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LOCALE_PATTERN = /^[a-z]{2}(-[A-Z]{2})?$/;
export const BODY_MAX_LENGTH = 200_000;

const optional = (max: number) => z.string().trim().max(max, 'tooLong').optional();

export const translationSchema = z.object({
  locale: z.string().regex(LOCALE_PATTERN, 'invalid'),
  title: z.string().trim().max(200, 'tooLong'),
  slug: z.string().trim().max(150, 'tooLong'),
  excerpt: z.string().trim().max(500, 'tooLong'),
  body: z.string().max(BODY_MAX_LENGTH, 'tooLong'),
  coverAlt: optional(300),
  seoTitle: optional(200),
  seoDescription: optional(300),
});

export type TranslationValues = z.input<typeof translationSchema>;

/** Visible text of editor HTML (for "is it empty?" only; the API sanitizes the HTML). */
export function bodyText(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

/** A language the author started: anything typed in its main fields. */
export function isStarted(t: Pick<TranslationValues, 'title' | 'slug' | 'excerpt' | 'body'>): boolean {
  return [t.title, t.slug, t.excerpt].some((v) => v.trim() !== '') || bodyText(t.body) !== '';
}

export const articleSchema = z
  .object({
    /** Create only: one per form instance, a double submit returns the first result (once()). */
    submissionId: z.preprocess((v) => (v === '' ? undefined : v), z.uuid('invalid').optional()),
    categoryId: z.uuid('required'),
    featured: z.boolean(),
    /** An image of the site's media library (ADR 0034); null: no cover. The API checks the site. */
    coverMediaId: z.preprocess((v) => (v === '' ? null : v), z.uuid('invalid').nullable().optional()),
    translations: z.array(translationSchema).min(1, 'atLeastOneLanguage').max(10, 'invalid'),
  })
  .superRefine((value, ctx) => {
    const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: 'custom', path, message });
    const seen = new Set<string>();
    let started = 0;
    value.translations.forEach((t, i) => {
      if (seen.has(t.locale)) issue(['translations', i, 'locale'], 'invalid');
      seen.add(t.locale);
      if (!isStarted(t)) return;
      started += 1;
      if (!t.title.trim()) issue(['translations', i, 'title'], 'required');
      if (!t.excerpt.trim()) issue(['translations', i, 'excerpt'], 'required');
      if (!t.slug.trim()) issue(['translations', i, 'slug'], 'required');
      else if (!SLUG_PATTERN.test(t.slug.trim())) issue(['translations', i, 'slug'], 'invalidSlug');
      if (!bodyText(t.body)) issue(['translations', i, 'body'], 'required');
    });
    if (started === 0) issue(['translations'], 'atLeastOneLanguage');
  });

export type ArticleValues = z.input<typeof articleSchema>;

/** Publish now (no `at`) or at a date: ISO date-time, at least a minute ahead (the API checks too). */
export const publishSchema = z.object({
  at: z.iso.datetime({ offset: true, message: 'invalidDate' }).optional(),
});

/** Machine translation of a draft (ADR 0036): from one language of the site into another. */
export const translateSchema = z
  .object({
    targetLocale: z.string().regex(LOCALE_PATTERN, 'invalid'),
    sourceLocale: z.string().regex(LOCALE_PATTERN, 'invalid'),
    overwrite: z.boolean().optional(),
  })
  .refine((v) => v.targetLocale !== v.sourceLocale, { message: 'invalid', path: ['targetLocale'] });
