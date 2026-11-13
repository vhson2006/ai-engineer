/**
 * YouTube embeds of article bodies (ADR 0040). An article stores only
 * `<figure class="tpl-youtube[ tpl-short]" data-youtube="<id>">` (content-service checks the id);
 * the sites turn it into a "facade" here: a link to the video with its thumbnail, which
 * <YouTubeEmbeds /> (`@web/ui/youtube-embeds`) swaps for the youtube-nocookie.com player on click.
 * Nothing loads from YouTube before that click but the thumbnail (i.ytimg.com); without JavaScript
 * the link opens the video on YouTube.
 *
 * No 'use client': pure functions for the server (the sites' article pages) and the editor.
 */

export const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
]);

/**
 * The video of a pasted YouTube link (watch?v=, youtu.be/, shorts/, embed/, live/) or a bare id;
 * `short`: a Shorts link (shown 9:16). Null for anything else.
 */
export function parseYouTubeUrl(input: string): { id: string; short: boolean } | null {
  const value = input.trim();
  if (YOUTUBE_ID.test(value)) return { id: value, short: false };
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  let id: string | null = null;
  let short = false;
  if (host === 'youtu.be') {
    id = url.pathname.split('/')[1] ?? null;
  } else if (YOUTUBE_HOSTS.has(host)) {
    const [, first, second] = url.pathname.split('/');
    if (first === 'watch') id = url.searchParams.get('v');
    else if (first === 'shorts' || first === 'embed' || first === 'live') {
      id = second ?? null;
      short = first === 'shorts';
    }
  }
  return id && YOUTUBE_ID.test(id) ? { id, short } : null;
}

const FIGURE = /<figure\b([^>]*)>/g;
const ID_ATTRIBUTE = /\sdata-youtube="([A-Za-z0-9_-]{11})"/;

function escapeAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Adds the facade (a link with the thumbnail and a play icon) at the start of every YouTube figure
 * of SANITIZED article HTML. `playLabel`: the link's accessible name (from the dictionaries).
 */
export function withYouTubeFacades(html: string, playLabel: string): string {
  return html.replace(FIGURE, (tag, attributes: string) => {
    const id = ID_ATTRIBUTE.exec(attributes)?.[1];
    if (!id) return tag;
    const short = /\bclass="[^"]*\btpl-short\b/.test(attributes);
    const href = short ? `https://www.youtube.com/shorts/${id}` : `https://www.youtube.com/watch?v=${id}`;
    return (
      `${tag}<a class="tpl-youtube-play" href="${href}" data-youtube="${id}" aria-label="${escapeAttribute(playLabel)}">` +
      `<img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="" loading="lazy" width="480" height="360">` +
      `<span class="tpl-youtube-icon" aria-hidden="true"></span></a>`
    );
  });
}
