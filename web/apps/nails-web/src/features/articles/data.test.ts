import { beforeEach, describe, expect, it, vi } from 'vitest';

// The content API (siteApiFetch inside) and Next's cache functions are mocked: this tests the
// mapping and the error policy of the data layer, not the network.
const api = vi.hoisted(() => ({ listSiteCategories: vi.fn(), listPublishedArticles: vi.fn(), getPublishedArticle: vi.fn() }));
vi.mock('@web/core/api', () => api);
vi.mock('next/cache', () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));

const { ContentUnavailableError, getArticle, latestArticles, listArticles, listTopics, SITE_ID, slugInLocale } = await import('./data');

const failure = (status: number, code = 'x') => ({ ok: false, status, code, message: 'm', requestId: 'req-1' });
const summary = {
  id: 'a1',
  locale: 'en',
  slug: 'gel-x-guide',
  title: 'Gel-X guide',
  excerpt: 'E',
  coverAlt: null,
  cover: null,
  readingMinutes: 3,
  featured: false,
  publishedAt: '2026-11-12T15:00:00.000Z',
  category: { key: 'services', slug: 'services', name: 'Services' },
};

beforeEach(() => vi.resetAllMocks());

describe('nails articles data (content API, site nails)', () => {
  it('lists topics in the admins order, in the asked language', async () => {
    api.listSiteCategories.mockResolvedValue({
      ok: true,
      data: [
        { key: 'salon', position: 2, translations: [{ locale: 'en', name: 'Salon notes', slug: 'salon' }, { locale: 'vi', name: 'Tin tiệm', slug: 'tin-tiem' }] },
        { key: 'care', position: 0, translations: [{ locale: 'en', name: 'Nail care', slug: 'nail-care' }, { locale: 'vi', name: 'Chăm sóc móng', slug: 'cham-soc-mong' }] },
      ],
    });
    expect((await listTopics('vi')).map((topic) => topic.slug)).toEqual(['cham-soc-mong', 'tin-tiem']);
    expect(api.listSiteCategories).toHaveBeenCalledWith(SITE_ID);
    expect(SITE_ID).toBe('nails');
  });

  it('maps articles with a gallery cover by topic, or the media library cover', async () => {
    const image = { id: 'm1', url: 'https://cdn.test/media/nails/m1/1280.webp', width: 1280, height: 853, srcset: 'x 640w' };
    api.listPublishedArticles.mockResolvedValue({ ok: true, data: { data: [summary, { ...summary, id: 'a2', cover: image, coverAlt: 'Gel-X set' }], meta: { total: 2 } } });
    const [plain, withCover] = await listArticles('en', 'services');
    expect(api.listPublishedArticles).toHaveBeenCalledWith('nails', { locale: 'en', category: 'services', limit: 100 });
    expect(plain.cover).toMatchObject({ kind: 'photo' });
    expect(withCover.cover).toEqual({ kind: 'media', image, alt: 'Gel-X set' });
  });

  it('the home page gets no articles (not an error) when the API is down', async () => {
    api.listPublishedArticles.mockResolvedValue(failure(503, 'api_unreachable'));
    expect(await latestArticles('en', 3)).toEqual([]);
    await expect(listArticles('en')).rejects.toBeInstanceOf(ContentUnavailableError);
  });

  it('one article: HTML body, slugs per language; another language slug finds its own', async () => {
    api.getPublishedArticle.mockImplementation(async (_site: string, locale: string, slug: string) =>
      locale === 'en' && slug === 'gel-x-guide'
        ? { ok: true, data: { ...summary, body: '<p>Hi</p>', seoTitle: null, seoDescription: null, alternates: [{ locale: 'en', slug: 'gel-x-guide' }, { locale: 'vi', slug: 'huong-dan-gel-x' }] } }
        : failure(404),
    );
    expect(await getArticle('en', 'gel-x-guide')).toMatchObject({ body: '<p>Hi</p>', slugs: { en: 'gel-x-guide', vi: 'huong-dan-gel-x' } });
    expect(await getArticle('vi', 'gel-x-guide')).toBeNull();
    expect(await slugInLocale('vi', 'gel-x-guide')).toBe('huong-dan-gel-x');
  });
});
