import 'server-only';
import sanitizeHtml from 'sanitize-html';

/**
 * PROPOSED layout vocabulary for article bodies (templates with images and layouts). Today
 * content-service keeps text tags only (ARTICLE_HTML_TAGS, ADR 0031); this list is what it, and the
 * admin editor (Tiptap nodes), would accept once a template is chosen: a few block tags and a FIXED
 * set of `tpl-*` classes, never inline style, script or arbitrary attributes. The template previews
 * render through it, so every template is proven to survive the allow-list unchanged (see the test).
 */
export const LAYOUT_TAGS = [
  // text (ADR 0031)
  'p', 'br', 'h2', 'h3', 'strong', 'em', 'u', 's', 'code', 'pre', 'blockquote', 'ul', 'ol', 'li', 'hr', 'a',
  // layout (proposed)
  'section', 'div', 'figure', 'figcaption', 'img',
] as const;

export const LAYOUT_CLASSES = {
  section: [
    'tpl-cols', 'tpl-cols-3', 'tpl-split', 'tpl-split-reverse', 'tpl-callout', 'tpl-note', 'tpl-tip', 'tpl-warn',
    'tpl-stats', 'tpl-timeline', 'tpl-gallery', 'tpl-gallery-3', 'tpl-mosaic', 'tpl-steps', 'tpl-qa', 'tpl-compare',
    'tpl-toc', 'tpl-faq', 'tpl-cta', 'tpl-chapter', 'tpl-dark', 'tpl-cards', 'tpl-summary', 'tpl-ranked', 'tpl-facts',
  ],
  div: ['tpl-item', 'tpl-media', 'tpl-body', 'tpl-highlight'],
  figure: ['tpl-wide', 'tpl-full', 'tpl-left', 'tpl-right', 'tpl-portrait', 'tpl-framed'],
  p: ['tpl-lead', 'tpl-kicker', 'tpl-dropcap', 'tpl-q', 'tpl-a', 'tpl-small', 'tpl-stat', 'tpl-label', 'tpl-byline', 'tpl-rank'],
  blockquote: ['tpl-pull', 'tpl-center'],
  hr: ['tpl-ornament'],
  ol: ['tpl-steps', 'tpl-numbered'],
  ul: ['tpl-check', 'tpl-pros', 'tpl-cons', 'tpl-inline'],
  h2: ['tpl-chapter-title', 'tpl-center'],
  h3: ['tpl-year', 'tpl-small-heading'],
} satisfies Partial<Record<(typeof LAYOUT_TAGS)[number], string[]>>;

const SAFE_HREF = /^(https?:\/\/|mailto:|\/(?!\/)|#)/i;
/** Images: the site's own files for now; object storage origins (STORAGE_ORIGINS) when uploads exist. */
const SAFE_SRC = /^\/(?!\/)[\w\-./]+\.(svg|png|jpe?g|webp|avif)$/i;

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [...LAYOUT_TAGS],
  allowedAttributes: { a: ['href', 'rel'], img: ['src', 'alt', 'width', 'height', 'loading'], h2: ['id'], h3: ['id'] },
  allowedClasses: LAYOUT_CLASSES,
  allowedSchemes: ['http', 'https', 'mailto'],
  allowProtocolRelative: false,
  disallowedTagsMode: 'discard',
  transformTags: {
    a: (tagName, attribs): sanitizeHtml.Tag => {
      const href = (attribs.href ?? '').trim();
      return SAFE_HREF.test(href) ? { tagName, attribs: { href, rel: 'noopener noreferrer nofollow' } } : { tagName, attribs: {} };
    },
  },
  exclusiveFilter: (frame) => frame.tag === 'img' && !SAFE_SRC.test(frame.attribs.src ?? ''),
};

export function sanitizeLayoutHtml(html: string): string {
  return sanitizeHtml(html, OPTIONS).trim();
}
