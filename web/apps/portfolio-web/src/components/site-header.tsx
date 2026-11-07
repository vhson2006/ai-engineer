import Link from 'next/link';
import { Suspense } from 'react';
import { Container } from '@web/ui';
import { LocaleSwitcher } from '@web/ui/locale-switcher';
import { profile } from '@/content/profile';
import { href, LOCALE_OPTIONS } from '@/i18n/locales';
import { getLocale, getMessages } from '@/i18n/messages';
import { NavLinks } from '@web/ui/nav-links';
import { UserMenu, UserMenuFallback } from './user-menu';

/** Static per language (part of the prerendered shell); only the user menu streams in. */
export async function SiteHeader() {
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  const links = [
    { href: href(locale, '/'), label: t.nav.home, exact: true },
    { href: href(locale, '/about'), label: t.nav.about },
    { href: href(locale, '/dashboard'), label: t.nav.dashboard },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur supports-[backdrop-filter]:bg-bg/70">
      <Container className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3">
        <Link href={href(locale, '/')} className="group flex items-center gap-2.5 font-semibold tracking-tight">
          <span className="inline-flex size-8 items-center justify-center rounded-lg bg-brand text-xs font-bold text-brand-fg shadow-sm transition-transform group-hover:scale-105">
            {profile.initials}
          </span>
          <span className="hidden sm:inline">{profile.name}</span>
        </Link>

        <div className="order-3 w-full overflow-x-auto sm:order-none sm:w-auto">
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
