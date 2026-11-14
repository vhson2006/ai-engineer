import { cn } from '@web/ui';

/** A five-petal flower on a stem (a "bông"): the shop's mark. */
export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={className}>
      <rect width="64" height="64" rx="32" fill="#fbe4ea" />
      <g fill="#c2456b">
        {[0, 72, 144, 216, 288].map((angle) => (
          <ellipse key={angle} cx="32" cy="19" rx="7" ry="9" transform={`rotate(${angle} 32 30)`} />
        ))}
      </g>
      <circle cx="32" cy="30" r="5" fill="#f2c14e" />
      <path d="M32 40v16" stroke="#6d8a6a" strokeWidth="3" strokeLinecap="round" />
      <path d="M32 50c-5 0-9-3-10-7 5 0 9 3 10 7z" fill="#6d8a6a" />
    </svg>
  );
}

/** Mark + "Bông" (italic serif) + "FLORIST". `light`: on the plum footer. */
export function Logo({ tone = 'dark', className }: { tone?: 'dark' | 'light'; className?: string }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <Mark className="size-11 shrink-0" />
      <span className="leading-none">
        <span className={cn('display block text-[1.8rem] italic', tone === 'light' ? 'text-deep-fg' : 'text-brand-strong')}>Bông</span>
        <span className="block text-[0.62rem] font-bold tracking-[0.36em] text-accent uppercase">Florist</span>
      </span>
    </span>
  );
}
