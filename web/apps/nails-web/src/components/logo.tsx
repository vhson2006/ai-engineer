import { cn } from '@web/ui';
import { salon } from '@/content/salon';

/**
 * The salon's gold "EN" monogram in an oval (redrawn in SVG from the business card so it stays
 * sharp at any size). `id` must be unique on the page (gradient id).
 */
export function Monogram({ id, className }: { id: string; className?: string }) {
  const gold = `${id}-gold`;
  return (
    <svg viewBox="0 0 80 120" aria-hidden className={className}>
      <defs>
        <linearGradient id={gold} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6dc86" />
          <stop offset="0.35" stopColor="#c99a35" />
          <stop offset="0.6" stopColor="#f3d77f" />
          <stop offset="1" stopColor="#a97a22" />
        </linearGradient>
      </defs>
      <ellipse cx="40" cy="60" rx="33" ry="54" fill="none" stroke={`url(#${gold})`} strokeWidth="2.6" />
      <g fill={`url(#${gold})`} fontFamily="var(--font-display-serif), Georgia, serif">
        <text x="17" y="64" fontSize="46" fontWeight="500">
          E
        </text>
        <text x="33" y="86" fontSize="44" fontWeight="500">
          N
        </text>
      </g>
      <path d="M5 47 H34" stroke={`url(#${gold})`} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Monogram + "Envy Nail Spa" + "Wendell, NC". `tone="light"` on dark backgrounds. */
export function Logo({ id, tone = 'dark', className }: { id: string; tone?: 'dark' | 'light'; className?: string }) {
  return (
    <span className={cn('flex items-center gap-3', className)}>
      <Monogram id={id} className="h-11 w-auto shrink-0" />
      <span className="leading-none">
        <span className={cn('block font-display text-2xl font-semibold tracking-tight', tone === 'light' ? 'text-gold-foil' : 'text-brand-strong')}>
          {salon.name}
        </span>
        <span className={cn('mt-1 block text-[0.65rem] font-semibold tracking-[0.28em] uppercase', tone === 'light' ? 'text-gold-light' : 'text-gold')}>
          {salon.city}
        </span>
      </span>
    </span>
  );
}
