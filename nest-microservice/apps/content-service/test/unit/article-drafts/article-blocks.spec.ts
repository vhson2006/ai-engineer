import { type ArticleBlock, type WrittenArticle } from '@app/common';
import {
  articleBodyHtml,
  inline,
  unknownNumbers,
} from '../../../src/article-drafts/article-blocks';
import { sanitizeArticleHtml } from '../../../src/articles/article-html';

const MEDIA = 'https://cdn.example.com/media/nails/';
const ID = '7d0c4f3e-1b2a-4c5d-8e9f-0a1b2c3d4e5f';
const picture = {
  url: `${MEDIA}${ID}/1280.webp`,
  srcset: `${MEDIA}${ID}/640.webp 640w, ${MEDIA}${ID}/1280.webp 1280w`,
  width: 1280,
  height: 720,
};

describe('[article-blocks] (unit)', () => {
  it('escapes every text and keeps **bold** as the only markup', () => {
    expect(inline('A <script>x</script> & **gel** "nails"')).toBe(
      'A &lt;script&gt;x&lt;/script&gt; &amp; <strong>gel</strong> &quot;nails&quot;',
    );
  });

  it('builds the editor’s layout blocks, which survive the sanitizer unchanged', () => {
    const blocks: ArticleBlock[] = [
      { type: 'lead', text: 'Lead.' },
      { type: 'heading', text: 'Why' },
      { type: 'paragraph', text: 'One.\n\nTwo.' },
      { type: 'tip', title: 'Tip', text: 'Dry well.' },
      { type: 'summary', title: 'Key points', items: [{ text: 'A' }, { text: 'B' }] },
      { type: 'steps', items: [{ title: 'Prep', text: 'Clean.' }] },
      { type: 'faq', items: [{ title: 'How long?', text: 'Weeks.' }] },
      { type: 'image', prompt: 'p', alt: 'Nails', caption: 'Fresh set' },
      { type: 'quote', text: 'Short.' },
      { type: 'cta', title: 'Book', text: 'Call us.' },
    ];
    const html = articleBodyHtml(blocks, [picture]);
    expect(html).toContain('<p class="tpl-lead">Lead.</p>');
    expect(html).toContain('<p>One.</p><p>Two.</p>');
    expect(html).toContain(
      '<section class="tpl-callout tpl-tip"><h3>Tip</h3><p>Dry well.</p></section>',
    );
    expect(html).toContain(
      '<section class="tpl-summary"><h3>Key points</h3><ul class="tpl-check"><li>A</li><li>B</li></ul></section>',
    );
    expect(html).toContain(
      '<section class="tpl-steps"><div class="tpl-item"><h3>Prep</h3><p>Clean.</p></div></section>',
    );
    expect(html).toContain('<section class="tpl-faq">');
    expect(html).toContain('<blockquote class="tpl-pull"><p>Short.</p></blockquote>');
    expect(html).toContain('<section class="tpl-cta"><h3>Book</h3><p>Call us.</p></section>');
    expect(html).toContain(`<figure class="tpl-wide"><img src="${picture.url}"`);
    expect(html).toContain('<figcaption>Fresh set</figcaption>');
    // Nothing of it is removed by the article sanitizer (the media library prefix allowed).
    const clean = sanitizeArticleHtml(html, MEDIA);
    for (const part of [
      'tpl-lead',
      'tpl-callout tpl-tip',
      'tpl-summary',
      'tpl-steps',
      'tpl-faq',
      'tpl-pull',
      'tpl-cta',
      picture.url,
    ]) {
      expect(clean).toContain(part);
    }
  });

  it('leaves out an image that could not be made', () => {
    expect(
      articleBodyHtml(
        [
          { type: 'image', prompt: 'p' },
          { type: 'paragraph', text: 'x' },
        ],
        [null],
      ),
    ).toBe('<p>x</p>');
  });

  it('flags numbers found in no source (counting words up to 10 are fine)', () => {
    const article: WrittenArticle = {
      title: 'Gel nails that last 3 weeks',
      excerpt: 'From $35.',
      blocks: [{ type: 'paragraph', text: 'Over 15 years of care, gel from $35, open 9:30.' }],
    };
    expect(unknownNumbers(article, ['Gel manicure | $35', 'Mon–Sat | 9:30 – 19:00'])).toEqual([
      '15',
    ]);
  });
});
