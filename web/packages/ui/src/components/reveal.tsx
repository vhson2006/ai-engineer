'use client';

import { animate, inView } from 'motion';
import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Fades and lifts its content in when it scrolls into view, once (motion's `inView` + `animate`).
 *
 * Progressive enhancement: the server HTML is fully VISIBLE (no JavaScript, slow JavaScript,
 * crawlers and screen readers all get the content). After hydration, only an element that is
 * still below the viewport is hidden and then revealed on scroll, so nothing visible ever
 * flickers, and the server and client markup are identical (no hydration mismatch). Visitors who
 * prefer reduced motion get no animation at all.
 */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Already on screen (or above it): leave it as rendered.
    if (element.getBoundingClientRect().top < window.innerHeight) return;

    element.style.opacity = '0';
    element.style.transform = 'translateY(24px)';
    const stop = inView(
      element,
      () => {
        animate(element, { opacity: 1, transform: 'translateY(0px)' }, { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] });
      },
      { margin: '0px 0px -10% 0px' },
    );
    return () => {
      stop();
      element.style.opacity = '';
      element.style.transform = '';
    };
  }, [delay]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
