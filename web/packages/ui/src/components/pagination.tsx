import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import Link from 'next/link';
import { cn } from '../lib/cn';
import { buttonVariants } from './button';

export interface PaginationProps {
  page: number;
  totalPages: number;
  /** URL of a page (keeps the other search params), built by the server page. */
  href: (page: number) => string;
  /** In the page language. `status` is already formatted, e.g. "Page 2 of 5". */
  labels: { nav: string; previous: string; next: string; status: string };
  className?: string;
}

/**
 * Previous / next as real links (works without JavaScript, crawlable, shareable). A server
 * component: the page builds `href` from its search params. Renders nothing for a single page.
 */
export function Pagination({ page, totalPages, href, labels, className }: PaginationProps) {
  if (totalPages <= 1) return null;
  const link = (disabled: boolean) => cn(buttonVariants({ variant: 'secondary', size: 'sm' }), disabled && 'pointer-events-none opacity-40');
  return (
    <nav aria-label={labels.nav} className={cn('flex items-center justify-between gap-4 text-sm', className)}>
      <Link href={href(Math.max(1, page - 1))} className={link(page <= 1)} aria-disabled={page <= 1} tabIndex={page <= 1 ? -1 : undefined}>
        <ChevronLeftIcon />
        {labels.previous}
      </Link>
      <span className="text-muted tabular-nums">{labels.status}</span>
      <Link
        href={href(Math.min(totalPages, page + 1))}
        className={link(page >= totalPages)}
        aria-disabled={page >= totalPages}
        tabIndex={page >= totalPages ? -1 : undefined}
      >
        {labels.next}
        <ChevronRightIcon />
      </Link>
    </nav>
  );
}
