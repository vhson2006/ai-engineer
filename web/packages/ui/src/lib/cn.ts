import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Joins class names and resolves Tailwind conflicts (the last one wins: `cn('p-6', 'p-0')` → `p-0`). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
