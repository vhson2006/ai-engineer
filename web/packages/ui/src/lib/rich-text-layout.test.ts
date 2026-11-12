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
  lostInVisualEditor,
  removeLayoutBlock,
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
    const editor = new Editor({ element: document.createElement('div'), extensions, content: '<section class="tpl-callout tpl-note"><p class="tpl-lead">ab</p></section>' });
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
    const labels = { blocks: Object.fromEntries(LAYOUT_BLOCKS.map((b) => [b, `<${b}> & "x"`])) as Record<(typeof LAYOUT_BLOCKS)[number], string>, text: 'Nội dung' };
    const html = layoutBlockHtml(block, labels);
    expect(html).not.toMatch(/<(note|tip|warn|summary|columns|cards|steps|split|image|pull|faq|cta)>/); // labels escaped
    expect(lostInVisualEditor(html, schema)).toEqual([]);
  });
});
