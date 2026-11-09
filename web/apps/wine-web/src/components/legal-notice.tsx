import { cn } from '@web/ui';
import { getMessages } from '@/i18n/messages';

/**
 * The mandatory warnings for alcoholic drinks (Vietnam's Law on Prevention and Control of Harmful
 * Effects of Alcohol, 2019): shown near every call to buy and in the footer.
 */
export async function LegalNotice({ tone = 'dark', className }: { tone?: 'dark' | 'light'; className?: string }) {
  const t = await getMessages();
  return (
    <p className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold', tone === 'light' ? 'text-white/80' : 'text-muted', className)}>
      <span
        aria-hidden
        className={cn(
          'inline-flex size-7 items-center justify-center rounded-full border-2 text-[0.6rem] font-extrabold',
          tone === 'light' ? 'border-yellow text-yellow' : 'border-brand text-brand-strong',
        )}
      >
        18+
      </span>
      <span>{t.legal.age}</span>
      <span>{t.legal.drive}</span>
    </p>
  );
}
