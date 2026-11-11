import { describe, expect, it } from 'vitest';
import source from '@/content/articles.json';
import { LOCALE_CODES } from '@/i18n/locales';
import { CATEGORIES, CATEGORY_SLUGS, categoryFromSlug, getArticle, listArticles } from './data';

const IMAGE_KEYS = ['cabinet', 'displayJars', 'factory', 'hapNong', 'nepGoDen', 'ruouCan', 'showroom', 'storefront', 'towerRack'];

describe('articles (sample JSON, same shape as the future API)', () => {
  it('has unique, URL-safe slugs', () => {
    const slugs = source.items.map((item) => item.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  });

  it('uses known categories, cover images and ISO dates', () => {
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

  it('lists newest first, filters by category and finds one article', async () => {
    const all = await listArticles('vi');
    expect(all.map((article) => article.publishedAt)).toEqual([...all.map((article) => article.publishedAt)].sort().reverse());
    const serving = await listArticles('en', 'serving');
    expect(serving.length).toBeGreaterThan(0);
    expect(serving.every((article) => article.category === 'serving')).toBe(true);
    expect((await getArticle('en', all[0].slug))?.title).toBeTruthy();
    expect(await getArticle('vi', 'does-not-exist')).toBeNull();
  });

  it('maps category URL segments both ways', () => {
    for (const category of CATEGORIES) expect(categoryFromSlug(CATEGORY_SLUGS[category])).toBe(category);
    expect(categoryFromSlug('nope')).toBeUndefined();
  });
});
