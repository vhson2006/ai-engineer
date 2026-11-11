import { cn } from '@web/ui';

/**
 * The site's pill buttons/links. `ink` = primary (deep blue-grey, lifts on hover), `soft` = on
 * white, `glass` = on a pastel card. All share the micro-interaction: lift + press.
 */
const VARIANTS = {
  ink: 'bg-fg text-bg shadow-sm hover:shadow-lg hover:shadow-fg/15',
  soft: 'bg-surface-2 text-fg hover:bg-mint',
  glass: 'bg-white/70 text-[#263238] backdrop-blur hover:bg-white dark:bg-white/10 dark:text-fg dark:hover:bg-white/20',
} as const;
const SIZES = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-13 px-7 text-[0.95rem]',
} as const;

export function pill(variant: keyof typeof VARIANTS = 'ink', size: keyof typeof SIZES = 'md', className?: string | false) {
  return cn(
    'inline-flex cursor-pointer items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap',
    'transition duration-300 ease-out hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] motion-reduce:transform-none',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
    'disabled:pointer-events-none disabled:opacity-35 [&_svg]:size-4 [&_svg]:shrink-0',
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}
