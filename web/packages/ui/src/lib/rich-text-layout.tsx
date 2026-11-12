'use client';

import {
  Extension,
  Node,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  createDocument,
  getHTMLFromFragment,
  mergeAttributes,
  type Editor,
  type NodeViewProps,
  useEditorState,
} from '@tiptap/react';
import type { Schema } from '@tiptap/pm/model';
import { ImageIcon } from 'lucide-react';
import { useId } from 'react';
import { removedOnSave } from './html-source';

/**
 * Layout blocks of article bodies (ADR 0033) in the visual editor. A few GENERIC nodes keep the
 * whole vocabulary (section, div, figure, figcaption, img + a `tpl-*` class on text blocks), so a
 * template opens, is edited and saved without losing a block. The editor only keeps; the server
 * decides (content-service drops any class or tag outside ARTICLE_HTML_CLASSES / _TAGS).
 *
 * In the editor: blocks are labelled frames (theme.css `.rich-text-layout`), not the sites' look;
 * images are cards (path + alt text), never loaded in admin.
 */

/** Keeps the `tpl-*` classes only: anything else (pasted Tailwind classes…) never reaches the admin DOM. */
export function layoutClass(value: string | null | undefined): string | null {
  const kept = (value ?? '').split(/\s+/).filter((name) => /^tpl-[a-z0-9-]+$/.test(name));
  return kept.length ? kept.join(' ') : null;
}

const classAttribute = {
  default: null,
  keepOnSplit: false, // Enter after a "lead" paragraph starts a plain one
  parseHTML: (element: HTMLElement) => layoutClass(element.getAttribute('class')),
  renderHTML: (attributes: Record<string, unknown>) => (attributes.class ? { class: attributes.class } : {}),
};

/** `class` on StarterKit's blocks (p.tpl-lead, ul.tpl-check…) and `id` on headings (table of contents). */
const LayoutAttributes = Extension.create({
  name: 'layoutAttributes',
  addGlobalAttributes() {
    return [
      { types: ['paragraph', 'heading', 'blockquote', 'bulletList', 'orderedList', 'horizontalRule'], attributes: { class: classAttribute } },
      {
        types: ['heading'],
        attributes: {
          id: {
            default: null,
            keepOnSplit: false,
            parseHTML: (element: HTMLElement) => {
              const id = element.getAttribute('id');
              return id && /^[a-z0-9][a-z0-9-]*$/i.test(id) ? id : null;
            },
            renderHTML: (attributes: Record<string, unknown>) => (attributes.id ? { id: attributes.id } : {}),
          },
        },
      },
    ];
  },
});

const container = (name: string, tag: 'section' | 'div', parse: { tag: string; context?: string; getAttrs?: (element: HTMLElement) => false | null }[]) =>
  Node.create({
    name,
    group: 'block',
    content: 'block+',
    defining: true,
    isolating: true, // Backspace at a block's start doesn't merge it into what's before
    addAttributes: () => ({ class: classAttribute }),
    parseHTML: () => parse,
    renderHTML: ({ HTMLAttributes }) => [tag, HTMLAttributes, 0],
  });

const LayoutSection = container('layoutSection', 'section', [{ tag: 'section' }]);
// A div is a block when it has a tpl class or sits in a block (columns); other divs (pasted
// pages) are unwrapped, their content kept.
const LayoutDiv = container('layoutDiv', 'div', [
  { tag: 'div', getAttrs: (element) => (layoutClass(element.getAttribute('class')) ? null : false) },
  { tag: 'div', context: 'layoutSection/|layoutDiv/' },
]);

const Figure = Node.create({
  name: 'figure',
  group: 'block',
  content: 'layoutImage figcaption?',
  defining: true,
  isolating: true,
  addAttributes: () => ({ class: classAttribute }),
  parseHTML: () => [{ tag: 'figure' }],
  renderHTML: ({ HTMLAttributes }) => ['figure', HTMLAttributes, 0],
});

