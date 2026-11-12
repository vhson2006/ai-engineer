'use client';

import { useEffect } from 'react';

/**
 * Smooth, eased scrolling to in-page sections (single-page sites): the usual "scroll to anchor"
 * behaviour, a bit slower and softer than the browser's native smooth scroll.
 *
 * - Duration grows with the distance (600–1100 ms), ease-in-out cubic.
 * - Honors the target's `scroll-margin-top` (sticky header offset), re-measured while scrolling.
 * - Stops as soon as the visitor scrolls themselves (wheel, touch, keys).
 * - `prefers-reduced-motion`: jumps instantly.
 * - Afterwards the URL hash is updated (shareable, Back works) and focus moves to the section
 *   (keyboard and screen-reader users continue from there).
 */
/**
 * The element's top in the document from LAYOUT (offsetTop chain): transforms don't count, so a
 * section still lifted by a <Reveal> animation (translateY) is measured where it will settle.
 */
function layoutTop(element: HTMLElement): number {
  let top = 0;
  for (let node: HTMLElement | null = element; node; node = node.offsetParent as HTMLElement | null) top += node.offsetTop;
  return top;
}

export function scrollToElement(target: HTMLElement, options: { updateHash?: boolean } = {}) {
  const { updateHash = true } = options;
  const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
  const start = window.scrollY;
  // Re-measured on every frame: content above may still move (images loading, lazy sections).
  const endNow = () => Math.max(0, Math.round(layoutTop(target) - margin));
  const distance = endNow() - start;

  const finish = () => {
    if (updateHash && target.id && window.location.hash !== `#${target.id}`) {
      window.history.pushState(null, '', `#${target.id}`);
    }
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  };

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || Math.abs(distance) < 2) {
    // 'instant' overrides the CSS `scroll-behavior: smooth` of the theme.
    window.scrollTo({ top: endNow(), behavior: 'instant' });
    finish();
    return;
  }

  const duration = Math.min(1100, Math.max(600, 400 + Math.abs(distance) * 0.15));
  const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  let startTime: number | undefined;
  let frame = 0;

  const cancel = () => {
    cancelAnimationFrame(frame);
    window.removeEventListener('wheel', cancel);
    window.removeEventListener('touchstart', cancel);
    window.removeEventListener('keydown', cancel);
  };
  window.addEventListener('wheel', cancel, { passive: true });
  window.addEventListener('touchstart', cancel, { passive: true });
  window.addEventListener('keydown', cancel);

  const step = (now: number) => {
    startTime ??= now;
    const progress = Math.min(1, (now - startTime) / duration);
    window.scrollTo({ top: start + (endNow() - start) * ease(progress), behavior: 'instant' });
    if (progress < 1) {
      frame = requestAnimationFrame(step);
    } else {
      cancel();
      finish();
    }
  };
  frame = requestAnimationFrame(step);
}

/** The section an in-page link points to, or null (other page, other origin, no such id). */
export function sectionFromLink(anchor: HTMLAnchorElement): HTMLElement | null {
  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin || url.pathname !== window.location.pathname || !url.hash) return null;
  return document.getElementById(decodeURIComponent(url.hash.slice(1)));
}

/**
 * Put once in the layout: every same-page anchor link (`#menu`, `/vi#menu`) scrolls smoothly.
 * Links whose click handler already called `preventDefault()` are left alone.
 */
export function SmoothScroll() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.('a[href]');
      if (!(anchor instanceof HTMLAnchorElement) || (anchor.target && anchor.target !== '_self')) return;
      const target = sectionFromLink(anchor);
      if (!target) return;
      event.preventDefault();
      scrollToElement(target);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
  return null;
}
