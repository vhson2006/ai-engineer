import { AuthUser, CONTENT_ROLES } from '@app/common';

/** Rows and callers shared by content-service tests: the site "nails" (en + vi) and one article. */

const { READ, WRITE, PUBLISH, ADMIN } = CONTENT_ROLES;

export const ARTICLE_ID = '8f14e45f-ceea-4e7a-9b1e-1a2b3c4d5e6f';
export const CATEGORY_ID = '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed';
export const CREATED = new Date('2026-11-10T00:00:00Z');

export const site = {
  id: 'nails',
  name: 'Envy Nails Spa',
  locales: ['en', 'vi'],
  defaultLocale: 'en',
  createdAt: CREATED,
  updatedAt: CREATED,
};

/** Callers as AuthGuard builds them: roles of content-api, groups from the token. */
export const users = {
  writer: { id: 'u-writer', roles: [READ, WRITE], groups: ['/sites/nails'] },
  publisher: { id: 'u-pub', roles: [READ, WRITE, PUBLISH], groups: ['/sites/nails'] },
  outsider: { id: 'u-wine', roles: [READ, WRITE, PUBLISH], groups: ['/sites/wine'] },
  admin: { id: 'u-admin', roles: [READ, WRITE, PUBLISH, ADMIN], groups: [] },
} satisfies Record<string, AuthUser>;

/** A translation row of the article. */
export function translationRow(locale: string, slug = `slug-${locale}`) {
  return {
    articleId: ARTICLE_ID,
    siteId: 'nails',
    locale,
    title: `Title ${locale}`,
    slug,
    excerpt: 'Excerpt',
    coverAlt: null,
    body: '<p>Hello</p>',
    readingMinutes: 1,
    seoTitle: null,
    seoDescription: null,
  };
}

/** The article row with its translations (a draft in both languages by default). */
export function articleRow(overrides: Record<string, unknown> = {}) {
  return {
    id: ARTICLE_ID,
    siteId: 'nails',
    categoryId: CATEGORY_ID,
    status: 'draft',
    featured: false,
    scheduledAt: null,
    publishedAt: null,
    createdBy: 'u-writer',
    updatedBy: 'u-writer',
    createdAt: CREATED,
    updatedAt: CREATED,
    translations: [translationRow('en'), translationRow('vi')],
    ...overrides,
  };
}

/** One language as a client sends it (ArticleTranslationDto). */
export function translationInput(locale: string, slug = `slug-${locale}`) {
  return {
    locale,
    title: `Title ${locale}`,
    slug,
    excerpt: 'Excerpt',
    body: '<p>Hello</p>',
  };
}
