import { cn } from '@web/ui';
import { business } from '@/content/business';

/** The red seal with the gold "興" (hưng) character from the company's label and brochure. */
export function Seal({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={className}>
      <rect width="64" height="64" rx="12" fill="#b3141c" />
      <rect x="4.5" y="4.5" width="55" height="55" rx="8.5" fill="none" stroke="#f7d77a" strokeWidth="2" />
      <text
        x="32"
        y="44"
        textAnchor="middle"
        fontSize="34"
        fontWeight="700"
        fill="#ffe500"
        fontFamily="'Noto Serif CJK SC','Noto Serif TC','Songti SC','PMingLiU','SimSun',serif"
      >
        興
      </text>
    </svg>
  );
}

/** Seal + "Khang Hưng Tửu" + "Long An · Since 1991". `tone="light"` on red/dark backgrounds. */
export function Logo({ tagline, tone = 'dark', className }: { tagline: string; tone?: 'dark' | 'light'; className?: string }) {
  return (
    // Never shrinks or wraps: in a full header the menu must give way, not the wordmark.
    <span className={cn('flex shrink-0 items-center gap-3 whitespace-nowrap', className)}>
      <Seal className="size-11 shrink-0 drop-shadow-sm" />
      <span className="leading-none">
        <span
          className={cn(
            'block font-display text-[1.45rem] font-extrabold tracking-tight uppercase italic',
            tone === 'light' ? 'text-gold-foil' : 'text-brand-strong',
          )}
        >
          {business.name}
        </span>
        <span className={cn('mt-1 block text-[0.65rem] font-semibold tracking-[0.24em] uppercase', tone === 'light' ? 'text-gold-light' : 'text-gold-text')}>
          {tagline}
        </span>
      </span>
    </span>
  );
}
