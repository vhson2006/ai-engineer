'use client';

import { useEffect, useState } from 'react';
import { format } from '@web/core/i18n/format';
import { cn } from '@web/ui';
import type { HoursRow } from '@/features/booking/slots';
import type { Locale } from '@web/site-kit/locales';
import { website } from '@/website';
import type { Messages } from '@/i18n/dictionaries';
import { formatTime } from '@/lib/format';
import { openStatus, salonClock, type OpenStatus } from '@/lib/open-status';

/**
 * "● Taking guests now · Open until 7:00 PM", computed in the browser on the salon's clock (the
 * page is prerendered, so the server can't know the time) and refreshed every minute.
 */
export function OpenStatusBadge({
  hours,
  timeZone,
  locale,
  labels,
}: {
  hours: readonly HoursRow[];
  timeZone: string;
  locale: Locale;
  labels: Messages['status'];
}) {
  const [status, setStatus] = useState<OpenStatus | null>(null);

  useEffect(() => {
    const update = () => setStatus(openStatus(hours, salonClock(new Date(), timeZone)));
    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, [hours, timeZone]);

  let title = labels.checking;
  let detail = '';
  if (status?.open) {
    title = labels.open;
    detail = format(labels.closesAt, { time: formatTime(locale, status.closes) });
  } else if (status) {
    title = labels.closed;
    if (status.opens) {
      const { inDays, weekday, time } = status.opens;
      // Any date with that weekday (2026-11-01 is a Sunday) gives the localized weekday name.
      const day =
        inDays === 0
          ? labels.today
          : inDays === 1
            ? labels.tomorrow
            : new Intl.DateTimeFormat(website.intl(locale), { weekday: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, 10, 1 + weekday)));
      detail = format(labels.opensAt, { day, time: formatTime(locale, time) });
    }
  }

  return (
    <div aria-live="polite">
      <p className="inline-flex items-center gap-2 rounded-full bg-white/75 px-3 py-1.5 text-xs font-bold text-[#263238] backdrop-blur dark:bg-white/10 dark:text-fg">
        <span aria-hidden className="relative flex size-2">
          {status?.open && <span className="absolute inline-flex size-full animate-ping rounded-full bg-mint-strong opacity-75 motion-reduce:hidden" />}
          <span className={cn('relative inline-flex size-2 rounded-full', status?.open ? 'bg-mint-strong' : status ? 'bg-rose-strong' : 'bg-subtle')} />
        </span>
        {title}
      </p>
      <p className="mt-3 min-h-[1.5rem] text-lg font-bold">{detail}</p>
    </div>
  );
}
