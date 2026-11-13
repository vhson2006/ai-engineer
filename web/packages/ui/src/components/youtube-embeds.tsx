'use client';

import { useEffect } from 'react';
import { YOUTUBE_ID } from './youtube';

/**
 * Plays the YouTube embeds of article bodies (ADR 0040) where they are: a click on a facade
 * (`withYouTubeFacades`, `@web/ui/youtube`) replaces it with the youtube-nocookie.com player.
 * A click with a modifier key (new tab) keeps the plain link. Render once on the article page;
 * the site's CSP must allow frame-src https://www.youtube-nocookie.com and img-src https://i.ytimg.com.
 */
export function YouTubeEmbeds() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('.article-layout a.tpl-youtube-play[data-youtube]');
      const id = link?.dataset.youtube;
      if (!link || !id || !YOUTUBE_ID.test(id)) return;
      event.preventDefault();
      const player = document.createElement('iframe');
      player.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1`;
      player.title = link.getAttribute('aria-label') ?? 'YouTube';
      player.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen; web-share';
      player.allowFullscreen = true;
      player.referrerPolicy = 'strict-origin-when-cross-origin';
      player.className = 'tpl-youtube-frame';
      link.replaceWith(player);
      player.focus();
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
  return null;
}
