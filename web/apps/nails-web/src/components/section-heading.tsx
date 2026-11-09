import type { ReactNode } from 'react';
import { cn } from '@web/ui';

/** Small gold label between two hairlines (the menu's ornament style). */
export function Eyebrow({ children, tone = 'dark', align = 'center' }: { children: ReactNode; tone?: 'dark' | 'light'; align?: 'center' | 'left' }) {
  return (
    <p
      className={cn(
        'flex items-center gap-3 text-xs font-semibold tracking-[0.28em] uppercase',
        tone === 'light' ? 'text-gold-light' : 'text-gold',
        align === 'center' && 'justify-center',
      )}
    >
      <span aria-hidden className="h-px w-8 bg-current opacity-60" />
      {children}
      {align === 'center' && <span aria-hidden className="h-px w-8 bg-current opacity-60" />}
    </p>
  );
}

/** Eyebrow + Garamond title + intro: the heading of every section. */
export function SectionHeading({
  eyebrow,
  title,
  intro,
  align = 'center',
  tone = 'dark',
  action,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  align?: 'center' | 'left';
  tone?: 'dark' | 'light';
  action?: ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-6',
        align === 'center' ? 'mx-auto max-w-2xl items-center text-center' : 'sm:flex-row sm:items-end sm:justify-between',
      )}
    >
      <div className={cn(align === 'left' && 'max-w-2xl')}>
        <Eyebrow tone={tone} align={align}>
          {eyebrow}
        </Eyebrow>
        <h2
          className={cn(
            'mt-4 font-display text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl',
            tone === 'light' ? 'text-white' : 'text-brand-strong',
          )}
        >
          {title}
        </h2>
        {intro && (
          <p className={cn('mt-4 text-lg leading-relaxed text-pretty', tone === 'light' ? 'text-white/75' : 'text-muted')}>{intro}</p>
        )}
      </div>
      {action}
    </div>
  );
}
