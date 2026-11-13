import Link from 'next/link';
import { Suspense, type ReactNode } from 'react';
import { cn, Container } from '@web/ui';
import { Skeleton } from '@web/ui/skeleton';
import { ArrowLeftIcon } from 'lucide-react';

/**
 * A page's static shell: the container, and the part that needs the session, the params or the
 * API streamed inside <Suspense> (the shell prerenders without them).
 */
export function PageShell({ fallback, children }: { fallback?: ReactNode; children: ReactNode }) {
  return (
    <Container className="py-10 sm:py-14">
      <Suspense fallback={fallback ?? <Skeleton className="h-96 rounded-2xl" />}>{children}</Suspense>
    </Container>
  );
}

/** A page's title: the context above it (usually the site's name), a subtitle, actions on the right. */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  const text = (
    <div>
      {eyebrow && <p className="text-sm font-semibold uppercase tracking-wider text-brand">{eyebrow}</p>}
      <h1 className={cn('text-3xl font-bold tracking-tight text-balance', eyebrow && 'mt-1')}>{title}</h1>
      {subtitle && <p className="mt-2 max-w-2xl text-muted">{subtitle}</p>}
    </div>
  );
  if (!actions) return <header>{text}</header>;
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      {text}
      {actions}
    </header>
  );
}

/** The link back to the list a page belongs to. */
export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
      <ArrowLeftIcon aria-hidden className="size-4" />
      {children}
    </Link>
  );
}
