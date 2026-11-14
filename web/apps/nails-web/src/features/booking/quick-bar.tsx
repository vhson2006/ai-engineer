'use client';

import { ArrowUpRight, ChevronDown, Phone, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { pill } from '@/components/pill';
import type { Messages } from '@/i18n/dictionaries';
import { useBooking } from './booking-provider';

/**
 * Quick booking bar, fixed to the bottom edge: pick a service, then "Book" opens the booking
 * dialog straight at the time step (or at the service step if none was picked).
 */
export function QuickBookingBar({ labels }: { labels: Messages['quick'] }) {
  const { open, data } = useBooking();
  const [service, setService] = useState('');

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-3 sm:pb-5">
      <div
        role="group"
        aria-label={labels.label}
        className="pointer-events-auto mx-auto flex max-w-2xl items-center gap-1.5 rounded-full bg-fg/95 p-1.5 text-bg shadow-2xl shadow-[#263238]/25 backdrop-blur-md"
      >
        <span className="hidden items-center gap-2 pr-1 pl-4 text-sm font-bold whitespace-nowrap md:inline-flex">
          <Sparkles aria-hidden className="size-4 text-mint-strong" />
          {labels.label}
        </span>
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">{labels.service}</span>
          <select
            value={service}
            onChange={(event) => setService(event.target.value)}
            className="h-11 w-full cursor-pointer appearance-none truncate rounded-full bg-bg/10 pr-9 pl-4 text-sm font-semibold text-bg outline-none transition-colors hover:bg-bg/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mint-strong"
          >
            <option value="" className="text-[#263238]">
              {labels.choose}
            </option>
            {data.groups.map((group) => (
              <optgroup key={group.id} label={group.name} className="text-[#263238]">
                {group.services.map((item) => (
                  <option key={item.id} value={item.id} className="text-[#263238]">
                    {item.name} · {item.price}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 opacity-70" />
        </label>
        <button type="button" onClick={() => open(service ? { service } : undefined)} className={pill('soft', 'md', 'bg-mint text-[#263238] hover:bg-white dark:bg-mint-strong')}>
          {labels.book}
          <ArrowUpRight aria-hidden />
        </button>
        <a
          href={data.phone.href}
          aria-label={labels.call}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-bg/10 transition hover:bg-bg/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mint-strong"
        >
          <Phone aria-hidden className="size-4" />
        </a>
      </div>
    </div>
  );
}
