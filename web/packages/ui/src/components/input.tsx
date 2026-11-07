import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';

/** Shared look of text fields (input, textarea, select trigger, date picker button). */
export const fieldClass = cn(
  'w-full rounded-lg border border-border bg-bg px-3 text-sm text-fg shadow-xs transition-[color,box-shadow,border-color]',
  'placeholder:text-subtle outline-none focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/20',
  'disabled:cursor-not-allowed disabled:opacity-50',
  'aria-invalid:border-red-500 aria-invalid:ring-red-500/20',
);

export function Input({ className, type = 'text', ...props }: ComponentProps<'input'>) {
  return <input data-slot="input" type={type} className={cn(fieldClass, 'h-10', className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea data-slot="textarea" className={cn(fieldClass, 'min-h-24 py-2.5 leading-relaxed', className)} {...props} />;
}
