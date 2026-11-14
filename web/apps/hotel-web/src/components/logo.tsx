import { cn } from '@web/ui';

/** A Hội An silk lantern: the hotel's mark. */
export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={className}>
      <rect width="64" height="64" rx="12" fill="#1a2238" />
      <path d="M32 8v6" stroke="#d99a3d" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="26" y="13" width="12" height="4" rx="1.5" fill="#d99a3d" />
      <path d="M22 22c0-3 4-5 10-5s10 2 10 5v16c0 3-4 5-10 5s-10-2-10-5z" fill="#d99a3d" />
      <path d="M24 26h16M24 32h16M24 38h16" stroke="#b5532f" strokeWidth="1.5" />
      <rect x="26" y="43" width="12" height="4" rx="1.5" fill="#d99a3d" />
      <path d="M32 47v8" stroke="#d99a3d" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Mark + "Lantern House" over "HỘI AN". `light`: on the night footer. */
export function Logo({ tone = 'dark', className }: { tone?: 'dark' | 'light'; className?: string }) {
  return (
    <span className={cn('flex items-center gap-3', className)}>
      <Mark className="size-10 shrink-0" />
      <span className="leading-none">
        <span className={cn('display block text-[1.6rem]', tone === 'light' ? 'text-deep-fg' : 'text-brand-strong')}>Lantern House</span>
        <span className="mt-1 block text-[0.62rem] font-semibold tracking-[0.4em] text-accent uppercase">Hội An</span>
      </span>
    </span>
  );
}
