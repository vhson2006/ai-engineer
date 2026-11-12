import Link from 'next/link';
import { ArrowUpRight, Phone } from 'lucide-react';
import { format } from '@web/core/i18n/format';
import { LocaleSwitcher, LocaleToggle } from '@web/ui/locale-switcher';
import { MobileNav, SectionNav } from '@web/ui/section-nav';
import { salon } from '@/content/salon';
import { articlePaths, latestArticles } from '@/features/articles/data';
import { BookButton } from '@/features/booking/booking-provider';
import { href, LOCALE_OPTIONS } from '@/i18n/locales';
import { getLocale, getMessages } from '@/i18n/messages';
import { Logo } from './logo';
import { pill } from './pill';

/** Sticky white header: logo, section links in a soft pill, language, "Book now". */
export async function SiteHeader() {
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  const home = href(locale, '/');
  // The home page shows its blog band only when there are articles (src/app/[lang]/page.tsx): then
  // the menu scrolls to it; otherwise (none yet, or the API is down) it opens the blog page.
  const hasArticles = (await latestArticles(locale, 1)).length > 0;
  // Same order as the bands of the home page; each id is on its <Band>.
  const links = [
    { id: 'top', label: t.nav.top },
    { id: 'gallery', label: t.nav.gallery },
    { id: 'artists', label: t.nav.artists },
    { id: 'menu', label: t.nav.menu },
    { id: 'faq', label: t.nav.faq },
    hasArticles ? { id: 'blog', label: t.nav.blog } : { id: 'blog', label: t.nav.blog, href: href(locale, articlePaths.index) },
    { id: 'visit', label: t.nav.visit },
  ];
  const phone = salon.phones[0];

  return (
    <header className="sticky top-0 z-40 bg-bg/80 backdrop-blur-lg supports-[backdrop-filter]:bg-bg/70">
      {/* Fixed height (--header-h in globals.css): the menu's scroll offsets depend on it. */}
      <div className="mx-auto flex h-(--header-h) max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link href={home} aria-label={t.nav.home} className="rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand">
          <Logo />
        </Link>

        <div className="hidden rounded-full bg-surface-2 p-1 lg:block">
          <SectionNav links={links} label={t.nav.label} pagePath={home} />
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden lg:block">
            <LocaleSwitcher current={locale} locales={LOCALE_OPTIONS} label={t.common.language} />
          </div>
          <BookButton className={pill('ink', 'md', 'hidden sm:inline-flex')}>
            {t.booking.open}
            <ArrowUpRight aria-hidden />
          </BookButton>
          <MobileNav
            links={links}
            pagePath={home}
            labels={{ open: t.nav.openMenu, close: t.nav.closeMenu, title: t.nav.label }}
            header={<Logo />}
            className="border-0 bg-surface-2 shadow-none lg:hidden"
            footer={
              <>
                <LocaleToggle current={locale} locales={LOCALE_OPTIONS} label={t.common.language} />
                <a href={phone.href} className={pill('ink', 'lg', 'w-full')}>
                  <Phone aria-hidden />
                  {format(t.common.call, { phone: phone.display })}
                </a>
              </>
            }
          />
        </div>
      </div>
    </header>
  );
}
