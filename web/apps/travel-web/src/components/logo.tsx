import { cn } from '@web/ui';

/** A sunset over hills, with the monsoon wind: the agency's mark. */
export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={className}>
      <rect width="64" height="64" rx="18" fill="#0b6e83" />
      <circle cx="40" cy="24" r="9" fill="#f2783a" />
      <path d="M8 46c8-10 14-15 20-15s9 6 14 6 8-4 14-4v19H8z" fill="#0b2a3a" />
      <path d="M10 22c6-3 12-3 18 0" fill="none" stroke="#fbf7f0" strokeWidth="3" strokeLinecap="round" />
      <path d="M14 29c5-2 9-2 13 0" fill="none" stroke="#fbf7f0" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Mark + "Gió Mùa" over "TRAVEL". `light`: on the night-sea footer. */
export function Logo({ tone = 'dark', className }: { tone?: 'dark' | 'light'; className?: string }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <Mark className="size-10 shrink-0" />
      <span className="leading-none">
        <span className={cn('display block text-[1.45rem]', tone === 'light' ? 'text-deep-fg' : 'text-brand-strong')}>Gió Mùa</span>
        <span className="mt-0.5 block text-[0.65rem] font-bold tracking-[0.32em] text-accent uppercase">Travel</span>
      </span>
    </span>
  );
}
