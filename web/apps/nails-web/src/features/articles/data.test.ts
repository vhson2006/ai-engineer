import { describe, expect, it } from 'vitest';
import source from '@/content/articles.json';
import { LOCALE_CODES } from '@/i18n/locales';
import { CATEGORIES, CATEGORY_SLUGS, IMAGE_KEYS, categoryFromSlug, getArticle, listArticles } from './data';

describe('articles (sample JSON, same shape as the future content API)', () => {
  it('has unique, URL-safe slugs', () => {
    const slugs = source.items.map((item) => item.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  });

  it('uses known topics, cover images and ISO dates', () => {
    for (const item of source.items) {
      expect(CATEGORIES, item.slug).toContain(item.category);
      expect(IMAGE_KEYS, item.slug).toContain(item.cover);
      expect(item.publishedAt, item.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('is translated into every language, with non-empty text and known body images', () => {
    for (const item of source.items) {
      for (const locale of LOCALE_CODES) {
        const text = item.i18n[locale];
        expect(text, `${item.slug} ${locale}`).toBeDefined();
        expect(text.title.trim()).not.toBe('');
        expect(text.excerpt.trim()).not.toBe('');
        expect(text.body.length).toBeGreaterThan(0);
        for (const block of text.body) {
          if ('image' in block) expect(IMAGE_KEYS).toContain(block.image);
        }
      }
    }
  });

  it('lists newest first, filters by topic and finds one article', async () => {
    const all = await listArticles('en');
    expect(all.map((article) => article.publishedAt)).toEqual([...all.map((article) => article.publishedAt)].sort().reverse());
    const care = await listArticles('vi', 'care');
    expect(care.length).toBeGreaterThan(0);
    expect(care.every((article) => article.category === 'care')).toBe(true);
    expect((await getArticle('vi', all[0].slug))?.title).toBeTruthy();
    expect(await getArticle('en', 'does-not-exist')).toBeNull();
  });

  it('maps topic URL segments both ways', () => {
    for (const category of CATEGORIES) expect(categoryFromSlug(CATEGORY_SLUGS[category])).toBe(category);
    expect(categoryFromSlug('nope')).toBeUndefined();
  });
});
