/**
 * Helpers for the HTML source mode of the rich text editor (ADR 0033). Pure string functions, no
 * DOM: they never decide what is safe (the API sanitizes every body), they only help the author.
 */

/**
 * True when the HTML has what the visual editor (Tiptap StarterKit) can't keep: layout blocks
 * (section, div, figure, img) or classes. Opening such HTML in the visual editor drops them.
 */
export function hasLayoutBlocks(html: string): boolean {
  return /<(section|div|figure|figcaption|img)\b/i.test(html) || /<[a-z][^>]*\sclass\s*=/i.test(html);
}

const BLOCK = new Set([
  'section', 'div', 'figure', 'figcaption', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li',
  'blockquote', 'pre', 'hr', 'img', 'br', 'table', 'thead', 'tbody', 'tr', 'td', 'th',
]);
const VOID = new Set(['img', 'br', 'hr']);
/** Blocks whose content stays on their line (`<p>text <strong>bold</strong></p>`). */
const INLINE_CONTENT = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'figcaption', 'pre', 'td', 'th']);

/**
 * Indents block tags two spaces per level, one block per line; inline content and `<pre>` stay
 * as they are. Only whitespace BETWEEN blocks changes, so the rendered article doesn't.
 */
export function formatHtml(html: string): string {
  const tokens = html.replace(/>\s+</g, '><').trim().split(/(<[^>]+>)/).filter((token) => token !== '');
  const lines: string[] = [];
  let depth = 0;
  let line = '';
  let inlineDepth = 0; // > 0 while inside a block whose content stays on one line
  const flush = () => {
    if (line.trim()) lines.push('  '.repeat(depth) + line.trim());
    line = '';
  };

  for (const token of tokens) {
    const tag = /^<\/?\s*([a-z0-9]+)/i.exec(token)?.[1]?.toLowerCase();
    const closing = token.startsWith('</');
    if (inlineDepth > 0) {
      line += token;
      if (tag && INLINE_CONTENT.has(tag)) inlineDepth += closing ? -1 : token.endsWith('/>') ? 0 : 1;
      if (inlineDepth === 0) flush();
      continue;
    }
    if (!tag || !BLOCK.has(tag)) {
      line += token; // text or an inline tag between blocks
      continue;
    }
    flush();
    if (closing) {
      depth = Math.max(0, depth - 1);
      lines.push('  '.repeat(depth) + token);
    } else if (VOID.has(tag) || token.endsWith('/>')) {
      lines.push('  '.repeat(depth) + token);
    } else if (INLINE_CONTENT.has(tag)) {
      line = token;
      inlineDepth = 1;
    } else {
      lines.push('  '.repeat(depth) + token);
      depth += 1;
    }
  }
  flush();
  return lines.join('\n');
}

/** Tags and classes of an HTML string, counted: `{ 'tag:img': 3, 'class:tpl-wide': 1, … }`. */
export function htmlInventory(html: string): Map<string, number> {
  const counts = new Map<string, number>();
  const add = (key: string) => counts.set(key, (counts.get(key) ?? 0) + 1);
  for (const [, tag, attributes] of html.matchAll(/<([a-z][a-z0-9]*)\b([^>]*)>/gi)) {
    add(`tag:${tag.toLowerCase()}`);
    const classes = /\sclass\s*=\s*"([^"]*)"/i.exec(attributes)?.[1] ?? /\sclass\s*=\s*'([^']*)'/i.exec(attributes)?.[1];
    for (const name of classes?.split(/\s+/).filter(Boolean) ?? []) add(`class:${name}`);
  }
  return counts;
}

/**
 * What the server removed when it sanitized `sent` into `stored`: tags and classes that are
 * fewer (or gone) in `stored`, e.g. `['tag:iframe', 'class:my-box']`. Empty when nothing was.
 */
export function removedOnSave(sent: string, stored: string): string[] {
  const before = htmlInventory(sent);
  const after = htmlInventory(stored);
  return [...before].filter(([key, count]) => (after.get(key) ?? 0) < count).map(([key]) => key);
}
