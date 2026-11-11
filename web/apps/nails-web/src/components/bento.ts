import { cn } from '@web/ui';
import type { Tint } from '@/content/salon';

export const TINTS: Record<Tint | 'white', string> = {
  mint: 'bg-mint',
  rose: 'bg-rose',
  baby: 'bg-baby',
  lilac: 'bg-lilac',
  white: 'bg-surface-2',
};
export const STRONG: Record<Tint, string> = {
  mint: 'bg-mint-strong',
  rose: 'bg-rose-strong',
  baby: 'bg-baby-strong',
  lilac: 'bg-lilac-strong',
};

/** A bento card: 24px radius, flat pastel fill, generous padding. `interactive` adds the hover lift. */
export function bento(tint: Tint | 'white', className?: string, interactive = false) {
  return cn(
    'relative overflow-hidden rounded-3xl p-6 sm:p-8',
    TINTS[tint],
    interactive &&
      'transition duration-500 ease-out hover:-translate-y-1 hover:shadow-xl hover:shadow-[#263238]/[0.06] motion-reduce:transform-none',
    className,
  );
}

/** The bento grid: equal gaps everywhere. */
export const GRID = 'grid gap-3 sm:gap-4';
