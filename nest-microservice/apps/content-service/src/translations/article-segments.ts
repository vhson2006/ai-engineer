import { render } from 'dom-serializer';
import { Element, isTag, isText, type AnyNode, type ParentNode } from 'domhandler';
import { parseDocument } from 'htmlparser2';

/**
 * An article as TEXT SEGMENTS for machine translation (ADR 0036): the HTML structure (blocks,
 * classes, images, links' href) never leaves content-service; only the text does, and the
 * translated segments are put back in the same places.
 *
 * A segment is the inner HTML of a block that holds only inline content (a paragraph, a heading,
 * a list item, a caption…), so a sentence travels whole with its inline markup (<strong>, <a>…);
 * an image's alt text is a segment too. The article's fields (title, excerpt, cover alt, SEO) are
 * plain-text segments before the body's.
 */

/** Inline tags of ARTICLE_HTML_TAGS: they stay inside a segment. */
const INLINE = new Set(['strong', 'em', 'u', 's', 'code', 'a', 'br', 'b', 'i', 'span']);

export const TRANSLATED_FIELDS = [
  'title',
  'excerpt',
  'coverAlt',
  'seoTitle',
  'seoDescription',
] as const;
export type TranslatedField = (typeof TRANSLATED_FIELDS)[number];
export type SourceFields = Partial<Record<TranslatedField, string | null>> & { body: string };

/** Where each segment goes back: a field, a block's content, a text node, an alt attribute. */
type Slot =
  | { kind: 'field'; field: TranslatedField }
  | { kind: 'inner'; path: number[] }
  | { kind: 'text'; path: number[] }
  | { kind: 'alt'; path: number[] };

export interface SegmentPlan {
  segments: string[];
  slots: Slot[];
}

const hasText = (value: string) => /\p{L}|\p{N}/u.test(value);

/** Only inline children (text and inline tags, recursively), with some text to translate. */
function isInlineOnly(node: ParentNode): boolean {
  return node.children.every(
    (child) =>
      isText(child) ||
      (isTag(child) && INLINE.has(child.name) && isInlineOnly(child)) ||
      (!isTag(child) && !isText(child)), // comments
  );
}

const textOf = (node: AnyNode): string =>
  isText(node) ? node.data : isTag(node) ? node.children.map(textOf).join('') : '';

/** The segments of an article and where they go. Deterministic: same input → same plan. */
export function planSegments(source: SourceFields): SegmentPlan {
  const segments: string[] = [];
  const slots: Slot[] = [];
  for (const field of TRANSLATED_FIELDS) {
    const value = source[field];
    if (value && hasText(value)) {
      segments.push(value);
      slots.push({ kind: 'field', field });
    }
  }

  const walk = (parent: ParentNode, path: number[]) => {
    parent.children.forEach((child, index) => {
      const here = [...path, index];
      if (isText(child)) {
        // Text directly in a block next to other blocks (e.g. a quote without a paragraph).
        if (hasText(child.data)) {
          segments.push(child.data);
          slots.push({ kind: 'text', path: here });
        }
        return;
      }
      if (!isTag(child)) return;
      if (child.name === 'img') {
        const alt = child.attribs.alt ?? '';
        if (hasText(alt)) {
          segments.push(alt);
          slots.push({ kind: 'alt', path: here });
        }
        return;
      }
      if (child.children.length && isInlineOnly(child) && !INLINE.has(child.name)) {
        if (hasText(textOf(child))) {
          segments.push(render(child.children, { decodeEntities: false, emptyAttrs: true }));
          slots.push({ kind: 'inner', path: here });
        }
        return;
      }
      walk(child, here);
    });
  };
  walk(parseDocument(source.body, { decodeEntities: false }), []);
  return { segments, slots };
}

/** The node at `path` (child indexes from the document root). */
function nodeAt(root: ParentNode, path: number[]): AnyNode {
  let node: AnyNode = root;
  for (const index of path) node = (node as ParentNode).children[index];
  return node;
}

/**
 * The translated article: fields and body with the translated segments put back. The body is
 * NOT trusted: the caller sanitizes it like any body (ArticlesService rules, ADR 0031/0033).
 */
export function applySegments(
  source: SourceFields,
  plan: SegmentPlan,
  translated: string[],
): { fields: Partial<Record<TranslatedField, string>>; body: string } {
  if (translated.length !== plan.segments.length) {
    throw new Error(`expected ${plan.segments.length} segments, got ${translated.length}`);
  }
  const document = parseDocument(source.body, { decodeEntities: false });
  const fields: Partial<Record<TranslatedField, string>> = {};
  // Replacing a node's children never shifts the indexes of other slots (paths point at blocks).
  plan.slots.forEach((slot, i) => {
    const value = translated[i];
    if (slot.kind === 'field') {
      fields[slot.field] = plainText(value);
      return;
    }
    const node = nodeAt(document, slot.path);
    // Raw value (decodeEntities: false): escape & here, the serializer turns " into &quot;.
    if (slot.kind === 'alt' && node instanceof Element)
      node.attribs.alt = plainText(value).replace(/&/g, '&amp;');
    else if (slot.kind === 'text' && isText(node)) node.data = escapeText(plainText(value));
    else if (slot.kind === 'inner' && node instanceof Element) {
      const parsed = parseDocument(value, { decodeEntities: false });
      node.children = parsed.children;
      for (const child of node.children) child.parent = node;
    }
  });
  return { fields, body: render(document, { decodeEntities: false, emptyAttrs: true }) };
}

/** A field or attribute is plain text: drop any markup the model may have added. */
function plainText(value: string): string {
  return value.replace(/<[^>]*>/g, '').trim();
}

function escapeText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * What a reviewer should check: segments whose numbers (prices, times, weights) or inline tags
 * differ from the source. Indexes into the plan's segments.
 */
export function reviewWarnings(
  source: string[],
  translated: string[],
): { index: number; kind: 'numbers' | 'markup' }[] {
  const numbers = (s: string) =>
    (s.replace(/<[^>]*>/g, ' ').match(/\d+(?:[.,:]\d+)*/g) ?? []).sort().join('|');
  const tags = (s: string) =>
    (s.match(/<\/?([a-z0-9]+)/gi) ?? []).map((t) => t.toLowerCase()).join('|');
  const warnings: { index: number; kind: 'numbers' | 'markup' }[] = [];
  source.forEach((segment, index) => {
    const out = translated[index] ?? '';
    if (numbers(segment) !== numbers(out)) warnings.push({ index, kind: 'numbers' });
    else if (tags(segment) !== tags(out)) warnings.push({ index, kind: 'markup' });
  });
  return warnings;
}
