import { cn } from '@web/ui';

/** Balanced river stones with a eucalyptus leaf: the spa's mark. */
export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={className}>
      <rect width="64" height="64" rx="20" fill="#1f3a33" />
      <ellipse cx="32" cy="46" rx="16" ry="6" fill="#a8694f" />
      <ellipse cx="32" cy="36" rx="11" ry="5" fill="#ddd3c2" />
      <ellipse cx="32" cy="28" rx="7" ry="3.5" fill="#86b8a5" />
      <path d="M32 24c-1-6 2-11 7-13-1 5-3 9-7 13z" fill="#86b8a5" />
    </svg>
  );
}

/** Mark + "An Nhiên" over "SPA". `light`: on the forest footer. */
export function Logo({ tone = 'dark', className }: { tone?: 'dark' | 'light'; className?: string }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <Mark className="size-10 shrink-0" />
      <span className="leading-none">
        <span className={cn('display block text-[1.6rem]', tone === 'light' ? 'text-deep-fg' : 'text-brand-strong')}>An Nhiên</span>
        <span className="mt-0.5 block text-[0.62rem] font-semibold tracking-[0.45em] text-accent uppercase">Spa</span>
      </span>
    </span>
  );
}