const Figcaption = Node.create({
  name: 'figcaption',
  content: 'inline*',
  defining: true,
  parseHTML: () => [{ tag: 'figcaption' }],
  renderHTML: ({ HTMLAttributes }) => ['figcaption', HTMLAttributes, 0],
});

export interface RichTextLayoutImageLabels {
  /** Card title, e.g. "Image". */
  image: string;
  /** The path field, e.g. "File (/images/…)". */
  src: string;
  /** The alt text field. */
  alt: string;
  /** Opens the app's media library (shown when `pickImage` is given). */
  pick: string;
}

/** An image chosen in the app's media library (ADR 0034): optimized sizes on the CDN. */
export interface PickedImage {
  url: string;
  srcset: string;
  width: number;
  height: number;
}

/** Images of a media library: `…/media/<site>/<uuid>/<width>.webp|jpg` (shown as a thumbnail). */
const MEDIA_IMAGE = /^https?:\/\/[^/]+(\/[^?#]*)?\/media\/[a-z0-9-]+\/[0-9a-f-]{36}\/\d{1,4}\.(webp|jpg)$/;
/** The body column of the sites is ~48rem: the browser picks the right size from srcset. */
const BODY_SIZES = '(min-width: 768px) 48rem, 100vw';

const plainAttribute = (name: string) => ({
  default: null,
  parseHTML: (element: HTMLElement) => element.getAttribute(name),
  renderHTML: (attributes: Record<string, unknown>) => (attributes[name] ? { [name]: attributes[name] } : {}),
});

interface ImageOptions {
  labels?: RichTextLayoutImageLabels;
}
type ImagePicker = () => Promise<PickedImage | null>;
interface ImageStorage {
  /** The app's media library, set by RichTextEditor (setImagePicker); none: no "choose" button. */
  pickImage?: ImagePicker;
}

const LayoutImage = Node.create<ImageOptions>({
  name: 'layoutImage',
  group: 'block',
  atom: true,
  draggable: true,
  addOptions: () => ({ labels: undefined }),
  addStorage: (): ImageStorage => ({ pickImage: undefined }),
  addAttributes: () => ({
    src: { default: '', parseHTML: (element: HTMLElement) => element.getAttribute('src') ?? '' },
    srcset: plainAttribute('srcset'),
    sizes: plainAttribute('sizes'),
    alt: { default: '', parseHTML: (element: HTMLElement) => element.getAttribute('alt') ?? '' },
    width: plainAttribute('width'),
    height: plainAttribute('height'),
    loading: plainAttribute('loading'),
  }),
  parseHTML: () => [{ tag: 'img[src]' }],
  renderHTML: ({ HTMLAttributes }) => ['img', mergeAttributes(HTMLAttributes)],
  addNodeView() {
    // Without labels (tests, headless), the default rendering (an <img>) is used.
    return this.options.labels ? ReactNodeViewRenderer(ImageCard) : null;
  },
});

/**
 * An image in the editor: its path and alt text, editable, and (with `pickImage`) a button to
 * choose or upload one in the media library. Only images of a media library are shown (a small
 * thumbnail from the CDN, allowed by the admin's CSP); other paths are the sites' own files.
 */
function ImageCard({ node, updateAttributes, extension, editor, selected }: NodeViewProps) {
  const { labels } = extension.options as { labels: RichTextLayoutImageLabels };
  // Read on every transaction: setImagePicker dispatches one when the app's picker changes.
  const pickImage = useEditorState({ editor, selector: ({ editor: e }) => imageStorage(e)?.pickImage });
  const id = useId();
  const field =
    'h-8 w-full min-w-0 rounded-md border border-border bg-bg px-2 text-[13px] text-fg outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/20 read-only:opacity-70';
  const attrs = node.attrs as { src: string; alt: string; srcset: string | null };
  const preview = MEDIA_IMAGE.test(attrs.src);
  const choose = async () => {
    const picked = await pickImage?.();
    if (!picked) return;
    updateAttributes({ src: picked.url, srcset: picked.srcset, sizes: BODY_SIZES, width: String(picked.width), height: String(picked.height), loading: 'lazy' });
  };
  return (
    <NodeViewWrapper
      data-slot="layout-image"
      className={`my-1 flex gap-3 rounded-lg border border-dashed border-border bg-surface-2/60 p-2.5 ${selected ? 'ring-2 ring-brand/40' : ''}`}
    >
      <div data-drag-handle className="flex size-14 shrink-0 cursor-grab items-center justify-center overflow-hidden rounded-md bg-surface text-muted" title={labels.image}>
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={attrs.src} srcSet={attrs.srcset ?? undefined} sizes="56px" alt="" className="size-full object-cover" draggable={false} />
        ) : (
          <ImageIcon aria-hidden className="size-5" />
        )}
      </div>
      <div className="grid min-w-0 flex-1 gap-1.5">
        <div className="grid gap-1.5 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <label className="grid gap-0.5 text-[11px] font-medium text-subtle" htmlFor={`${id}-src`}>
            {labels.src}
            <input
              id={`${id}-src`}
              value={attrs.src}
              readOnly={!editor.isEditable}
              spellCheck={false}
              // A typed path is not a library image: its sizes no longer apply.
              onChange={(event) => updateAttributes({ src: event.target.value, srcset: null, sizes: null })}
              className={`${field} font-mono`}
            />
          </label>
          <label className="grid gap-0.5 text-[11px] font-medium text-subtle" htmlFor={`${id}-alt`}>
            {labels.alt}
            <input
              id={`${id}-alt`}
              value={attrs.alt}
              readOnly={!editor.isEditable}
              onChange={(event) => updateAttributes({ alt: event.target.value })}
              className={field}
            />
          </label>
        </div>
        {pickImage && editor.isEditable && (
          <button
            type="button"
            onClick={() => void choose()}
            className="inline-flex h-7 w-fit items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-xs font-medium text-fg hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-brand"
          >
            <ImageIcon aria-hidden className="size-3.5" />
            {labels.pick}
          </button>
        )}
      </div>
    </NodeViewWrapper>
  );
}

