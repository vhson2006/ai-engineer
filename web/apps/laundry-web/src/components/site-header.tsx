import Link from 'next/link';
import { Clock, Gift, Phone } from 'lucide-react';
import { format } from '@web/core/i18n/format';
import { Container, buttonVariants, cn } from '@web/ui';
import { LocaleSwitcher, LocaleToggle } from '@web/ui/locale-switcher';
import { MobileNav, SectionNav } from '@web/ui/section-nav';
import { shop } from '@/content/shop';
import { href, LOCALE_OPTIONS } from '@/i18n/locales';
import { getLocale, getMessages } from '@/i18n/messages';
import { formatTime } from '@/lib/format';
import { Logo } from './logo';

export async function SiteHeader() {
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  const home = href(locale, '/');
  const links = [
    { id: 'prices', label: t.nav.prices },
    { id: 'services', label: t.nav.services },
    { id: 'process', label: t.nav.process },
    { id: 'tips', label: t.nav.tips },
    { id: 'faq', label: t.nav.faq },
    { id: 'contact', label: t.nav.contact },
  ];
  const hours = format(t.topBar.hours, { open: formatTime(locale, shop.hours.open), close: formatTime(locale, shop.hours.close) });

  return (
    <>
      <div className="bg-deep text-white">
        <Container className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 py-2 text-xs font-semibold sm:justify-between sm:text-sm">
          <p className="inline-flex items-center gap-2 text-sun">
            <Gift aria-hidden className="size-4" />
            {t.topBar.loyalty}
          </p>
          <p className="inline-flex items-center gap-2 text-white/85">
            <Clock aria-hidden className="size-4 text-sun" />
            {hours}
          </p>
        </Container>
      </div>
      <header className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur supports-[backdrop-filter]:bg-bg/80">
        <Container className="flex items-center justify-between gap-4 py-2.5">
          <Link href={home} aria-label={t.nav.home} className="rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand">
            <Logo laundry={t.brand.laundry} />
          </Link>

          <SectionNav links={links} label={t.nav.label} pagePath={home} className="hidden xl:block" />

          <div className="flex items-center gap-2">
            <div className="hidden xl:block">
              <LocaleSwitcher current={locale} locales={LOCALE_OPTIONS} label={t.common.language} />
            </div>
            <a href={shop.phone.href} className={cn(buttonVariants(), 'hidden rounded-full px-5 sm:inline-flex')}>
              <Phone aria-hidden />
              {shop.phone.display}
            </a>
            <MobileNav
              links={links}
              pagePath={home}
              labels={{ open: t.nav.openMenu, close: t.nav.closeMenu, title: t.nav.label }}
              header={<Logo laundry={t.brand.laundry} />}
              className="xl:hidden"
              footer={
                <>
                  <LocaleToggle current={locale} locales={LOCALE_OPTIONS} label={t.common.language} />
                  <a href={shop.phone.href} className={cn(buttonVariants({ size: 'lg' }), 'w-full rounded-full')}>
                    <Phone aria-hidden />
                    {format(t.common.call, { phone: shop.phone.display })}
                  </a>
                  <p className="text-center text-xs font-medium text-muted">{hours}</p>
                </>
              }
            />
          </div>
        </Container>
      </header>
    </>
  );
}
