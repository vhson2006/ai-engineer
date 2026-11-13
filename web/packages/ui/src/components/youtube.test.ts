import { describe, expect, it } from 'vitest';
import { parseYouTubeUrl, withYouTubeFacades } from './youtube';

const ID = 'dQw4w9WgXcQ';

describe('parseYouTubeUrl', () => {
  it.each([
    [`https://www.youtube.com/watch?v=${ID}&t=42s`, false],
    [`https://m.youtube.com/watch?v=${ID}`, false],
    [`youtube.com/watch?v=${ID}`, false],
    [`https://youtu.be/${ID}?si=abc`, false],
    [`https://www.youtube.com/embed/${ID}`, false],
    [`https://www.youtube-nocookie.com/embed/${ID}`, false],
    [`https://www.youtube.com/live/${ID}`, false],
    [`https://www.youtube.com/shorts/${ID}`, true],
    [`https://youtube.com/shorts/${ID}?feature=share`, true],
    [ID, false],
  ])('reads %s', (link, short) => {
    expect(parseYouTubeUrl(link)).toEqual({ id: ID, short });
  });

  it.each([
    '',
    'hello',
    `https://evil.dev/watch?v=${ID}`,
    `https://youtube.com.evil.dev/watch?v=${ID}`,
    `https://www.youtube.com/watch?v=${ID}x`,
    'https://www.youtube.com/channel/UCxyz',
    'javascript:alert(1)',
  ])('refuses %s', (link) => {
    expect(parseYouTubeUrl(link)).toBeNull();
  });
});

describe('withYouTubeFacades', () => {
  it('adds a thumbnail link to each YouTube figure (Shorts link for tpl-short), label escaped', () => {
    const html =
      `<p>a</p><figure class="tpl-youtube" data-youtube="${ID}"><figcaption>c</figcaption></figure>` +
      `<figure class="tpl-youtube tpl-short" data-youtube="${ID}"></figure><figure class="tpl-wide"><img src="/x.jpg"></figure>`;
    const out = withYouTubeFacades(html, 'Play "video"');
    expect(out).toContain(
      `<figure class="tpl-youtube" data-youtube="${ID}"><a class="tpl-youtube-play" href="https://www.youtube.com/watch?v=${ID}" data-youtube="${ID}" aria-label="Play &quot;video&quot;"><img src="https://i.ytimg.com/vi/${ID}/hqdefault.jpg" alt="" loading="lazy" width="480" height="360"><span class="tpl-youtube-icon" aria-hidden="true"></span></a><figcaption>c</figcaption></figure>`,
    );
    expect(out).toContain(`href="https://www.youtube.com/shorts/${ID}"`);
    expect(out).toContain('<figure class="tpl-wide"><img src="/x.jpg"></figure>');
  });

  it('leaves a figure without a valid id untouched', () => {
    const html = '<figure class="tpl-youtube" data-youtube="bad"></figure>';
    expect(withYouTubeFacades(html, 'Play')).toBe(html);
  });
});