/** The extensions to add to StarterKit for layout blocks (labels: the image card; omit headless). */
export function layoutExtensions(labels?: RichTextLayoutImageLabels) {
  return [LayoutAttributes, LayoutSection, LayoutDiv, Figure, Figcaption, LayoutImage.configure({ labels })];
}

function imageStorage(editor: Editor): ImageStorage | undefined {
  return (editor.storage as unknown as Record<string, ImageStorage | undefined>).layoutImage;
}

/** The media library the image cards' "choose" button opens (undefined: no button). */
export function setImagePicker(editor: Editor, pickImage: ImagePicker | undefined): void {
  const image = imageStorage(editor);
  if (!image || image.pickImage === pickImage) return;
  image.pickImage = pickImage;
  // Re-render the cards so the button appears or goes.
  editor.view.dispatch(editor.state.tr.setMeta('imagePicker', true));
}

/**
 * What the visual editor would lose from `html` (tags/classes, as `removedOnSave` lists them):
 * parsed with the editor's schema and written back. Empty when the visual editor keeps it all.
 * Needs a DOM (browser, or jsdom in tests).
 */
export function lostInVisualEditor(html: string, schema: Schema): string[] {
  if (!html.trim()) return [];
  const doc = createDocument(html, schema, { preserveWhitespace: false });
  return removedOnSave(html, getHTMLFromFragment(doc.content, schema));
}

/**
 * The editor's HTML as it is emitted: '' when empty, without the empty paragraphs StarterKit's
 * trailing node keeps after a final block (so the cursor can go below it).
 */
export function editorHtml(editor: Editor): string {
  return editor.isEmpty ? '' : editor.getHTML().replace(/(<p><\/p>)+$/, '');
}

/* ---------- insert menu ---------- */

