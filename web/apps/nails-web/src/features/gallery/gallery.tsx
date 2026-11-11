'use client';

import { ArrowUpRight, Plus } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { cn } from '@web/ui';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@web/ui/dialog';
import { pill } from '@/components/pill';
import { useBooking } from '@/features/booking/booking-provider';

export type GalleryLook = {
  id: string;
  category: string;
  name: string;
  text: string;
  /** Card fill class (bg-mint…). */
  tint: string;
  /** Tile art and the modal's large art: two renders, so drawn nails get distinct SVG ids. */
  cover: ReactNode;
  visual: ReactNode;
  /** Time, price breakdown and palette, rendered on the server. */
  details: ReactNode;
  /** The booking dialog service this look is booked as. */
  service: string;
};

/** Bento layout: the first tile of the current view is large, every fourth one wide. */
function shape(index: number) {
  if (index === 0) return 'col-span-2 row-span-2';
  if (index % 4 === 3) return 'col-span-2';
  return '';
}

/**
 * The nail art gallery: category filters (tiles glide with View Transitions where supported) and
 * a detail modal per look whose "Book this look" opens the booking dialog on its service.
 */
export function Gallery({
  looks,
  filters,
  labels,
}: {
  looks: GalleryLook[];
  filters: { id: string; label: string }[];
  labels: { filters: string; open: string; book: string; close: string };
}) {
  const [active, setActive] = useState('all');
  const [selected, setSelected] = useState<GalleryLook | null>(null);
  const [open, setOpen] = useState(false);
  const booking = useBooking();
  const visible = looks.filter((look) => active === 'all' || look.category === active);

  function choose(id: string) {
    const update = () => flushSync(() => setActive(id));
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce && typeof document.startViewTransition === 'function') document.startViewTransition(update);
    else update();
  }

  return (
    <div>
      <div role="group" aria-label={labels.filters} className="flex flex-wrap gap-2">
        {filters.map((filter) => {
          const pressed = filter.id === active;
          return (
            <button
              key={filter.id}
              type="button"
              aria-pressed={pressed}
              onClick={() => choose(filter.id)}
              className={cn(
                'h-10 cursor-pointer rounded-full px-5 text-sm font-semibold transition duration-300 active:scale-95',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
                pressed ? 'bg-fg text-bg' : 'bg-surface-2 hover:bg-lilac',
              )}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      <ul className="mt-8 grid auto-rows-[10.5rem] grid-flow-dense grid-cols-2 gap-3 sm:auto-rows-[13rem] sm:gap-4 md:grid-cols-4">
        {visible.map((look, index) => (
          <li key={look.id} style={{ viewTransitionName: `look-${look.id}` }} className={shape(index)}>
            <button
              type="button"
              onClick={() => {
                setSelected(look);
                setOpen(true);
              }}
              aria-label={`${look.name}: ${labels.open}`}
              className={cn(
                'group relative block size-full cursor-pointer overflow-hidden rounded-3xl text-left',
                'transition duration-500 ease-out hover:-translate-y-1 hover:shadow-xl hover:shadow-[#263238]/[0.08] motion-reduce:transform-none',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
                look.tint,
              )}
            >
              <span className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-105 motion-reduce:transform-none">{look.cover}</span>
              <span className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-2">
                <span className="rounded-full bg-white/85 px-3 py-1.5 text-xs font-bold text-[#263238] backdrop-blur">{look.name}</span>
                <span
                  aria-hidden
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[#263238] text-white transition-transform duration-500 group-hover:rotate-90"
                >
                  <Plus className="size-4" />
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent closeLabel={labels.close} className="max-w-3xl gap-0 overflow-hidden rounded-3xl border-0 bg-bg p-0 sm:grid-cols-[1fr_1.1fr]">
          {selected && (
            <>
              <div className={cn('relative min-h-60 sm:min-h-full', selected.tint)}>{selected.visual}</div>
              <div className="flex flex-col p-6 sm:p-8">
                <DialogTitle className="pr-8 text-3xl font-extrabold tracking-[-0.03em]">{selected.name}</DialogTitle>
                <DialogDescription className="mt-2 text-sm text-muted">{selected.text}</DialogDescription>
                <div className="mt-6 flex-1">{selected.details}</div>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    booking.open({ service: selected.service });
                  }}
                  className={pill('ink', 'lg', 'mt-6 w-full')}
                >
                  {labels.book}
                  <ArrowUpRight aria-hidden />
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
