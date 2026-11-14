import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * Tailwind's merge, taught the theme's own radius names: `rounded-card` and `rounded-button`
 * (@web/site-kit/theme.css) replace a component's `rounded-lg` instead of fighting it.
 */
const twMerge = extendTailwindMerge({ extend: { theme: { radius: ['card', 'button'] } } });

/** Joins class names and resolves Tailwind conflicts (the last one wins: `cn('p-6', 'p-0')` → `p-0`). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
