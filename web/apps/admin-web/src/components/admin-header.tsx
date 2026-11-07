import Link from 'next/link';
import { Suspense } from 'react';
import { Container } from '@web/ui';
import { LocaleSwitcher } from '@web/ui/locale-switcher';
import { NavLinks } from '@web/ui/nav-links';
import { href, LOCALE_OPTIONS } from '@/i18n/locales';
import { getLocale, getMessages } from '@/i18n/messages';
import { UserMenu, UserMenuFallback } from './user-menu';

/** Static per language; only the user menu (session) streams in. */
export async function AdminHeader() {
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  const links = [
    { href: href(locale, '/'), label: t.nav.overview, exact: true },
    { href: href(locale, '/deployments'), label: t.nav.deployments },
    { href: href(locale, '/design-system'), label: t.nav.designSystem },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur supports-[backdrop-filter]:bg-bg/70">
      <Container className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3">
        <div className="flex items-center gap-6">
          <Link href={href(locale, '/')} className="group flex items-center gap-2.5">
            <span className="inline-flex size-8 items-center justify-center rounded-lg bg-brand text-brand-fg shadow-sm transition-transform group-hover:scale-105">
              <ShieldIcon />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-semibold tracking-tight">{t.common.brand}</span>
              <span className="block text-xs text-subtle">{t.common.brandTagline}</span>
            </span>
          </Link>
          <NavLinks links={links} label={t.nav.label} />
        </div>

        <div className="flex items-center gap-2">
          <LocaleSwitcher current={locale} locales={LOCALE_OPTIONS} label={t.common.language} />
          <Suspense fallback={<UserMenuFallback />}>
            <UserMenu />
          </Suspense>
        </div>
      </Container>
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
