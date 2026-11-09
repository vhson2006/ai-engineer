import Link from 'next/link';
import { Mail } from 'lucide-react';
import { Suspense } from 'react';
import { Container, buttonVariants, cn } from '@web/ui';
import { LocaleSwitcher, LocaleToggle } from '@web/ui/locale-switcher';
import { NavLinks } from '@web/ui/nav-links';
import { MobileNav } from '@web/ui/section-nav';
import { profile } from '@/content/profile';
import { href, LOCALE_OPTIONS } from '@/i18n/locales';
import { ACCOUNT_ENABLED } from '@/site';
import { getLocale, getMessages } from '@/i18n/messages';
import { UserMenu, UserMenuFallback } from './user-menu';

/** Static per language (part of the prerendered shell); only the user menu streams in. */
export async function SiteHeader() {
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  const home = href(locale, '/');
  // One rule: every menu item is a page. Contact is the footer block that every page has.
  const pages = [
    { id: 'work', href: home, label: t.nav.work, exact: true },
    { id: 'about', href: href(locale, '/about'), label: t.nav.about },
    ...(ACCOUNT_ENABLED ? [{ id: 'dashboard', href: href(locale, '/dashboard'), label: t.nav.dashboard }] : []),
  ];
  // Drawer: the pages, then Contact (no href: scrolls to the footer of the current page).
  const drawerLinks = [...pages.map(({ id, href: to, label }) => ({ id, href: to, label })), { id: 'contact', label: t.nav.contact }];
  const logo = (
    <span className="flex items-baseline gap-2 font-display text-xl font-medium tracking-tight">
      {profile.name}
      <span aria-hidden className="size-1.5 rounded-full bg-brand" />
    </span>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur supports-[backdrop-filter]:bg-bg/70">
      <Container className="flex items-center justify-between gap-4 py-3">
        <Link href={home} className="group rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand">
          {logo}
        </Link>

        <div className="hidden lg:block">
          <NavLinks links={pages} label={t.nav.label} />
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-3 lg:flex">
            <LocaleSwitcher current={locale} locales={LOCALE_OPTIONS} label={t.common.language} />
            <a href="#contact" className={cn(buttonVariants({ size: 'sm' }), 'rounded-full px-4')}>
              {t.nav.contact}
            </a>
          </div>
          {ACCOUNT_ENABLED && (
            <Suspense fallback={<UserMenuFallback />}>
              <UserMenu />
            </Suspense>
          )}
          <MobileNav
            links={drawerLinks}
            pagePath={home}
            labels={{ open: t.nav.openMenu, close: t.nav.closeMenu, title: t.nav.label }}
            header={logo}
            className="lg:hidden"
            footer={
              <>
                <LocaleToggle current={locale} locales={LOCALE_OPTIONS} label={t.common.language} />
                <a href={`mailto:${profile.contact.email}`} className={cn(buttonVariants({ size: 'lg' }), 'w-full rounded-full')}>
                  <Mail aria-hidden />
                  {t.contact.email}
                </a>
              </>
            }
          />
        </div>
      </Container>
    </header>
  );
}
