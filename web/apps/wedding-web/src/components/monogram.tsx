import { cn } from '@web/ui';
import { couple } from '@/content/wedding';

/** "S & G" in script inside a fine gold ring. */
export function Monogram({ className, tone = 'dark' }: { className?: string; tone?: 'dark' | 'light' }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex size-11 shrink-0 items-center justify-center rounded-full border font-script text-xl leading-none',
        tone === 'light' ? 'border-gold-light/70 text-gold-light' : 'border-brand/50 text-brand-strong',
        className,
      )}
    >
      {couple.monogram.groom}
      <span className="mx-px text-sm">&amp;</span>
      {couple.monogram.bride}
    </span>
  );
}
