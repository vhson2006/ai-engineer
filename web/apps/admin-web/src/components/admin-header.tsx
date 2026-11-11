import Link from 'next/link';
import { Suspense } from 'react';
import { LocaleSwitcher } from '@web/ui/locale-switcher';
import { href, LOCALE_OPTIONS, type Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages';
import { AdminMobileNav } from './admin-sidebar';
import { UserMenu, UserMenuFallback } from './user-menu';

/** Full width above the side menu. Static per language; the menu button and the user stream in. */
export function AdminHeader({ t, locale }: { t: Messages; locale: Locale }) {
  return (
    <header className="sticky top-0 z-40 h-16 border-b border-border bg-bg/80 backdrop-blur supports-[backdrop-filter]:bg-bg/70">
      <div className="relative flex h-full items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <Suspense fallback={null}>
            <AdminMobileNav t={t} locale={locale} />
          </Suspense>
          <Link href={href(locale, '/')} className="group flex items-center gap-2.5">
            <span className="inline-flex size-8 items-center justify-center rounded-lg bg-brand text-brand-fg shadow-sm transition-transform group-hover:scale-105">
              <ShieldIcon />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-semibold tracking-tight">{t.common.brand}</span>
              <span className="block text-xs text-subtle">{t.common.brandTagline}</span>
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {/* Reads the URL (usePathname): under /sites/[siteId]/... it is only known per request,
              so it needs its own boundary (cacheComponents), or the route can't prerender. */}
          <Suspense fallback={<div aria-hidden className="h-10 w-24 rounded-lg" />}>
            <LocaleSwitcher current={locale} locales={LOCALE_OPTIONS} label={t.common.language} />
          </Suspense>
          <Suspense fallback={<UserMenuFallback />}>
            <UserMenu />
          </Suspense>
        </div>
      </div>
    </header>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden className="size-4.5">
      <path d="M12 3 5 6v5c0 4.4 3 8.4 7 10 4-1.6 7-5.6 7-10V6l-7-3Z" strokeLinejoin="round" />
      <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
