import Link from 'next/link';
import { Gift, Phone, Sparkles } from 'lucide-react';
import { Container, buttonVariants, cn } from '@web/ui';
import { format } from '@web/core/i18n/format';
import { LocaleSwitcher, LocaleToggle } from '@web/ui/locale-switcher';
import { MobileNav, SectionNav } from '@web/ui/section-nav';
import { salon } from '@/content/salon';
import { href, LOCALE_OPTIONS } from '@/i18n/locales';
import { getLocale, getMessages } from '@/i18n/messages';
import { Logo } from './logo';

export async function SiteHeader() {
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  const home = href(locale, '/');
  const links = [
    { id: 'services', label: t.nav.services },
    { id: 'pedicures', label: t.nav.pedicures },
    { id: 'menu', label: t.nav.menu },
    { id: 'styles', label: t.nav.styles },
    { id: 'gift', label: t.nav.gift },
    { id: 'visit', label: t.nav.visit },
  ];
  const [mainPhone, secondPhone] = salon.phones;

  return (
    <>
      <div className="bg-deep text-white/85">
        <Container className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 py-2 text-xs sm:justify-between sm:text-sm">
          <p className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
            <span className="inline-flex items-center gap-2">
              <Sparkles aria-hidden className="size-3.5 text-gold-light" />
              {t.topBar.welcome}
            </span>
            <span className="inline-flex items-center gap-2">
              <Gift aria-hidden className="size-3.5 text-gold-light" />
              {t.topBar.gift}
            </span>
          </p>
          <p className="hidden items-center gap-2 sm:flex">
            <Phone aria-hidden className="size-3.5 text-gold-light" />
            <a href={mainPhone.href} className="hover:text-gold-light">
              {mainPhone.display}
            </a>
            <span aria-hidden className="text-white/40">
              ·
            </span>
            <a href={secondPhone.href} className="hover:text-gold-light">
              {secondPhone.display}
            </a>
          </p>
        </Container>
      </div>
      <header className="sticky top-0 z-40 border-b border-border/80 bg-bg/90 backdrop-blur supports-[backdrop-filter]:bg-bg/75">
        <Container className="flex items-center justify-between gap-4 py-3">
          <Link href={home} aria-label={t.nav.home} className="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand">
            <Logo id="header-logo" />
          </Link>

          <SectionNav links={links} label={t.nav.label} pagePath={home} className="hidden xl:block" />

          <div className="flex items-center gap-2">
            <div className="hidden xl:block">
              <LocaleSwitcher current={locale} locales={LOCALE_OPTIONS} label={t.common.language} />
            </div>
            <a href={mainPhone.href} className={cn(buttonVariants(), 'hidden rounded-full px-5 sm:inline-flex')}>
              <Phone aria-hidden />
              {t.common.callNow}
            </a>
            <MobileNav
              links={links}
              pagePath={home}
              labels={{ open: t.nav.openMenu, close: t.nav.closeMenu, title: t.nav.label }}
              header={<Logo id="drawer-logo" />}
              className="xl:hidden"
              footer={
                <>
                  <LocaleToggle current={locale} locales={LOCALE_OPTIONS} label={t.common.language} />
                  <a href={mainPhone.href} className={cn(buttonVariants({ size: 'lg' }), 'w-full rounded-full')}>
                    <Phone aria-hidden />
                    {format(t.common.call, { phone: mainPhone.display })}
                  </a>
                </>
              }
            />
          </div>
        </Container>
      </header>
    </>
  );
}
