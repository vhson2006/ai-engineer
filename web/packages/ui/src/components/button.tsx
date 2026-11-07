import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';

export const buttonVariants = cva(
  [
    'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold',
    'transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
    'disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50',
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      variant: {
        primary: 'bg-brand text-brand-fg shadow-sm hover:bg-brand-hover',
        secondary: 'border border-border bg-surface text-fg shadow-sm hover:bg-surface-2',
        ghost: 'text-muted hover:bg-surface-2 hover:text-fg',
        destructive: 'bg-red-600 text-white shadow-sm hover:bg-red-700 focus-visible:outline-red-600',
        link: 'text-brand underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4',
        lg: 'h-11 px-6 text-base',
        icon: 'size-10',
        'icon-sm': 'size-8',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export type ButtonProps = ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    /** Render the child element (a Link, an <a>) with the button styles instead of a <button>. */
    asChild?: boolean;
  };

export function Button({ className, variant, size, asChild = false, type, ...props }: ButtonProps) {
  const Component = asChild ? Slot.Root : 'button';
  return (
    <Component
      data-slot="button"
      // A <button> inside a <form> submits by default: make it explicit.
      type={asChild ? undefined : (type ?? 'button')}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

/** Class strings for links styled as buttons (kept for existing pages: `className={buttonClass.primary}`). */
export const buttonClass = {
  primary: buttonVariants({ variant: 'primary' }),
  secondary: buttonVariants({ variant: 'secondary' }),
  ghost: buttonVariants({ variant: 'ghost' }),
};
