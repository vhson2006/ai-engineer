import Link from 'next/link';
import { Phone, ShieldCheck } from 'lucide-react';
import { Container, buttonVariants, cn, richText } from '@web/ui';
import { format } from '@web/core/i18n/format';
import { LocaleSwitcher, LocaleToggle } from '@web/ui/locale-switcher';
import { MobileNav, SectionNav } from '@web/ui/section-nav';
import { winery } from '@/content/winery';
import { href, LOCALE_OPTIONS } from '@/i18n/locales';
import { getLocale, getMessages } from '@/i18n/messages';
import { LegalNotice } from './legal-notice';
import { Logo } from './logo';

export async function SiteHeader() {
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  const home = href(locale, '/');
  const links = [
    { id: 'products', label: t.nav.products },
    { id: 'range', label: t.nav.range },
    { id: 'partners', label: t.nav.partners },
    { id: 'about', label: t.nav.about },
    { id: 'contact', label: t.nav.contact },
  ];

  return (
    <>
      <div className="lattice bg-brand text-white">
        <Container className="flex items-center justify-center gap-2 py-2 text-center text-xs font-medium sm:text-sm">
          <ShieldCheck aria-hidden className="hidden size-4 shrink-0 text-yellow sm:block" />
          <p>
            {richText(t.topBar.orderOnly, {
              phone: (
                <a href={winery.orderPhone.href} className="font-bold text-yellow underline-offset-4 hover:underline">
                  {winery.orderPhone.display}
                </a>
              ),
            })}
          </p>
        </Container>
      </div>
      <header className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur supports-[backdrop-filter]:bg-bg/80">
        <Container className="flex items-center justify-between gap-4 py-3">
          <Link href={home} aria-label={t.nav.home} className="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand">
            <Logo tagline={t.brand.tagline} />
          </Link>

          <SectionNav links={links} label={t.nav.label} pagePath={home} className="hidden xl:block" />

          <div className="flex items-center gap-2">
            <div className="hidden xl:block">
              <LocaleSwitcher current={locale} locales={LOCALE_OPTIONS} label={t.common.language} />
            </div>
            <a href={winery.orderPhone.href} className={cn(buttonVariants(), 'hidden rounded-full px-5 sm:inline-flex')}>
              <Phone aria-hidden />
              {winery.orderPhone.display}
            </a>
            <MobileNav
              links={links}
              pagePath={home}
              labels={{ open: t.nav.openMenu, close: t.nav.closeMenu, title: t.nav.label }}
              header={<Logo tagline={t.brand.tagline} />}
              className="xl:hidden"
              footer={
                <>
                  <LocaleToggle current={locale} locales={LOCALE_OPTIONS} label={t.common.language} />
                  <a href={winery.orderPhone.href} className={cn(buttonVariants({ size: 'lg' }), 'w-full rounded-full')}>
                    <Phone aria-hidden />
                    {format(t.common.call, { phone: winery.orderPhone.display })}
                  </a>
                  <LegalNotice className="justify-center" />
                </>
              }
            />
          </div>
        </Container>
      </header>
    </>
  );
}
