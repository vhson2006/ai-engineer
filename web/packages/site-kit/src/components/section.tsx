import type { ReactNode } from 'react';
import { cn } from '@web/ui';

/** Small label above a title. `light`: on a dark band (deep, brand). */
export function Eyebrow({ children, tone = 'dark', className }: { children: ReactNode; tone?: 'dark' | 'light'; className?: string }) {
  return (
    <p
      className={cn(
        'inline-flex items-center gap-2 text-xs font-bold tracking-[0.2em] uppercase',
        tone === 'light' ? 'text-accent' : 'text-brand-strong',
        className,
      )}
    >
      <span aria-hidden className={cn('h-px w-8', tone === 'light' ? 'bg-accent' : 'bg-accent')} />
      {children}
    </p>
  );
}

/** Eyebrow + title + intro: the heading of every section. */
export function SectionHeading({
  eyebrow,
  title,
  intro,
  align = 'center',
  tone = 'dark',
  as: Heading = 'h2',
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  align?: 'center' | 'left';
  tone?: 'dark' | 'light';
  as?: 'h1' | 'h2';
}) {
  return (
    <div className={cn(align === 'center' ? 'mx-auto max-w-2xl text-center [&>p:first-child]:justify-center' : 'max-w-2xl')}>
      <Eyebrow tone={tone}>{eyebrow}</Eyebrow>
      <Heading
        className={cn(
          'display mt-4 text-4xl leading-[1.1] text-balance sm:text-5xl',
          tone === 'light' ? 'text-deep-fg' : 'text-brand-strong',
        )}
      >
        {title}
      </Heading>
      {intro && <p className={cn('mt-4 text-lg leading-relaxed text-pretty', tone === 'light' ? 'text-deep-fg/80' : 'text-muted')}>{intro}</p>}
    </div>
  );
}

/** A landing page section: an id for the menu, vertical rhythm, an optional band colour. */
export function Section({
  id,
  band = 'none',
  className,
  children,
  labelledBy,
}: {
  id?: string;
  band?: 'none' | 'soft' | 'deep';
  className?: string;
  children: ReactNode;
  labelledBy?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={cn(
        'py-16 sm:py-24',
        band === 'soft' && 'bg-surface-2',
        band === 'deep' && 'bg-deep text-deep-fg',
        className,
      )}
    >
      {children}
    </section>
  );
}
