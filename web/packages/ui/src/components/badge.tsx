import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';

export const badgeVariants = cva('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium', {
  variants: {
    tone: {
      brand: 'bg-brand-soft text-brand-soft-fg',
      neutral: 'bg-surface-2 text-muted',
      success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
      warning: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
      danger: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300',
      info: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300',
    },
  },
  defaultVariants: { tone: 'brand' },
});

export type BadgeProps = ComponentProps<'span'> & VariantProps<typeof badgeVariants>;

/** A status pill. Pick a `tone`; a `className` with colors still overrides it. */
export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span data-slot="badge" className={cn(badgeVariants({ tone }), className)} {...props} />;
}
