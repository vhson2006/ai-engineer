import type { ReactNode } from 'react';
import { cn } from '@web/ui';

/**
 * The editorial section header: a numbered rule ("01 — Selected work") over a large serif title.
 * `as` lets a page's main title be its <h1> (one per page).
 */
export function SectionHeading({
  index,
  eyebrow,
  title,
  aside,
  as: Heading = 'h2',
  className,
}: {
  index?: number;
  eyebrow?: string;
  title: ReactNode;
  aside?: ReactNode;
  as?: 'h1' | 'h2';
  className?: string;
}) {
  return (
    <header className={cn('border-t border-fg pt-5', className)}>
      <p className="flex items-baseline gap-3 font-mono text-xs tracking-widest text-subtle uppercase">
        {index !== undefined && <span className="text-brand">{String(index).padStart(2, '0')}</span>}
        {eyebrow && <span>{eyebrow}</span>}
      </p>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
        <Heading className="max-w-3xl font-display text-4xl leading-[1.05] font-medium tracking-tight text-balance sm:text-6xl">
          {title}
        </Heading>
        {aside}
      </div>
    </header>
  );
}

/** Text link with an underline that draws in on hover (editorial call to action). */
export const inkLink =
  'group inline-flex items-center gap-2 font-medium underline decoration-border decoration-1 underline-offset-[6px] transition-colors hover:decoration-brand focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand';
