'use client';

import { Minus, Plus, Scale } from 'lucide-react';
import { useId, useState } from 'react';
import { format } from '@web/core/i18n/format';
import { cn } from '@web/ui';
import { LOCALES, type Locale } from '@/i18n/locales';
import { formatVnd } from '@/lib/format';
import { estimate, type EstimateKind } from '@/lib/pricing';

export interface EstimatorLabels {
  title: string;
  intro: string;
  kind: string;
  clothes: string;
  bedding: string;
  weight: string;
  kg: string;
  decrease: string;
  increase: string;
  result: string;
  perLoad: string;
  perKg: string;
  ask: string;
  disclaimer: string;
}

const MIN = 0.5;
const MAX = 15;
const STEP = 0.5;

/** Price estimate by weight (computed in the browser from the shop's price board; nothing is sent). */
export function Estimator({ locale, labels }: { locale: Locale; labels: EstimatorLabels }) {
  const [kind, setKind] = useState<EstimateKind>('clothes');
  const [kg, setKg] = useState(3);
  const sliderId = useId();
  const result = estimate(kind, kg);
  const number = (value: number) => new Intl.NumberFormat(LOCALES[locale].intl, { maximumFractionDigits: 1 }).format(value);
  const clamp = (value: number) => Math.min(MAX, Math.max(MIN, Math.round(value / STEP) * STEP));

  return (
    <div className="rounded-[2rem] bg-brand p-6 text-brand-fg shadow-xl shadow-brand/20 sm:p-8">
      <div className="flex items-center gap-3">
        <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-sun text-deep">
          <Scale aria-hidden className="size-5" />
        </span>
        <div>
          <h3 className="font-display text-2xl leading-tight font-extrabold">{labels.title}</h3>
          <p className="text-sm opacity-85">{labels.intro}</p>
        </div>
      </div>

      <div role="group" aria-label={labels.kind} className="mt-6 grid grid-cols-2 gap-1 rounded-full bg-black/15 p-1">
        {(['clothes', 'bedding'] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={kind === option}
            onClick={() => setKind(option)}
            className={cn(
              'rounded-full px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sun',
              kind === option ? 'bg-sun text-deep shadow-sm' : 'text-brand-fg/85 hover:bg-white/10',
            )}
          >
            {labels[option]}
          </button>
        ))}
      </div>

      <label htmlFor={sliderId} className="mt-6 block text-sm font-semibold opacity-90">
        {labels.weight}
      </label>
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          aria-label={labels.decrease}
          onClick={() => setKg((value) => clamp(value - STEP))}
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-white/15 transition-colors hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-sun"
        >
          <Minus aria-hidden className="size-4" />
        </button>
        <input
          id={sliderId}
          type="range"
          min={MIN}
          max={MAX}
          step={STEP}
          value={kg}
          onChange={(event) => setKg(clamp(Number(event.target.value)))}
          aria-valuetext={format(labels.kg, { count: number(kg) })}
          className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-white/25 accent-[#ffd400]"
        />
        <button
          type="button"
          aria-label={labels.increase}
          onClick={() => setKg((value) => clamp(value + STEP))}
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-white/15 transition-colors hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-sun"
        >
          <Plus aria-hidden className="size-4" />
        </button>
        <output htmlFor={sliderId} className="w-16 text-right font-display text-2xl font-extrabold tabular-nums">
          {format(labels.kg, { count: number(kg) })}
        </output>
      </div>

      <div className="mt-6 rounded-2xl bg-surface p-5 text-fg" aria-live="polite">
        <p className="text-xs font-bold tracking-[0.14em] text-muted uppercase">{labels.result}</p>
        {result.kind === 'ask' ? (
          <p className="mt-1 font-semibold text-cherry">{labels.ask}</p>
        ) : (
          <>
            <p className="font-display text-4xl font-extrabold text-brand-strong tabular-nums">{formatVnd(locale, result.amount)}</p>
            <p className="text-sm text-muted">
              {result.kind === 'flat' ? labels.perLoad : format(labels.perKg, { kg: number(kg), price: formatVnd(locale, result.perKg) })}
            </p>
          </>
        )}
      </div>
      <p className="mt-4 text-xs opacity-80">{labels.disclaimer}</p>
    </div>
  );
}
