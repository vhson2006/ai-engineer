import { BadRequestException } from '@nestjs/common';
import { htmlText, sanitizeArticleHtml, toArticleHtml } from '../../../src/articles/article-html';

describe('[article-html] (unit)', () => {
  it('keeps the formatting of the editor', () => {
    const html =
      '<h2>T</h2><h3>S</h3><p><strong>b</strong> <em>i</em> <u>u</u> <s>s</s> <code>c</code><br></p>' +
      '<blockquote><p>q</p></blockquote><ul><li>a</li></ul><ol><li>b</li></ol><pre><code>x</code></pre><hr>';
    expect(sanitizeArticleHtml(html)).toBe(
      html.replace('<br>', '<br />').replace('<hr>', '<hr />'),
    );
  });

  it('removes scripts, styles, frames, event handlers and inline styles', () => {
    expect(
      sanitizeArticleHtml(
        '<p style="color:red" onclick="x()">a<script>alert(1)</script><style>p{}</style><iframe src="//e"></iframe><img src=x onerror=y></p>',
      ),
    ).toBe('<p>a</p>');
  });

  it('keeps safe links with rel; unsafe ones lose their href', () => {
    expect(sanitizeArticleHtml('<a href="https://x.dev" target="_blank" rel="opener">x</a>')).toBe(
      '<a href="https://x.dev" rel="noopener noreferrer nofollow">x</a>',
    );
    expect(sanitizeArticleHtml('<a href="/blog/a">a</a>')).toContain('href="/blog/a"');
    for (const href of [
      'javascript:alert(1)',
      ' JavaScript:x',
      'data:text/html,x',
      '//evil.dev',
      'vbscript:x',
    ]) {
      expect(sanitizeArticleHtml(`<p><a href="${href}">t</a></p>`)).toBe('<p><a>t</a></p>');
    }
  });

  it('an unsafe link before a safe one does not break the markup', () => {
    expect(
      sanitizeArticleHtml('<p><a href="javascript:x">a</a> <a href="https://e.com">b</a></p>'),
    ).toBe('<p><a>a</a> <a href="https://e.com" rel="noopener noreferrer nofollow">b</a></p>');
  });

  it('keeps the layout blocks of a template (ADR 0033)', () => {
    const html =
      '<section class="tpl-split"><div class="tpl-media"><figure class="tpl-framed">' +
      '<img src="/images/placeholder/4x3.svg" alt="a" loading="lazy" /><figcaption>c</figcaption>' +
      '</figure></div><div class="tpl-body"><h2 id="phan-1">T</h2><p class="tpl-lead">L</p>' +
      '<ul class="tpl-check"><li>x</li></ul></div></section><hr class="tpl-ornament" />';
    expect(sanitizeArticleHtml(html)).toBe(html);
  });

  it('drops classes outside the vocabulary and classes on the wrong tag', () => {
    expect(
      sanitizeArticleHtml(
        '<section class="tpl-cols evil hidden"><p class="tpl-lead tpl-cols">a</p><div class="x">b</div></section>',
      ),
    ).toBe('<section class="tpl-cols"><p class="tpl-lead">a</p><div>b</div></section>');
  });

  it("keeps only the site's own images, and only their safe attributes", () => {
    expect(
      sanitizeArticleHtml(
        '<figure><img src="/images/a.jpg" alt="a" onerror="x()" style="width:9px" /></figure>',
      ),
    ).toBe('<figure><img src="/images/a.jpg" alt="a" /></figure>');
    for (const src of [
      'https://evil.dev/a.png',
      '//evil.dev/a.png',
      'javascript:alert(1)',
      'data:image/png;base64,AAAA',
      '/images/a.html',
      '/images/../../x.svg?y',
    ]) {
      expect(sanitizeArticleHtml(`<p>t<img src="${src}" alt="x" /></p>`)).toBe('<p>t</p>');
    }
  });

  describe('images of the media library (ADR 0034)', () => {
    const media = 'https://cdn.example.com/media/nails/';
    const id = '7d0c4f3e-1b2a-4c5d-8e9f-0a1b2c3d4e5f';
    const url = (width: number, site = 'nails') =>
      `https://cdn.example.com/media/${site}/${id}/${width}.webp`;

    it("keeps an image of the site's library with its srcset and sizes", () => {
      const html = `<figure><img src="${url(1280)}" alt="a" width="1280" height="853" srcset="${url(640)} 640w, ${url(1280)} 1280w" sizes="(min-width: 768px) 50vw, 100vw" /></figure>`;
      expect(sanitizeArticleHtml(html, media)).toBe(html);
    });

    it('removes images of another site, another host, or other paths of the bucket', () => {
      for (const src of [
        url(640, 'wine'),
        `https://evil.dev/media/nails/${id}/640.webp`,
        `${media}${id}/640.svg`,
        `${media}${id}/../../wine/${id}/640.webp`,
        `${media}x/640.webp`,
      ]) {
        expect(sanitizeArticleHtml(`<p>t<img src="${src}" alt="x" /></p>`, media)).toBe('<p>t</p>');
      }
    });

    it('without the prefix (no media library), library images are removed', () => {
      expect(sanitizeArticleHtml(`<p>t<img src="${url(640)}" /></p>`)).toBe('<p>t</p>');
    });

    it('keeps only the srcset candidates of the library; sizes only with a srcset', () => {
      expect(
        sanitizeArticleHtml(
          `<img src="${url(1280)}" srcset="https://evil.dev/x.webp 640w, ${url(1280)} 1280w, ${url(640)} 2x" sizes="100vw" />`,
          media,
        ),
      ).toBe(`<img src="${url(1280)}" srcset="${url(1280)} 1280w" sizes="100vw" />`);
      expect(
        sanitizeArticleHtml(
          `<img src="/images/a.jpg" srcset="/images/b.jpg 640w" sizes="100vw" />`,
          media,
        ),
      ).toBe('<img src="/images/a.jpg" />');
      expect(
        sanitizeArticleHtml(
          `<img src="${url(640)}" srcset="${url(640)} 640w" sizes="url(x);" />`,
          media,
        ),
      ).toBe(`<img src="${url(640)}" srcset="${url(640)} 640w" />`);
    });
  });

  describe('YouTube embeds (ADR 0040)', () => {
    it('keeps the id and the classes only: never an iframe', () => {
      const html =
        '<figure class="tpl-youtube tpl-short" data-youtube="dQw4w9WgXcQ"><figcaption>c</figcaption></figure>';
      expect(sanitizeArticleHtml(html)).toBe(html);
      expect(
        sanitizeArticleHtml(
          '<figure class="tpl-youtube" data-youtube="dQw4w9WgXcQ" data-x="1" onclick="x()"><iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe><figcaption>c</figcaption></figure>',
        ),
      ).toBe(
        '<figure class="tpl-youtube" data-youtube="dQw4w9WgXcQ"><figcaption>c</figcaption></figure>',
      );
    });

    it('removes a YouTube block without a valid id; drops an id on any other figure', () => {
      for (const id of ['', 'short', 'javascript:x', 'dQw4w9WgXcQQ']) {
        expect(
          sanitizeArticleHtml(
            `<p>t</p><figure class="tpl-youtube" data-youtube="${id}"><figcaption>c</figcaption></figure>`,
          ),
        ).toBe('<p>t</p>');
      }
      expect(
        sanitizeArticleHtml(
          '<figure class="tpl-wide" data-youtube="bad id"><img src="/images/a.jpg" /></figure>',
        ),
      ).toBe('<figure class="tpl-wide"><img src="/images/a.jpg" /></figure>');
    });
  });

  describe('videos of the studio (ADR 0039)', () => {
    const studio = 'https://cdn.example.com/studio/nails/';
    const project = '7d0c4f3e-1b2a-4c5d-8e9f-0a1b2c3d4e5f';
    const render = '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d';
    const file = (name: string, site = 'nails') =>
      `https://cdn.example.com/studio/${site}/${project}/video/${render}${name}`;
    const clean = (html: string) => sanitizeArticleHtml(html, null, studio);

    it('keeps a clip of the site with its poster and size, always controls / inline / not preloaded', () => {
      expect(
        clean(
          `<figure class="tpl-video"><video src="${file('-web.mp4')}" poster="${file('.jpg')}" width="720" height="1280" autoplay muted loop onplay="x()"></video><figcaption>c</figcaption></figure>`,
        ),
      ).toBe(
        `<figure class="tpl-video"><video src="${file('-web.mp4')}" poster="${file('.jpg')}" width="720" height="1280" controls playsinline preload="none"></video><figcaption>c</figcaption></figure>`,
      );
      expect(clean(`<p>t</p><video src="${file('.mp4')}"></video>`)).toBe(
        `<p>t</p><video src="${file('.mp4')}" controls playsinline preload="none"></video>`,
      );
    });

    it('removes a video from another site, host or path, and without the prefix', () => {
      for (const src of [
        file('.mp4', 'wine'),
        `https://evil.dev/studio/nails/${project}/video/${render}.mp4`,
        `${studio}${project}/voice/${render}.wav`,
        `${studio}${project}/video/../../wine/x.mp4`,
        `${studio}${project}/video/${render}.webm`,
      ]) {
        expect(clean(`<p>t</p><video src="${src}"></video>`)).toBe('<p>t</p>');
      }
      expect(sanitizeArticleHtml(`<p>t</p><video src="${file('.mp4')}"></video>`)).toBe('<p>t</p>');
    });

    it('drops a poster from elsewhere and a size that is not a number', () => {
      expect(
        clean(
          `<video src="${file('.mp4')}" poster="https://evil.dev/x.jpg" width="100%" height="1280"></video>`,
        ),
      ).toBe(
        `<video src="${file('.mp4')}" height="1280" controls playsinline preload="none"></video>`,
      );
    });
  });

  it('text: block boundaries become spaces, entities count as one character', () => {
    expect(htmlText('<p>a</p><p>b&amp;c&nbsp;d</p>')).toBe('a bxc d');
  });

  it('400 when nothing readable is left', () => {
    expect(() => toArticleHtml('vi', '<p><script>x</script></p>')).toThrow(BadRequestException);
    expect(toArticleHtml('vi', ' <p>ok</p> ')).toBe('<p>ok</p>');
  });
});
