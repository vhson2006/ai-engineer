import type { ReactNode } from 'react';
import { cn } from '@web/ui';

/** Small label between two ornaments (◆). */
export function Eyebrow({ children, tone = 'dark', align = 'center' }: { children: ReactNode; tone?: 'dark' | 'light'; align?: 'center' | 'left' }) {
  return (
    <p
      className={cn(
        'flex items-center gap-3 text-xs font-bold tracking-[0.26em] uppercase',
        tone === 'light' ? 'text-gold-light' : 'text-gold-text',
        align === 'center' && 'justify-center',
      )}
    >
      <span aria-hidden className="text-[0.6rem]">
        ◆
      </span>
      {children}
      {align === 'center' && (
        <span aria-hidden className="text-[0.6rem]">
          ◆
        </span>
      )}
    </p>
  );
}

/** Eyebrow + serif title + intro: the heading of every section. */
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
      <Eyebrow tone={tone} align={align}>
        {eyebrow}
      </Eyebrow>
      <h2
        className={cn(
          'mt-4 font-display text-4xl leading-[1.12] font-bold tracking-tight text-balance sm:text-5xl',
          tone === 'light' ? 'text-white' : 'text-brand-strong',
        )}
      >
        {title}
      </h2>
      {intro && <p className={cn('mt-4 text-lg leading-relaxed text-pretty', tone === 'light' ? 'text-white/80' : 'text-muted')}>{intro}</p>}
    </div>
  );
}
