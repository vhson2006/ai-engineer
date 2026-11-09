import type { ReactNode } from 'react';
import { cn } from '@web/ui';

/** Small pill label above a section title. */
export function Eyebrow({ children, tone = 'dark' }: { children: ReactNode; tone?: 'dark' | 'light' }) {
  return (
    <p
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-bold tracking-[0.14em] uppercase',
        tone === 'light' ? 'bg-white/15 text-sun' : 'bg-brand-soft text-brand-soft-fg',
      )}
    >
      <span aria-hidden className={cn('size-1.5 rounded-full', tone === 'light' ? 'bg-sun' : 'bg-cherry')} />
      {children}
    </p>
  );
}

/** Eyebrow + rounded bold title + intro: the heading of every section. */
export function SectionHeading({
  eyebrow,
  title,
  intro,
  align = 'center',
  tone = 'dark',
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  align?: 'center' | 'left';
  tone?: 'dark' | 'light';
}) {
  return (
    <div className={cn(align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl')}>
      <Eyebrow tone={tone}>{eyebrow}</Eyebrow>
      <h2
        className={cn(
          'mt-4 font-display text-4xl leading-[1.1] font-extrabold tracking-tight text-balance sm:text-5xl',
          tone === 'light' ? 'text-white' : 'text-brand-strong',
        )}
      >
        {title}
      </h2>
      {intro && <p className={cn('mt-4 text-lg leading-relaxed text-pretty', tone === 'light' ? 'text-white/85' : 'text-muted')}>{intro}</p>}
    </div>
  );
}
