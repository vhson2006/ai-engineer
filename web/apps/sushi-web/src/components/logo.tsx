import { cn } from '@web/ui';

/** A vermilion sun with a cloud (kumo) across it, on ink: the restaurant's mark. */
export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={className}>
      <rect width="64" height="64" rx="8" fill="#16161a" />
      <circle cx="32" cy="32" r="17" fill="#b8322a" />
      <path d="M15 40c5-4 9-4 13 0s9 4 13 0 7-4 9-2" fill="none" stroke="#f4efe4" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M17 31c4-3 8-3 11 0s8 3 11 0" fill="none" stroke="#c49a4a" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/** Mark + "KUMO" over "Sushi & Omakase". `light`: on the ink footer. */
export function Logo({ tone = 'dark', className }: { tone?: 'dark' | 'light'; className?: string }) {
  return (
    <span className={cn('flex items-center gap-3', className)}>
      <Mark className="size-10 shrink-0" />
      <span className="leading-none">
        <span className={cn('display block text-2xl tracking-[0.18em]', tone === 'light' ? 'text-deep-fg' : 'text-brand-strong')}>KUMO</span>
        <span className="mt-1 block text-[0.65rem] font-semibold tracking-[0.3em] text-accent uppercase">Sushi &amp; Omakase</span>
      </span>
    </span>
  );
}
