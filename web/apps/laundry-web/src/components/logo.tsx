import { cn } from '@web/ui';

/** A washing machine badge (front-loader with a sunny drum), the shop's mark. */
export function MachineMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={className}>
      <rect width="64" height="64" rx="16" fill="#13883a" />
      <rect x="14" y="10" width="36" height="44" rx="8" fill="#fff" />
      <circle cx="32" cy="35" r="12" fill="#ffd400" stroke="#0b4a20" strokeWidth="3" />
      <path d="M24 37c3-3 6 3 9 0s6 3 7 0" fill="none" stroke="#0b4a20" strokeWidth="2" strokeLinecap="round" />
      <circle cx="21" cy="17" r="2" fill="#e3262f" />
      <circle cx="27" cy="17" r="2" fill="#13883a" />
    </svg>
  );
}

/** Machine mark + "GIẶT SẤY" (red) over "SFaster" (sign lettering). */
export function Logo({ laundry, className, tone = 'dark' }: { laundry: string; className?: string; tone?: 'dark' | 'light' }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <MachineMark className="size-11 shrink-0" />
      <span className="leading-none">
        <span className={cn('block font-display text-xs font-extrabold tracking-[0.18em] uppercase', tone === 'light' ? 'text-white' : 'text-cherry')}>
          {laundry}
        </span>
        <span className="sign-letters block font-display text-[1.7rem] leading-[1.05] font-extrabold tracking-tight">SFaster</span>
      </span>
    </span>
  );
}
