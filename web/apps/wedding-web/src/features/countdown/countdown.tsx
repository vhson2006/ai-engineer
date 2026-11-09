'use client';

import { useEffect, useState } from 'react';

export interface CountdownLabels {
  label: string;
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
  today: string;
  after: string;
}

/**
 * Days / hours / minutes / seconds until the wedding. The server HTML shows placeholders (the page
 * is prerendered: "now" is only known in the browser), filled right after hydration.
 */
export function Countdown({ target, end, labels }: { target: string; end: string; labels: CountdownLabels }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const start = new Date(target).getTime();
  if (now !== null && now >= start) {
    return <p className="font-display text-2xl text-gold-light italic">{now < new Date(end).getTime() ? labels.today : labels.after}</p>;
  }

  const left = now === null ? null : Math.max(0, start - now);
  const units = [
    { label: labels.days, value: left === null ? null : Math.floor(left / 86_400_000) },
    { label: labels.hours, value: left === null ? null : Math.floor(left / 3_600_000) % 24 },
    { label: labels.minutes, value: left === null ? null : Math.floor(left / 60_000) % 60 },
    { label: labels.seconds, value: left === null ? null : Math.floor(left / 1000) % 60 },
  ];

  return (
    <div role="timer" aria-label={labels.label} className="flex justify-center gap-3 sm:gap-4">
      {units.map((unit, index) => (
        <div
          key={unit.label}
          // Only the days are announced; seconds ticking would flood screen readers.
          aria-hidden={index > 0 ? true : undefined}
          className="flex w-18 flex-col items-center rounded-2xl border border-white/25 bg-white/10 px-2 py-3 backdrop-blur-md sm:w-22"
        >
          <span className="font-display text-3xl leading-none font-semibold text-white tabular-nums sm:text-4xl">
            {unit.value === null ? '--' : String(unit.value).padStart(2, '0')}
          </span>
          <span className="mt-1.5 text-[0.65rem] tracking-[0.2em] text-white/75 uppercase">{unit.label}</span>
        </div>
      ))}
    </div>
  );
}
