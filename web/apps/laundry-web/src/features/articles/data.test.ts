import { beforeEach, describe, expect, it, vi } from 'vitest';

// The content API (siteApiFetch inside) and Next's cache functions are mocked: this tests the
// mapping and the error policy of the data layer, not the network.
const api = vi.hoisted(() => ({ listSiteCategories: vi.fn(), listPublishedArticles: vi.fn(), getPublishedArticle: vi.fn() }));
vi.mock('@web/core/api', () => api);
vi.mock('next/cache', () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));

const { ContentUnavailableError, getArticle, listArticles, listTopics, SITE_ID, topicBySlug } = await import('./data');

const failure = (status: number, code = 'x') => ({ ok: false, status, code, message: 'm', requestId: 'req-1' });
const summary = {
  id: 'a1',
  locale: 'vi',
  slug: 'gui-do',
  title: 'Gửi đồ',
  excerpt: 'E',
  coverAlt: null,
  readingMinutes: 2,
  featured: true,
  publishedAt: '2026-11-10T02:00:00.000Z',
  category: { key: 'tips', slug: 'meo-giat-giu', name: 'Mẹo giặt giũ' },
};

beforeEach(() => vi.resetAllMocks());

describe('articles data (content API)', () => {
  it('lists topics in the admins order, in the asked language, with every language slug', async () => {
    api.listSiteCategories.mockResolvedValue({
      ok: true,
      data: [
        { key: 'shop', position: 2, translations: [{ locale: 'vi', name: 'Tin tiệm', slug: 'tin-tiem' }, { locale: 'en', name: 'Shop news', slug: 'shop-news' }] },
        { key: 'tips', position: 0, translations: [{ locale: 'vi', name: 'Mẹo', slug: 'meo' }, { locale: 'en', name: 'Tips', slug: 'tips' }] },
        { key: 'vi-only', position: 1, translations: [{ locale: 'vi', name: 'Chỉ tiếng Việt', slug: 'chi-vi' }] },
      ],
    });
    expect(await listTopics('en')).toEqual([
      { key: 'tips', slug: 'tips', name: 'Tips', slugs: { vi: 'meo', en: 'tips' } },
      { key: 'shop', slug: 'shop-news', name: 'Shop news', slugs: { vi: 'tin-tiem', en: 'shop-news' } },
    ]);
    expect(api.listSiteCategories).toHaveBeenCalledWith(SITE_ID);
    expect((await topicBySlug('en', 'shop-news'))?.key).toBe('shop');
  });

  it('lists published articles of the site, by topic slug, with a cover chosen by topic', async () => {
    api.listPublishedArticles.mockResolvedValue({ ok: true, data: { data: [summary], meta: { total: 1 } } });
    const [article] = await listArticles('vi', 'meo-giat-giu');
    expect(api.listPublishedArticles).toHaveBeenCalledWith('laundry', { locale: 'vi', category: 'meo-giat-giu', limit: 100 });
    expect(article).toMatchObject({ id: 'a1', slug: 'gui-do', topic: summary.category, featured: true, readingMinutes: 2 });
    expect(article.cover).toBeDefined();
  });

  it('an unknown topic is an empty list; any other failure throws (never cached as empty)', async () => {
    api.listPublishedArticles.mockResolvedValue(failure(404, 'not_found'));
    expect(await listArticles('vi', 'nope')).toEqual([]);
    api.listPublishedArticles.mockResolvedValue(failure(503, 'api_unreachable'));
    await expect(listArticles('vi')).rejects.toBeInstanceOf(ContentUnavailableError);
    api.listSiteCategories.mockResolvedValue(failure(401, 'unauthenticated'));
    await expect(listTopics('vi')).rejects.toThrow(/401 unauthenticated \[requestId=req-1\]/);
  });

  it('one article: HTML body as is, slugs per language; unknown → null', async () => {
    api.getPublishedArticle.mockResolvedValue({
      ok: true,
      data: { ...summary, body: '<p>Xin chào</p>', seoTitle: null, seoDescription: 'D', alternates: [{ locale: 'vi', slug: 'gui-do' }, { locale: 'en', slug: 'drop-off' }, { locale: 'fr', slug: 'x' }] },
    });
    const article = await getArticle('vi', 'old-slug');
    expect(api.getPublishedArticle).toHaveBeenCalledWith('laundry', 'vi', 'old-slug');
    expect(article).toMatchObject({ slug: 'gui-do', body: '<p>Xin chào</p>', seoDescription: 'D', slugs: { vi: 'gui-do', en: 'drop-off' } });

    api.getPublishedArticle.mockResolvedValue(failure(404));
    expect(await getArticle('vi', 'nope')).toBeNull();
    api.getPublishedArticle.mockResolvedValue(failure(500));
    await expect(getArticle('vi', 'x')).rejects.toBeInstanceOf(ContentUnavailableError);
  });
});
