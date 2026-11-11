import { BadRequestException } from '@nestjs/common';
import { ARTICLE_HTML_CLASSES, ARTICLE_HTML_TAGS, type ArticleTranslationDto } from '@app/common';
import sanitizeHtml from 'sanitize-html';

/**
 * An article body is HTML from the admin editor (ADR 0031) or a template (ADR 0033). It is
 * sanitized HERE, on every write, so what is stored (and what the sites render) only ever has the
 * allow-listed tags and classes: no script, style, iframe, event handler, inline style,
 * javascript: link or image from elsewhere can get through.
 */
const SAFE_HREF = /^(https?:\/\/|mailto:|\/(?!\/)|#)/i;
/**
 * Images: a file of the site itself (`/images/…`). Uploaded photos come from object storage once
 * uploads exist (ADR 0006); that origin is then added here, never any https URL.
 */
const SAFE_IMG_SRC = /^\/(?!\/)[\w\-./]+\.(svg|png|jpe?g|webp|avif)$/i;

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [...ARTICLE_HTML_TAGS],
  allowedAttributes: {
    a: ['href', 'rel'],
    img: ['src', 'alt', 'width', 'height', 'loading'],
    // anchors of a table of contents (#id links)
    h2: ['id'],
    h3: ['id'],
  },
  allowedClasses: Object.fromEntries(
    Object.entries(ARTICLE_HTML_CLASSES).map(([tag, classes]) => [tag, [...classes]]),
  ),
  // An image whose src isn't one of the site's own files is removed entirely.
  exclusiveFilter: (frame) => frame.tag === 'img' && !SAFE_IMG_SRC.test(frame.attribs.src ?? ''),
  allowedSchemes: ['http', 'https', 'mailto'],
  allowProtocolRelative: false,
  disallowedTagsMode: 'discard',
  // A link keeps only a safe href (http, https, mailto, a path or #anchor) and never passes the
  // referrer or ranking on; an unsafe one keeps its text but loses its href (no longer a link).
  // The tag name must stay `a`: sanitize-html closes a transformed tag with the name of its LAST
  // transformation, so renaming some anchors would mis-close the others.
  transformTags: {
    a: (tagName, attribs): sanitizeHtml.Tag => {
      const href = (attribs.href ?? '').trim();
      return SAFE_HREF.test(href)
        ? { tagName, attribs: { href, rel: 'noopener noreferrer nofollow' } }
        : { tagName, attribs: {} };
    },
  },
};

export function sanitizeArticleHtml(html: string): string {
  return sanitizeHtml(html, OPTIONS).trim();
}

/** The visible text of SANITIZED html (block boundaries become spaces). */
export function htmlText(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&[a-z]+;|&#\d+;/gi, 'x')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The translations with sanitized bodies; 400 when one has nothing readable left. */
export function withCleanBodies(translations: ArticleTranslationDto[]): ArticleTranslationDto[] {
  return translations.map((t) => ({ ...t, body: toArticleHtml(t.locale, t.body) }));
}

/** Sanitized body of one translation; 400 when nothing readable is left. */
export function toArticleHtml(locale: string, html: string): string {
  const clean = sanitizeArticleHtml(html);
  if (!htmlText(clean)) {
    throw new BadRequestException(`translations: the ${locale} body has no text`);
  }
  return clean;
}
