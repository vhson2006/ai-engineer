import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';

/** A surface with a border. `padding` replaces the default (e.g. 'p-0' for a table inside). */
export function Card({ className, padding = 'p-6', ...props }: ComponentProps<'div'> & { padding?: string }) {
  return (
    <div
      data-slot="card"
      className={cn('rounded-2xl border border-border bg-surface shadow-sm', padding, className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="card-header" className={cn('flex flex-col gap-1.5 border-b border-border px-5 py-4', className)} {...props} />;
}

export function CardTitle({ className, ...props }: ComponentProps<'h2'>) {
  return <h2 data-slot="card-title" className={cn('font-semibold leading-tight', className)} {...props} />;
}

export function CardDescription({ className, ...props }: ComponentProps<'p'>) {
  return <p data-slot="card-description" className={cn('text-sm text-muted', className)} {...props} />;
}

export function CardContent({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="card-content" className={cn('p-5', className)} {...props} />;
}

export function CardFooter({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="card-footer" className={cn('flex items-center gap-2 border-t border-border px-5 py-4', className)} {...props} />;
}
