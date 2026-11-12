import Link from 'next/link';
import { Phone, ShieldCheck } from 'lucide-react';
import { Container, buttonVariants, cn, richText } from '@web/ui';
import { format } from '@web/core/i18n/format';
import { LocaleSwitcher, LocaleToggle } from '@web/ui/locale-switcher';
import { MobileNav, SectionNav } from '@web/ui/section-nav';
import { winery } from '@/content/winery';
import { articlePaths, latestArticles } from '@/features/articles/data';
import { href, LOCALE_OPTIONS } from '@/i18n/locales';
import { getLocale, getMessages } from '@/i18n/messages';
import { LegalNotice } from './legal-notice';
import { Logo } from './logo';

export async function SiteHeader() {
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  const home = href(locale, '/');
  // The home page shows its articles section only when there are articles (src/app/[lang]/page.tsx):
  // then the menu scrolls to it; otherwise (none yet, or the API is down) it opens /bai-viet.
  const hasArticles = (await latestArticles(locale, 1)).length > 0;
  // Same order as the sections of the home page.
  const links = [
    { id: 'top', label: t.nav.top },
    { id: 'products', label: t.nav.products },
    { id: 'range', label: t.nav.range },
    { id: 'partners', label: t.nav.partners },
    { id: 'about', label: t.nav.about },
    hasArticles
      ? { id: 'articles', label: t.nav.articles }
      : { id: 'articles', label: t.nav.articles, href: href(locale, articlePaths.index) },
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
        {/* Fixed height (--header-h in globals.css): the menu's scroll offsets depend on it. */}
        <Container className="flex h-(--header-h) items-center justify-between gap-4">
          <Link href={home} aria-label={t.nav.home} className="shrink-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand">
            <Logo tagline={t.brand.tagline} />
          </Link>

          <SectionNav links={links} label={t.nav.label} pagePath={home} className="hidden xl:block" />

          <div className="flex items-center gap-2">
            <div className="hidden xl:block">
              <LocaleSwitcher current={locale} locales={LOCALE_OPTIONS} label={t.common.language} />
            </div>
            {/* Between xl and 2xl the full menu leaves no room for the number: icon only (still announced). */}
            <a href={winery.orderPhone.href} className={cn(buttonVariants(), 'hidden rounded-full px-5 sm:inline-flex xl:max-2xl:px-3')}>
              <Phone aria-hidden />
              <span className="xl:max-2xl:sr-only">{winery.orderPhone.display}</span>
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
