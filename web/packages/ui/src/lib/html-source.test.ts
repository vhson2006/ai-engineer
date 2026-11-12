import { describe, expect, it } from 'vitest';
import { formatHtml, hasLayoutBlocks, htmlInventory, removedOnSave } from './html-source';

describe('hasLayoutBlocks', () => {
  it('spots what the visual editor would drop', () => {
    expect(hasLayoutBlocks('<section class="tpl-cols"><p>a</p></section>')).toBe(true);
    expect(hasLayoutBlocks('<figure><img src="/a.jpg" alt="" /></figure>')).toBe(true);
    expect(hasLayoutBlocks('<p class="tpl-lead">a</p>')).toBe(true);
  });

  it('plain editor HTML has none', () => {
    expect(hasLayoutBlocks('<h2>T</h2><p><strong>b</strong> <a href="/x">x</a></p><ul><li>a</li></ul>')).toBe(false);
    expect(hasLayoutBlocks('')).toBe(false);
  });
});

describe('formatHtml', () => {
  it('one block per line, nested blocks indented, inline content kept on its line', () => {
    expect(formatHtml('<section class="tpl-cols"><div><h3>A</h3><p>x <strong>y</strong></p></div><hr /></section>')).toBe(
      [
        '<section class="tpl-cols">',
        '  <div>',
        '    <h3>A</h3>',
        '    <p>x <strong>y</strong></p>',
        '  </div>',
        '  <hr />',
        '</section>',
      ].join('\n'),
    );
  });

  it('lists and figures', () => {
    expect(formatHtml('<ul><li>a</li><li>b</li></ul><figure><img src="/a.jpg" alt="a" /><figcaption>c</figcaption></figure>')).toBe(
      ['<ul>', '  <li>a</li>', '  <li>b</li>', '</ul>', '<figure>', '  <img src="/a.jpg" alt="a" />', '  <figcaption>c</figcaption>', '</figure>'].join('\n'),
    );
  });

  it('is stable: formatting twice changes nothing, and the text is kept', () => {
    const html = '<p>Hello <em>there</em></p><blockquote><p>q</p></blockquote>';
    const once = formatHtml(html);
    expect(formatHtml(once)).toBe(once);
    expect(once.replace(/\s+/g, '')).toBe(html.replace(/\s+/g, ''));
  });
});

describe('removedOnSave', () => {
  it('nothing removed: same tags and classes (rel added, spacing changed)', () => {
    const sent = '<p><a href="/x">x</a></p>\n<section class="tpl-cols"><div>a</div></section>';
    const stored = '<p><a href="/x" rel="noopener noreferrer nofollow">x</a></p><section class="tpl-cols"><div>a</div></section>';
    expect(removedOnSave(sent, stored)).toEqual([]);
  });

  it('lists the tags and classes the server dropped', () => {
    const sent = '<section class="tpl-cols my-box"><iframe src="x"></iframe><img src="https://e.com/a.png" /><p>a</p></section>';
    const stored = '<section class="tpl-cols"><p>a</p></section>';
    expect(removedOnSave(sent, stored).sort()).toEqual(['class:my-box', 'tag:iframe', 'tag:img']);
  });

  it('counts: one of two images removed still counts', () => {
    expect(removedOnSave('<img src="/a.jpg" /><img src="https://e.com/b.jpg" />', '<img src="/a.jpg" />')).toEqual(['tag:img']);
    expect(htmlInventory('<p class="a b"></p><p>').get('tag:p')).toBe(2);
  });
});