export const LAYOUT_BLOCKS = ['note', 'tip', 'warn', 'summary', 'columns', 'cards', 'steps', 'split', 'image', 'pull', 'faq', 'cta'] as const;
export type LayoutBlock = (typeof LAYOUT_BLOCKS)[number];

export interface RichTextLayoutLabels extends RichTextLayoutImageLabels {
  /** The insert menu's button. */
  insert: string;
  /** Unwrap the block around the cursor (its content stays). */
  unwrap: string;
  /** Delete the block around the cursor, content included. */
  remove: string;
  /** Names of the blocks in the insert menu (also their placeholder heading). */
  blocks: Record<LayoutBlock, string>;
  /** Placeholder text in new blocks. */
  text: string;
}

const PLACEHOLDER_IMAGE = '/images/placeholder/16x9.svg'; // every site ships /images/placeholder/*

/** The HTML a block starts with (same shapes as the templates). Labels are escaped. */
export function layoutBlockHtml(block: LayoutBlock, labels: Pick<RichTextLayoutLabels, 'blocks' | 'text'>): string {
  const name = escapeHtml(labels.blocks[block]);
  const text = escapeHtml(labels.text);
  const item = (cls = ' class="tpl-item"') => `<div${cls}><h3>${name}</h3><p>${text}</p></div>`;
  const image = `<img src="${PLACEHOLDER_IMAGE}" alt="" loading="lazy">`;
  switch (block) {
    case 'note':
    case 'tip':
    case 'warn':
      return `<section class="tpl-callout tpl-${block}"><h3>${name}</h3><p>${text}</p></section>`;
    case 'summary':
      return `<section class="tpl-summary"><h3>${name}</h3><ul class="tpl-check"><li><p>${text}</p></li><li><p>${text}</p></li></ul></section>`;
    case 'columns':
      return `<section class="tpl-cols">${item('')}${item('')}</section>`;
    case 'cards':
      return `<section class="tpl-cards">${item()}${item()}${item()}</section>`;
    case 'steps':
      return `<section class="tpl-steps">${item()}${item()}${item()}</section>`;
    case 'split':
      return `<section class="tpl-split"><div class="tpl-media"><figure>${image}</figure></div><div class="tpl-body"><h2>${name}</h2><p>${text}</p></div></section>`;
    case 'image':
      return `<figure class="tpl-wide">${image}<figcaption>${text}</figcaption></figure>`;
    case 'pull':
      return `<blockquote class="tpl-pull"><p>${text}</p></blockquote>`;
    case 'faq':
      return `<section class="tpl-faq">${item()}${item()}</section>`;
    case 'cta':
      return `<section class="tpl-cta"><h3>${name}</h3><p>${text}</p></section>`;
  }
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** The innermost block (section / div / figure / tpl blockquote) around the selection, if any. */
export function currentLayoutBlock(editor: Editor): { name: string; depth: number } | null {
  const { $from } = editor.state.selection;
  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth);
    if (['layoutSection', 'layoutDiv', 'figure'].includes(node.type.name)) return { name: node.type.name, depth };
  }
  return null;
}

/** Unwraps the block around the cursor: its content stays in place. */
export function unwrapLayoutBlock(editor: Editor): boolean {
  const block = currentLayoutBlock(editor);
  if (!block || block.name === 'figure') return false;
  const { $from } = editor.state.selection;
  const start = $from.before(block.depth);
  const node = $from.node(block.depth);
  return editor.chain().focus().insertContentAt({ from: start, to: start + node.nodeSize }, node.content.toJSON() as object[]).run();
}

/** Deletes the block around the cursor, content included. */
export function removeLayoutBlock(editor: Editor): boolean {
  const block = currentLayoutBlock(editor);
  if (!block) return false;
  const { $from } = editor.state.selection;
  const start = $from.before(block.depth);
  return editor.chain().focus().deleteRange({ from: start, to: start + $from.node(block.depth).nodeSize }).run();
}
