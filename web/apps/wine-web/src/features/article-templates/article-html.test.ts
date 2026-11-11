import { describe, expect, it } from 'vitest';
import { ARTICLE_TEMPLATES } from '@/content/article-templates';
import { LAYOUT_CLASSES, sanitizeLayoutHtml } from './article-html';

/** Sanitized output without the rel the sanitizer adds to links, whitespace collapsed. */
const clean = (html: string) => sanitizeLayoutHtml(html).replace(/ rel="noopener noreferrer nofollow"/g, '').replace(/\s+/g, ' ');
const squash = (html: string) => html.trim().replace(/\s+/g, ' ');

describe('article templates', () => {
  it.each(ARTICLE_TEMPLATES.map((t) => [t.id, t] as const))('%s survives the layout allow-list unchanged', (_, template) => {
    expect(clean(template.html)).toBe(squash(template.html));
  });

  it('every template has a unique id, images, and is long in words or in pictures (photo essay)', () => {
    expect(new Set(ARTICLE_TEMPLATES.map((t) => t.id)).size).toBe(ARTICLE_TEMPLATES.length);
    for (const template of ARTICLE_TEMPLATES) {
      const images = template.html.match(/<img /g)?.length ?? 0;
      const words = template.html.replace(/<[^>]+>/g, ' ').split(/\s+/).length;
      expect(images, template.id).toBeGreaterThanOrEqual(1);
      expect(words > 200 || images >= 10, `${template.id}: ${words} words, ${images} images`).toBe(true);
    }
  });

  it('uses only classes of the vocabulary', () => {
    const known = new Set(Object.values(LAYOUT_CLASSES).flat());
    for (const template of ARTICLE_TEMPLATES) {
      for (const [, classes] of template.html.matchAll(/class="([^"]+)"/g)) {
        for (const name of classes.split(' ')) expect(known.has(name), `${template.id}: ${name}`).toBe(true);
      }
    }
  });
});

describe('layout allow-list', () => {
  it('drops scripts, styles, handlers and unknown classes', () => {
    const html = clean(
      '<section class="tpl-cols evil" style="color:red" onclick="x()"><script>alert(1)</script><p class="tpl-lead x">Hi</p><iframe src="https://e.com"></iframe></section>',
    );
    expect(html).toBe('<section class="tpl-cols"><p class="tpl-lead">Hi</p></section>');
  });

  it('keeps only the site’s own images and safe links', () => {
    expect(clean('<img src="https://evil.example/x.png" alt="x" /><img src="/images/a.jpg" alt="a" />')).toBe('<img src="/images/a.jpg" alt="a" />');
    expect(clean('<img src="javascript:alert(1)" />')).toBe('');
    expect(clean('<a href="javascript:alert(1)">x</a>')).toBe('<a>x</a>');
  });
});
