import type { ReactNode } from 'react';
import { cn } from '@web/ui';

/** A small rounded label with a colored dot ("● Menu"). */
export function Eyebrow({ children, dot = 'bg-mint-strong', className }: { children: ReactNode; dot?: string; className?: string }) {
  return (
    <p className={cn('inline-flex items-center gap-2 rounded-full bg-surface-2 px-3 py-1.5 text-xs font-semibold tracking-wide', className)}>
      <span aria-hidden className={cn('size-2 rounded-full', dot)} />
      {children}
    </p>
  );
}

/** Section heading: label, a bold tight title, an intro on the right on wide screens. */
export function SectionHeading({ eyebrow, dot, title, intro }: { eyebrow: string; dot?: string; title: string; intro?: string }) {
  return (
    <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr] lg:items-end">
      <div>
        <Eyebrow dot={dot}>{eyebrow}</Eyebrow>
        <h2 className="mt-5 text-4xl leading-[1.02] font-extrabold tracking-[-0.035em] text-balance sm:text-5xl lg:text-6xl">{title}</h2>
      </div>
      {intro && <p className="max-w-md leading-relaxed text-pretty text-muted lg:justify-self-end">{intro}</p>}
    </div>
  );
}
