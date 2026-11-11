import { createLoader, parseAsInteger, parseAsString, parseAsStringLiteral } from 'nuqs/server';

export const ARTICLE_STATUSES = ['draft', 'scheduled', 'published'] as const;

/** The list state lives in the URL (?status=&category=&search=&page=): shareable, survives a reload. */
export const articlesParams = {
  status: parseAsStringLiteral(ARTICLE_STATUSES),
  category: parseAsString.withDefault(''),
  search: parseAsString.withDefault(''),
  page: parseAsInteger.withDefault(1),
};

export const loadArticlesParams = createLoader(articlesParams);
