import {
  applySegments,
  planSegments,
  reviewWarnings,
} from '../../../src/translations/article-segments';

describe('[article-segments] (unit)', () => {
  const body =
    '<p class="tpl-lead">Giữ <strong>khô ráo</strong> sau khi giặt.</p>' +
    '<section class="tpl-cards"><div class="tpl-item"><img src="/images/a.svg" alt="Máy giặt" /><h3>Thẻ</h3><p>Giá <a href="/vi/bang-gia">35.000 ₫</a></p></div></section>' +
    '<ul class="tpl-check"><li><p>Một</p></li><li>Hai</li></ul>' +
    '<blockquote class="tpl-pull">Câu trích</blockquote>' +
    '<figure class="tpl-wide"><img src="/images/b.svg" alt="" /><figcaption>Chú thích</figcaption></figure>' +
    '<p> </p>';
  const source = { title: 'Tiêu đề', excerpt: 'Tóm tắt', coverAlt: null, seoTitle: '', body };

  it('splits fields, then each inline-only block, alt texts and loose text, in document order', () => {
    expect(planSegments(source).segments).toEqual([
      'Tiêu đề',
      'Tóm tắt',
      'Giữ <strong>khô ráo</strong> sau khi giặt.',
      'Máy giặt',
      'Thẻ',
      'Giá <a href="/vi/bang-gia">35.000 ₫</a>',
      'Một',
      'Hai',
      'Câu trích',
      'Chú thích',
    ]);
  });

  it('puts translations back in place: structure, classes, images and links untouched', () => {
    const plan = planSegments(source);
    const translated = [
      'Title',
      'Summary',
      'Keep it <strong>dry</strong> after washing.',
      'Washing machine',
      'Card',
      'Price <a href="/vi/bang-gia">35.000 ₫</a>',
      'One',
      'Two',
      'A quote',
      'Caption',
    ];
    const result = applySegments(source, plan, translated);
    expect(result.fields).toEqual({ title: 'Title', excerpt: 'Summary' });
    expect(result.body).toBe(
      '<p class="tpl-lead">Keep it <strong>dry</strong> after washing.</p>' +
        '<section class="tpl-cards"><div class="tpl-item"><img src="/images/a.svg" alt="Washing machine"><h3>Card</h3><p>Price <a href="/vi/bang-gia">35.000 ₫</a></p></div></section>' +
        '<ul class="tpl-check"><li><p>One</p></li><li>Two</li></ul>' +
        '<blockquote class="tpl-pull">A quote</blockquote>' +
        '<figure class="tpl-wide"><img src="/images/b.svg" alt=""><figcaption>Caption</figcaption></figure>' +
        '<p> </p>',
    );
  });

  it('fields, alt texts and loose text stay plain text (escaped); block content goes to the sanitizer', () => {
    const input = {
      title: 'T',
      body: '<blockquote>Q<p>P</p></blockquote><img src="/images/a.svg" alt="A" />',
    };
    const plan = planSegments(input);
    expect(plan.segments).toEqual(['T', 'Q', 'P', 'A']);
    const result = applySegments(input, plan, [
      '<b>Bold</b> title',
      '<i>x</i> & co',
      'Para',
      '<i>Alt</i>',
    ]);
    expect(result.fields.title).toBe('Bold title');
    expect(result.body).toBe(
      '<blockquote>x &amp; co<p>Para</p></blockquote><img src="/images/a.svg" alt="Alt">',
    );
  });

  it('an alt text with quotes and ampersands cannot break its attribute', () => {
    const input = { body: '<img src="/images/a.svg" alt="A" />' };
    const result = applySegments(input, planSegments(input), ['Say "hi" & <b>bye</b>']);
    expect(result.body).toBe('<img src="/images/a.svg" alt="Say &quot;hi&quot; &amp; bye">');
  });

  it('refuses a wrong number of segments', () => {
    expect(() => applySegments(source, planSegments(source), ['only one'])).toThrow('expected 10');
  });

  it('flags segments whose numbers or inline tags changed', () => {
    expect(
      reviewWarnings(
        ['Giá 35.000 ₫ lúc 07:00', 'Giữ <strong>khô</strong>', 'Xin chào'],
        ['Price 35.000 ₫ at 7:00', 'Keep dry', 'Hello'],
      ),
    ).toEqual([
      { index: 0, kind: 'numbers' },
      { index: 1, kind: 'markup' },
    ]);
  });
});
