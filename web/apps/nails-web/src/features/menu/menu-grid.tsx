'use client';

import { ArrowUpRight } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { format } from '@web/core/i18n/format';
import { cn } from '@web/ui';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@web/ui/dialog';
import { pill } from '@/components/pill';
import { useBooking } from '@/features/booking/booking-provider';

export type MenuCard = {
  id: string;
  name: string;
  blurb: string;
  from: string;
  /** Card fill class (bg-mint…). */
  tint: string;
  /** The first few lines of the category, as a teaser. */
  teaser: { name: string; price: string }[];
  more: number;
  /** The full price tables, rendered on the server. */
  content: ReactNode;
  bookable: boolean;
};

/** Bento grid of menu categories; a card opens the category's full price list. */
export function MenuGrid({ cards, labels }: { cards: MenuCard[]; labels: { viewAll: string; more: string; book: string; close: string } }) {
  const [selected, setSelected] = useState<MenuCard | null>(null);
  const [open, setOpen] = useState(false);
  const booking = useBooking();

  return (
    <>
      <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        {cards.map((card, index) => (
          // Four wide cards make 8 categories fill three rows of four exactly.
          <li key={card.id} className={cn([0, 3, 4, 7].includes(index) && 'lg:col-span-2')}>
            <button
              type="button"
              onClick={() => {
                setSelected(card);
                setOpen(true);
              }}
              className={cn(
                'group flex size-full cursor-pointer flex-col rounded-3xl p-6 text-left sm:p-7',
                'transition duration-500 ease-out hover:-translate-y-1 hover:shadow-xl hover:shadow-[#263238]/[0.06] motion-reduce:transform-none',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
                card.tint,
              )}
            >
              <span className="flex items-start justify-between gap-3">
                <span className="text-2xl font-extrabold tracking-[-0.03em]">{card.name}</span>
                <span
                  aria-hidden
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-white/80 text-[#263238] transition-transform duration-500 group-hover:rotate-45 dark:bg-white/10 dark:text-fg"
                >
                  <ArrowUpRight className="size-4" />
                </span>
              </span>
              <span className="mt-2 block text-sm text-muted">{card.blurb}</span>
              <span className="mt-5 block flex-1 space-y-1.5 text-sm">
                {card.teaser.map((line) => (
                  <span key={line.name} className="flex items-baseline gap-2">
                    <span className="truncate">{line.name}</span>
                    <span aria-hidden className="min-w-4 flex-1 border-b border-dashed border-current opacity-20" />
                    <span className="font-semibold tabular-nums">{line.price}</span>
                  </span>
                ))}
              </span>
              <span className="mt-5 flex items-center justify-between gap-3 text-sm">
                <span className="rounded-full bg-white/80 px-3 py-1 font-bold text-[#263238] dark:bg-white/10 dark:text-fg">{card.from}</span>
                <span className="font-semibold text-muted">{card.more > 0 ? format(labels.more, { count: card.more }) : labels.viewAll}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent closeLabel={labels.close} className="max-w-2xl gap-0 rounded-3xl border-0 bg-bg p-0">
          {selected && (
            <>
              <div className={cn('px-6 pt-7 pb-6 sm:px-8', selected.tint)}>
                <DialogTitle className="pr-8 text-3xl font-extrabold tracking-[-0.03em]">{selected.name}</DialogTitle>
                <DialogDescription className="mt-1 text-sm text-muted">{selected.blurb}</DialogDescription>
              </div>
              <div className="px-6 py-6 sm:px-8">{selected.content}</div>
              {selected.bookable && (
                <div className="border-t border-border px-6 py-4 sm:px-8">
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      booking.open({ group: selected.id });
                    }}
                    className={pill('ink', 'md', 'w-full sm:w-auto')}
                  >
                    {labels.book}
                    <ArrowUpRight aria-hidden />
                  </button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
