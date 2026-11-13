import type { ArticleBlock, WrittenArticle } from '@app/common';
import { numbersIn } from '../studio/script-checks';

/**
 * An AI article's blocks → the editor's HTML (ADR 0041), in the shapes of the layout blocks
 * (ADR 0033: the same as `layoutBlockHtml` in @web/ui and the article templates), so the article
 * opens in the visual editor as if written there. Every text is escaped; `**bold**` is the only
 * markup kept. The result is sanitized again on write (toArticleHtml).
 */

/** A ready image of the media library, as `<img>` needs it. */
export interface BodyImage {
  url: string;
  srcset: string;
  width: number;
  height: number;
}

/** The text column of the sites is ~48rem: the browser picks the size from srcset. */
const BODY_SIZES = '(min-width: 768px) 48rem, 100vw';

function escape(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Escaped text with **bold** as <strong>. */
export function inline(text: string): string {
  return escape(text.trim()).replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
}

/** Paragraphs: a blank line (or a single line break) separates them. */
function paragraphs(text: string, cls = ''): string {
  return text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p, i) => `<p${i === 0 && cls ? ` class="${cls}"` : ''}>${inline(p)}</p>`)
    .join('');
}

const item = (i: { title?: string; text: string }) =>
  `<div class="tpl-item">${i.title ? `<h3>${inline(i.title)}</h3>` : ''}${paragraphs(i.text)}</div>`;
const list = (items: { text: string }[], cls = '') =>
  `<ul${cls ? ` class="${cls}"` : ''}>${items.map((i) => `<li>${inline(i.text)}</li>`).join('')}</ul>`;
const box = (cls: string, block: ArticleBlock, inner: string) =>
  `<section class="${cls}">${block.title ? `<h3>${inline(block.title)}</h3>` : ''}${inner}</section>`;

function blockHtml(block: ArticleBlock, image: BodyImage | null): string {
  const text = block.text ?? '';
  const items = block.items ?? [];
  switch (block.type) {
    case 'lead':
      return paragraphs(text, 'tpl-lead');
    case 'paragraph':
      return paragraphs(text);
    case 'heading':
      return `<h2>${inline(text)}</h2>`;
    case 'subheading':
      return `<h3>${inline(text)}</h3>`;
    case 'list':
      return list(items);
    case 'checklist':
      return list(items, 'tpl-check');
    case 'quote':
      return `<blockquote class="tpl-pull"><p>${inline(text)}</p></blockquote>`;
    case 'note':
    case 'tip':
    case 'warn':
      return box(`tpl-callout tpl-${block.type}`, block, paragraphs(text));
    case 'summary':
      return box('tpl-summary', block, list(items, 'tpl-check'));
    case 'cta':
      return box('tpl-cta', block, paragraphs(text));
    case 'steps':
    case 'cards':
    case 'faq':
      return `<section class="tpl-${block.type}">${items.map(item).join('')}</section>`;
    case 'image': {
      if (!image) return ''; // its picture could not be made: left out
      const caption = block.caption ? `<figcaption>${inline(block.caption)}</figcaption>` : '';
      return (
        `<figure class="tpl-wide"><img src="${escape(image.url)}" srcset="${escape(image.srcset)}" ` +
        `sizes="${BODY_SIZES}" alt="${escape(block.alt ?? '')}" width="${image.width}" ` +
        `height="${image.height}" loading="lazy">${caption}</figure>`
      );
    }
  }
}

/**
 * The body. `images[i]` is the i-th image block's picture (null: not made). Empty blocks
 * produce nothing.
 */
export function articleBodyHtml(blocks: ArticleBlock[], images: (BodyImage | null)[]): string {
  let n = 0;
  return blocks
    .map((block) => blockHtml(block, block.type === 'image' ? (images[n++] ?? null) : null))
    .filter(Boolean)
    .join('\n');
}

/** Every visible text of the article (for the numbers check). */
export function articleTexts(article: WrittenArticle): string[] {
  return [
    article.title,
    article.excerpt,
    article.seoTitle ?? '',
    article.seoDescription ?? '',
    ...article.blocks.flatMap((b) => [
      b.title ?? '',
      b.text ?? '',
      b.caption ?? '',
      ...(b.items ?? []).flatMap((i) => [i.title ?? '', i.text]),
    ]),
  ].filter(Boolean);
}

/**
 * Numbers of the article found in none of the sources (the facts, the brief the admin
 * confirmed, the idea): to be checked before publishing. Counting words (≤ 10) are not claims.
 */
export function unknownNumbers(article: WrittenArticle, sources: string[]): string[] {
  const known = new Set(sources.flatMap(numbersIn));
  const found = new Set(articleTexts(article).flatMap(numbersIn));
  return [...found].filter((n) => Number(n) > 10 && !known.has(n));
}
