import { cn } from '@web/ui';

/** A brake disc with a gauge needle: the store's mark. */
export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={className}>
      <rect width="64" height="64" rx="10" fill="#15171c" />
      <circle cx="32" cy="32" r="18" fill="none" stroke="#f26a1b" strokeWidth="6" />
      <circle cx="32" cy="32" r="6" fill="#f5c518" />
      <g stroke="#f26a1b" strokeWidth="4" strokeLinecap="round">
        <path d="M32 8v6M32 50v6M8 32h6M50 32h6" />
      </g>
      <path d="M32 32l10-10" stroke="#f4f5f7" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Mark + "PITLANE" over "AUTO PARTS". `light`: on the graphite footer. */
export function Logo({ tone = 'dark', className }: { tone?: 'dark' | 'light'; className?: string }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <Mark className="size-10 shrink-0" />
      <span className="leading-none">
        <span className={cn('display block text-[1.6rem] tracking-[0.06em]', tone === 'light' ? 'text-deep-fg' : 'text-brand-strong')}>Pitlane</span>
        <span className="mt-0.5 block text-[0.62rem] font-bold tracking-[0.34em] text-brand uppercase">Auto parts</span>
      </span>
    </span>
  );
}
