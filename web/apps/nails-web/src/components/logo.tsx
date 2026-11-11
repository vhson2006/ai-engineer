import Image from 'next/image';
import { cn } from '@web/ui';
import logoEnvy from '../../public/images/logo-envy.png';

/**
 * The salon's "EN" monogram in an oval (redrawn in SVG from the business card so it stays sharp
 * at any size). `tone="gold"` = the card's gold foil (gift certificate), `ink` = the current text
 * color. `id` must be unique on the page (gradient id).
 */
export function Monogram({ id, tone = 'ink', className }: { id: string; tone?: 'gold' | 'ink'; className?: string }) {
  const gold = `${id}-gold`;
  const paint = tone === 'gold' ? `url(#${gold})` : 'currentColor';
  return (
    <svg viewBox="0 0 80 120" aria-hidden className={className}>
      {tone === 'gold' && (
        <defs>
          <linearGradient id={gold} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f6dc86" />
            <stop offset="0.35" stopColor="#c99a35" />
            <stop offset="0.6" stopColor="#f3d77f" />
            <stop offset="1" stopColor="#a97a22" />
          </linearGradient>
        </defs>
      )}
      <ellipse cx="40" cy="60" rx="33" ry="54" fill="none" stroke={paint} strokeWidth={tone === 'gold' ? 2.6 : 3} />
      <g fill={paint} fontFamily="Georgia, 'Times New Roman', serif">
        <text x="17" y="64" fontSize="46" fontWeight="500">
          E
        </text>
        <text x="33" y="86" fontSize="44" fontWeight="500">
          N
        </text>
      </g>
      <path d="M5 47 H34" stroke={paint} strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

/**
 * The salon's wordmark from its website ("ENVY / Nails Spa Of Wendell", black on transparent):
 * inverted in dark mode. Decorative: the link around it carries the accessible name.
 */
export function Logo({ className }: { className?: string }) {
  return <Image src={logoEnvy} alt="" priority className={cn('h-10 w-auto dark:invert', className)} />;
}
