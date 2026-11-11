'use client';

import { Pause, Play } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { format } from '@web/core/i18n/format';
import { cn } from '@web/ui';

const INTERVAL = 3800;

/**
 * Cross-fading slideshow of featured looks (slides rendered on the server). Auto-plays, pauses
 * on hover/focus and with the pause button; no auto-play with reduced motion.
 */
export function FeaturedCarousel({
  slides,
  labels,
}: {
  slides: { id: string; name: string; node: ReactNode }[];
  labels: { title: string; slide: string; pause: string; play: string };
}) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [hover, setHover] = useState(false);

  useEffect(() => {
    // Reduced motion: no auto-play (the dots still work).
    if (!playing || hover || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % slides.length), INTERVAL);
    return () => window.clearInterval(timer);
  }, [playing, hover, slides.length]);

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={labels.title}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      onFocusCapture={() => setHover(true)}
      onBlurCapture={() => setHover(false)}
      className="absolute inset-0"
    >
      {slides.map((slide, i) => (
        <div
          key={slide.id}
          aria-hidden={i !== index}
          className={cn(
            'absolute inset-0 transition-all duration-700 ease-out motion-reduce:transition-none',
            i === index ? 'scale-100 opacity-100' : 'pointer-events-none scale-[1.04] opacity-0',
          )}
        >
          {slide.node}
        </div>
      ))}

      <div className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-3">
        <p aria-live="polite" className="rounded-full bg-white/80 px-3 py-1.5 text-xs font-semibold text-[#263238] backdrop-blur">
          {slides[index].name}
        </p>
        <div className="flex items-center gap-1.5 rounded-full bg-white/80 px-2 py-1.5 backdrop-blur">
          {slides.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              aria-label={format(labels.slide, { number: i + 1 })}
              aria-current={i === index}
              onClick={() => setIndex(i)}
              className={cn(
                'h-1.5 cursor-pointer rounded-full transition-all duration-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#263238]',
                i === index ? 'w-5 bg-[#263238]' : 'w-1.5 bg-[#263238]/30 hover:bg-[#263238]/60',
              )}
            />
          ))}
          <button
            type="button"
            aria-label={playing ? labels.pause : labels.play}
            onClick={() => setPlaying((value) => !value)}
            className="ml-1 inline-flex size-5 cursor-pointer items-center justify-center rounded-full text-[#263238] focus-visible:outline-2 focus-visible:outline-[#263238]"
          >
            {playing ? <Pause aria-hidden className="size-3" /> : <Play aria-hidden className="size-3" />}
          </button>
        </div>
      </div>
    </div>
  );
}
