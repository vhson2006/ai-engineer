import { PublishedArticleSummary } from '@app/common';
import type {
  Article,
  ArticleTranslation,
  Category,
  CategoryTranslation,
  Media,
  Prisma,
} from '../generated/prisma/client';
import type { MediaUrls } from '../media/media-urls';

export type LiveRow = Article & {
  translations: ArticleTranslation[];
  coverMedia: Media | null;
  category: Category & { translations: CategoryTranslation[] };
};

/** What a site needs of a live article and its category, in ONE language. */
export function liveInclude(locale: string) {
  return {
    translations: { where: { locale } },
    coverMedia: true,
    category: { include: { translations: { where: { locale } } } },
  } satisfies Prisma.ArticleInclude;
}

export function toSummary(
  row: LiveRow,
  locale: string,
  urls: Pick<MediaUrls, 'image'>,
): PublishedArticleSummary {
  const t = row.translations.find((tr) => tr.locale === locale)!; // filtered by the query
  const category = row.category.translations[0];
  return {
    id: row.id,
    locale,
    slug: t.slug,
    title: t.title,
    excerpt: t.excerpt,
    coverAlt: t.coverAlt,
    cover: row.coverMedia ? urls.image(row.coverMedia) : null,
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
