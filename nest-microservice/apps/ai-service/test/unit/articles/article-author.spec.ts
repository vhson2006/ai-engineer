import {
  normalizeArticle,
  normalizeBrief,
  type ArticleRequest,
  type BriefRequest,
} from '../../../src/articles/providers/article-author';
import { FakeArticleAuthor } from '../../../src/articles/providers/fake-article.author';
import {
  articleInstruction,
  briefInstruction,
} from '../../../src/articles/providers/gemini-article.author';

describe('[article-author] (unit)', () => {
  const briefRequest: BriefRequest = {
    language: 'vi',
    brand: { name: 'Envy Nails Spa' },
    facts: [{ id: 'prices', text: 'Gel | 35$' }],
    rules: [],
    bannedPhrases: ['rẻ nhất'],
    existingTitles: ['Bài cũ'],
    idea: { topic: 'Chăm sóc', idea: 'Giữ móng gel bền', length: 'medium', images: 2 },
  };
  const articleRequest: ArticleRequest = {
    language: 'vi',
    prompt: 'Bạn là người viết nội dung chuyên nghiệp…',
    outline: ['Chuẩn bị', 'Chăm sóc'],
    length: 'medium',
    images: 2,
    facts: [],
    rules: ['No prices'],
    bannedPhrases: [],
  };

  it('a brief always starts as it must, its outline cleaned', () => {
    expect(
      normalizeBrief(briefRequest, {
        prompt: 'Viết về móng gel.',
        outline: ['1. Chuẩn bị', '- Chăm sóc', ''],
      }),
    ).toEqual({
      prompt: 'Bạn là người viết nội dung chuyên nghiệp. Viết về móng gel.',
      outline: ['Chuẩn bị', 'Chăm sóc'],
    });
    expect(normalizeBrief(briefRequest, { prompt: 'x', outline: [] })).toBeNull();
  });

  it('keeps known blocks with what they need, at most images − 1 in the text (the cover is first)', () => {
    const article = normalizeArticle(articleRequest, {
      title: ' Móng gel bền ',
      excerpt: 'Tóm tắt',
      coverPrompt: 'Glossy nails',
      coverAlt: 'Móng gel',
      blocks: [
        { type: 'lead', text: 'Mở đầu' },
        { type: 'html', text: '<b>no</b>' },
        { type: 'paragraph' },
        { type: 'steps', items: [{ title: 'A', text: 'a' }, { text: '' }, 'b'] },
        { type: 'image', prompt: 'Prep', alt: 'Chuẩn bị' },
        { type: 'image', prompt: 'One too many' },
        { type: 'image', alt: 'no prompt' },
      ],
    });
    expect(article).toEqual({
      title: 'Móng gel bền',
      excerpt: 'Tóm tắt',
      coverPrompt: 'Glossy nails',
      coverAlt: 'Móng gel',
      blocks: [
        { type: 'lead', text: 'Mở đầu' },
        { type: 'steps', items: [{ title: 'A', text: 'a' }, { text: 'b' }] },
        { type: 'image', prompt: 'Prep', alt: 'Chuẩn bị' },
      ],
    });
    expect(
      normalizeArticle(
        { ...articleRequest, images: 0 },
        { title: 'T', blocks: [{ type: 'image', prompt: 'p' }] },
      ),
    ).toBeNull();
  });

  it('the instructions forbid invented facts, carry the rules, the length and the image plan', () => {
    expect(briefInstruction(briefRequest)).toContain('"Bạn là người viết nội dung chuyên nghiệp"');
    const instruction = articleInstruction(articleRequest);
    expect(instruction).toContain('Never invent prices');
    expect(instruction).toContain('Site rules: No prices');
    expect(instruction).toContain('about 900 words');
    expect(instruction).toContain('exactly 1 "image" block');
  });

  it('the fake author answers a usable brief and article', async () => {
    const author = new FakeArticleAuthor();
    const brief = await author.brief(briefRequest);
    expect(brief.prompt.startsWith('Bạn là người viết nội dung chuyên nghiệp')).toBe(true);
    const draft = await author.write({ ...articleRequest, outline: brief.outline });
    expect(draft.article.blocks.filter((b) => b.type === 'image')).toHaveLength(1);
    expect(draft.article.coverPrompt).toBeTruthy();
  });
});
