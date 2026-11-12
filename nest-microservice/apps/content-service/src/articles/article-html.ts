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
/** Images: a file of the site itself (`/images/…`), or one of ITS media library (ADR 0034). */
const SAFE_IMG_SRC = /^\/(?!\/)[\w\-./]+\.(svg|png|jpe?g|webp|avif)$/i;
/** After the site's media prefix (`https://cdn…/media/<siteId>/`): `<uuid>/<width>.<ext>`. */
const MEDIA_PATH =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/\d{1,4}\.(webp|jpg)$/;
/** `sizes`: media conditions and lengths only, e.g. `(min-width: 768px) 50vw, 100vw`. */
const SAFE_SIZES = /^[\w\s(),.:%-]{1,200}$/;

/**
 * Where the images of the site's media library live (MediaUrls.sitePrefix, e.g.
 * `https://cdn.example.com/media/nails/`); null: only the site's `/images/…` files.
 */
export type MediaPrefix = string | null;

function isSafeImage(src: string, media: MediaPrefix): boolean {
  if (SAFE_IMG_SRC.test(src)) return true;
  return !!media && src.startsWith(media) && MEDIA_PATH.test(src.slice(media.length));
}

/** Keeps the `<url> <n>w` candidates that are images of the site's library; else nothing. */
function safeSrcset(srcset: string | undefined, media: MediaPrefix): string | undefined {
  if (!srcset || !media) return undefined;
  const kept = srcset
    .split(',')
    .map((candidate) => candidate.trim().split(/\s+/))
    .filter(
      ([url, descriptor, ...rest]) =>
        rest.length === 0 &&
        /^\d{1,4}w$/.test(descriptor ?? '') &&
        url.startsWith(media) &&
        MEDIA_PATH.test(url.slice(media.length)),
    )
    .map(([url, descriptor]) => `${url} ${descriptor}`);
  return kept.length ? kept.join(', ') : undefined;
}

function options(media: MediaPrefix): sanitizeHtml.IOptions {
  return {
    allowedTags: [...ARTICLE_HTML_TAGS],
    allowedAttributes: {
      a: ['href', 'rel'],
      img: ['src', 'srcset', 'sizes', 'alt', 'width', 'height', 'loading'],
      // anchors of a table of contents (#id links)
      h2: ['id'],
      h3: ['id'],
    },
    allowedClasses: Object.fromEntries(
      Object.entries(ARTICLE_HTML_CLASSES).map(([tag, classes]) => [tag, [...classes]]),
    ),
    // An image whose src isn't one of the site's own files or images is removed entirely.
    exclusiveFilter: (frame) => frame.tag === 'img' && !isSafeImage(frame.attribs.src ?? '', media),
    allowedSchemes: ['http', 'https', 'mailto'],
    allowProtocolRelative: false,
    disallowedTagsMode: 'discard',
    transformTags: {
      // A link keeps only a safe href (http, https, mailto, a path or #anchor) and never passes
      // the referrer or ranking on; an unsafe one keeps its text but loses its href. The tag
      // name must stay `a`: sanitize-html closes a transformed tag with the name of its LAST
      // transformation, so renaming some anchors would mis-close the others.
      a: (tagName, attribs): sanitizeHtml.Tag => {
        const href = (attribs.href ?? '').trim();
        return SAFE_HREF.test(href)
          ? { tagName, attribs: { href, rel: 'noopener noreferrer nofollow' } }
          : { tagName, attribs: {} };
      },
      // srcset only with images of the site's library; sizes only with it, as media conditions.
      img: (tagName, attribs): sanitizeHtml.Tag => {
        const { srcset, sizes, ...rest } = attribs;
        const safe = safeSrcset(srcset, media);
        return {
          tagName,
          attribs: {
            ...rest,
            ...(safe ? { srcset: safe } : {}),
            ...(safe && sizes && SAFE_SIZES.test(sizes) ? { sizes } : {}),
          },
        };
      },
    },
  };
}

/** `media`: the site's media prefix; without it only the site's `/images/…` files are kept. */
export function sanitizeArticleHtml(html: string, media: MediaPrefix = null): string {
  return sanitizeHtml(html, options(media)).trim();
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
export function withCleanBodies(
  translations: ArticleTranslationDto[],
  media: MediaPrefix = null,
): ArticleTranslationDto[] {
  return translations.map((t) => ({ ...t, body: toArticleHtml(t.locale, t.body, media) }));
}

/** Sanitized body of one translation; 400 when nothing readable is left. */
export function toArticleHtml(locale: string, html: string, media: MediaPrefix = null): string {
  const clean = sanitizeArticleHtml(html, media);
  if (!htmlText(clean)) {
    throw new BadRequestException(`translations: the ${locale} body has no text`);
  }
  return clean;
}
