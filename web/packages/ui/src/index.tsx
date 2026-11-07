import { Fragment, type ReactNode } from 'react';

/**
 * Layout primitives and helpers that are safe in Server Components. Components live one per file
 * and are imported by path: `@web/ui/button`, `@web/ui/dialog`, `@web/ui/data-table`…
 * (src/components/*.tsx, shadcn/ui style on Radix + Tailwind tokens). The most common ones are
 * re-exported here for convenience.
 */
import { cn } from './lib/cn';

export { cn } from './lib/cn';
export { Badge, badgeVariants } from './components/badge';
export { Button, buttonClass, buttonVariants } from './components/button';
export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './components/card';
export { Skeleton, Separator } from './components/skeleton';

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8', className)}>{children}</div>;
}

export function Section({
  id,
  eyebrow,
  title,
  intro,
  children,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 py-16 sm:py-20">
      <Container>
        <div className="max-w-2xl">
          {eyebrow && (
            <p className="text-sm font-semibold uppercase tracking-wider text-brand">{eyebrow}</p>
          )}
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
          {intro && <p className="mt-4 text-lg leading-relaxed text-muted">{intro}</p>}
        </div>
        <div className="mt-10">{children}</div>
      </Container>
    </section>
  );
}

/** `padding` replaces the default (two padding classes on one element: the CSS order decides). */
export function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-surface-2 px-3 py-1 text-sm text-fg">
      {children}
    </span>
  );
}

export function Avatar({ initials, size = 'md' }: { initials: string; size?: 'md' | 'lg' }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-brand font-semibold text-brand-fg',
        size === 'lg' ? 'size-20 text-2xl' : 'size-8 text-xs',
      )}
    >
      {initials}
    </span>
  );
}

/**
 * A translated sentence with React content in it, e.g. a bold name:
 *   richText('You’re signed in as {name}.', { name: <strong>{user.name}</strong> })
 * The words around the placeholder stay in the translation, so each language keeps its own order.
 */
export function richText(template: string, values: Record<string, ReactNode>): ReactNode[] {
  return template.split(/(\{\w+\})/g).map((part, index) => {
    const key = /^\{(\w+)\}$/.exec(part)?.[1];
    return key && key in values ? <Fragment key={index}>{values[key]}</Fragment> : part;
  });
}
