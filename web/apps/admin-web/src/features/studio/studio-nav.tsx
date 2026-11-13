import Link from 'next/link';
import { cn } from '@web/ui';
import type { Messages } from '@/i18n/messages';

export type StudioTab = 'projects' | 'avatars' | 'brand';

/** The studio's three pages: videos, hosts (avatars), brand kit. Real links (no client state). */
export function StudioNav({ base, current, t }: { base: string; current: StudioTab; t: Messages['studio'] }) {
  const tabs: { id: StudioTab; href: string }[] = [
    { id: 'projects', href: base },
    { id: 'avatars', href: `${base}/avatars` },
    { id: 'brand', href: `${base}/brand` },
  ];
  return (
    <nav aria-label={t.title} className="flex flex-wrap gap-2 border-b border-border pb-3">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          aria-current={tab.id === current ? 'page' : undefined}
          className={cn(
            'rounded-full px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-brand',
            tab.id === current ? 'bg-brand text-brand-fg' : 'text-muted hover:bg-surface-2 hover:text-fg',
          )}
        >
          {t.tabs[tab.id]}
        </Link>
      ))}
    </nav>
  );
}
