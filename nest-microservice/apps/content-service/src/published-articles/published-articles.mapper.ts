import { PublishedArticleSummary } from '@app/common';
import type {
  Article,
  ArticleTranslation,
  Category,
  CategoryTranslation,
  Prisma,
} from '../generated/prisma/client';

export type LiveRow = Article & {
  translations: ArticleTranslation[];
  category: Category & { translations: CategoryTranslation[] };
};

/** What a site needs of a live article and its category, in ONE language. */
export function liveInclude(locale: string) {
  return {
    translations: { where: { locale } },
    category: { include: { translations: { where: { locale } } } },
  } satisfies Prisma.ArticleInclude;
}

export function toSummary(row: LiveRow, locale: string): PublishedArticleSummary {
  const t = row.translations.find((tr) => tr.locale === locale)!; // filtered by the query
  const category = row.category.translations[0];
  return {
    id: row.id,
    locale,
    slug: t.slug,
    title: t.title,
    excerpt: t.excerpt,
    coverAlt: t.coverAlt,
    readingMinutes: t.readingMinutes,
    featured: row.featured,
    publishedAt: row.publishedAt!.toISOString(), // published ⇒ set (CHECK constraint)
    category: {
      key: row.category.key,
      // A category may lack this language (categories don't need every language): fall back to the key.
      slug: category?.slug ?? row.category.key,
      name: category?.name ?? row.category.key,
    },
  };
}
