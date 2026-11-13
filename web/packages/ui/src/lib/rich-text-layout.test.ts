// @vitest-environment jsdom
import { Editor, generateHTML, generateJSON, getSchema } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { describe, expect, it } from 'vitest';
// The 10 laundry templates (content-service scripts/article-templates, Vietnamese): every block shape of ADR 0033.
import templates from './__fixtures__/layout-templates.json';
import { removedOnSave } from './html-source';
import {
  LAYOUT_BLOCKS,
  currentLayoutBlock,
  editorHtml,
  layoutBlockHtml,
  layoutClass,
  layoutExtensions,
  layoutVideoHtml,
  layoutYouTubeHtml,
  lostInVisualEditor,
  removeLayoutBlock,
  setImagePicker,
  unwrapLayoutBlock,
} from './rich-text-layout';

// The editor's extensions (rich-text-editor.tsx), headless: images render as <img>.
const extensions = [StarterKit.configure({ heading: { levels: [2, 3] }, link: { openOnClick: false } }), ...layoutExtensions()];
const schema = getSchema(extensions);
const roundTrip = (html: string) => generateHTML(generateJSON(html, extensions), extensions);

describe('layout blocks in the visual editor', () => {
  it.each(Object.entries(templates))('keeps every tag and class of the %s template', (_key, html) => {
    expect(removedOnSave(html, roundTrip(html))).toEqual([]);
    expect(lostInVisualEditor(html, schema)).toEqual([]);
  });

  it('keeps image attributes, heading ids and table-of-contents links', () => {
    const html = roundTrip(
      '<h2 id="gia">Giá</h2><p><a href="#gia">Giá</a></p><figure class="tpl-wide"><img src="/images/a.jpg" alt="A" width="800" height="600" loading="lazy"><figcaption>Chú thích</figcaption></figure>',
    );
    expect(html).toContain('<h2 id="gia">');
    expect(html).toContain('href="#gia"');
    expect(html).toContain('<img src="/images/a.jpg" alt="A" width="800" height="600" loading="lazy">');
    expect(html).toContain('<figcaption>Chú thích</figcaption>');
  });

  it('keeps the srcset and sizes of a media library image (ADR 0034)', () => {
    const img =
      '<img src="https://cdn.test/media/nails/7d0c4f3e-1b2a-4c5d-8e9f-0a1b2c3d4e5f/1280.webp" srcset="https://cdn.test/media/nails/7d0c4f3e-1b2a-4c5d-8e9f-0a1b2c3d4e5f/640.webp 640w, https://cdn.test/media/nails/7d0c4f3e-1b2a-4c5d-8e9f-0a1b2c3d4e5f/1280.webp 1280w" sizes="(min-width: 768px) 48rem, 100vw" alt="Shop" width="1280" height="853" loading="lazy">';
    expect(roundTrip(`<figure class="tpl-wide">${img}</figure>`)).toBe(`<figure class="tpl-wide">${img}</figure>`);
  });

  it('keeps a studio clip (ADR 0039) as a figure with its poster, size and caption', () => {
    const base = 'https://cdn.test/studio/nails/7d0c4f3e-1b2a-4c5d-8e9f-0a1b2c3d4e5f/video/0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d';
    const html = layoutVideoHtml({ src: `${base}-web.mp4`, poster: `${base}.jpg`, width: 720, height: 1280 }, 'Chú "thích" <x>');
    expect(html).toBe(
      `<figure class="tpl-video"><video src="${base}-web.mp4" poster="${base}.jpg" width="720" height="1280" controls playsinline preload="none"></video><figcaption>Chú &quot;thích&quot; &lt;x&gt;</figcaption></figure>`,
    );
    const kept = roundTrip(html);
    expect(removedOnSave(html, kept)).toEqual([]);
    expect(lostInVisualEditor(html, schema)).toEqual([]);
    expect(kept).toContain(
      `<video src="${base}-web.mp4" poster="${base}.jpg" width="720" height="1280" controls="" playsinline="" preload="none"></video>`,
    );
  });

  it('keeps a YouTube embed (ADR 0040): id, Shorts class, caption; a new one starts without a video', () => {
    const html = '<figure class="tpl-youtube tpl-short" data-youtube="dQw4w9WgXcQ"><figcaption>Xem nhé</figcaption></figure>';
    expect(roundTrip(html)).toBe(html);
    expect(lostInVisualEditor(html, schema)).toEqual([]);
    expect(roundTrip('<figure class="tpl-youtube" data-youtube="bad id"><figcaption>c</figcaption></figure>')).toBe(
      '<figure class="tpl-youtube" data-youtube=""><figcaption>c</figcaption></figure>',
    );
    expect(roundTrip(layoutYouTubeHtml('<b>'))).toBe('<figure class="tpl-youtube" data-youtube=""><figcaption>&lt;b&gt;</figcaption></figure>');
  });

  it('keeps only tpl-* classes (pasted classes never reach the admin page)', () => {
    expect(layoutClass('tpl-callout fixed inset-0 tpl-note')).toBe('tpl-callout tpl-note');
    expect(layoutClass('mso-normal')).toBeNull();
    expect(roundTrip('<p class="fixed tpl-lead">x</p>')).toBe('<p class="tpl-lead">x</p>');
  });

  it('unwraps plain divs of pasted pages, keeps column divs inside a block', () => {
    expect(roundTrip('<div><p>pasted</p></div>')).toBe('<p>pasted</p>');
    expect(roundTrip('<section class="tpl-cols"><div><p>a</p></div><div><p>b</p></div></section>')).toBe(
      '<section class="tpl-cols"><div><p>a</p></div><div><p>b</p></div></section>',
    );
  });

  it('Enter after a styled paragraph starts a plain one, inside the same block', () => {
    const editor = new Editor({
      element: document.createElement('div'),
      extensions,
      content: '<section class="tpl-callout tpl-note"><p class="tpl-lead">ab</p></section>',
    });
    editor.chain().setTextSelection(4).splitBlock().insertContent('c').run();
    expect(editorHtml(editor)).toBe('<section class="tpl-callout tpl-note"><p class="tpl-lead">ab</p><p>c</p></section>');
    editor.destroy();
  });

  it('unwraps or deletes the block around the cursor', () => {
    const content = '<p>a</p><section class="tpl-cta"><h3>b</h3><p>c</p></section>';
    const editor = new Editor({ element: document.createElement('div'), extensions, content });
    editor.commands.setTextSelection(6);
    expect(currentLayoutBlock(editor)?.name).toBe('layoutSection');
    unwrapLayoutBlock(editor);
    expect(editorHtml(editor)).toBe('<p>a</p><h3>b</h3><p>c</p>');
    editor.commands.setContent(content);
    editor.commands.setTextSelection(6);
    removeLayoutBlock(editor);
    expect(editorHtml(editor)).toBe('<p>a</p>');
    editor.destroy();
  });

  it('reports what plain StarterKit would drop', () => {
    const plain = getSchema([StarterKit]);
    expect(lostInVisualEditor('<section class="tpl-note"><p>x</p></section>', plain)).toEqual(['tag:section', 'class:tpl-note']);
    expect(lostInVisualEditor('<p>x</p>', plain)).toEqual([]);
  });

  it.each(LAYOUT_BLOCKS)('inserts a %s block that survives the editor', (block) => {
    const labels = {
      blocks: Object.fromEntries(LAYOUT_BLOCKS.map((b) => [b, `<${b}> & "x"`])) as Record<(typeof LAYOUT_BLOCKS)[number], string>,
      text: 'Nội dung',
    };
    const html = layoutBlockHtml(block, labels);
    expect(html).not.toMatch(/<(note|tip|warn|summary|columns|cards|steps|split|image|pull|faq|cta)>/); // labels escaped
    expect(lostInVisualEditor(html, schema)).toEqual([]);
  });
});

// RichTextEditor emits onChange only when the ROOT transaction changed the document: a meta-only
// dispatch (setImagePicker on mount) makes TrailingNode append a paragraph after a final heading
// or block, and Tiptap reports that as an update; emitting it sent the editor's own serialization
// of the stored body (not byte-equal to the server's HTML), which made a just-loaded form dirty.
describe('updates that are not edits', () => {
  it('a meta-only dispatch appends a trailing paragraph without the root transaction changing the doc', () => {
    const editor = new Editor({ extensions, content: '<p>a</p><h2>Prep</h2>' });
    const updates: boolean[] = [];
    editor.on('update', ({ transaction }) => updates.push(transaction.docChanged));
    setImagePicker(editor, () => Promise.resolve(null));
    expect(updates).toEqual([false]); // an update, but not an edit: RichTextEditor ignores it
    expect(editor.getHTML()).toBe('<p>a</p><h2>Prep</h2><p></p>');
    editor.commands.insertContent('b');
    expect(updates.at(-1)).toBe(true); // typing is an edit
    editor.destroy();
  });
});
