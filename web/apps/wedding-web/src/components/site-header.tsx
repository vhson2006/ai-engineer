import Link from 'next/link';
import { Container } from '@web/ui';
import { LocaleSwitcher, LocaleToggle } from '@web/ui/locale-switcher';
import { MobileNav, SectionNav } from '@web/ui/section-nav';
import { couple, mainEvent } from '@/content/wedding';
import { href, LOCALE_OPTIONS } from '@/i18n/locales';
import { getLocale, getMessages } from '@/i18n/messages';
import { shortDate } from '@/lib/dates';
import { Monogram } from './monogram';

export async function SiteHeader() {
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  const home = href(locale, '/');
  const links = [
    { id: 'invitation', label: t.nav.invitation },
    { id: 'couple', label: t.nav.couple },
    { id: 'story', label: t.nav.story },
    { id: 'events', label: t.nav.events },
    { id: 'album', label: t.nav.album },
  ];
  const names = (
    <span className="flex items-center gap-3">
      <Monogram />
      <span className="leading-tight">
        <span className="block font-display text-lg font-semibold text-fg">
          {couple.groom.short} &amp; {couple.bride.short}
        </span>
        <span className="block text-xs tracking-[0.25em] text-subtle">{shortDate(mainEvent.start)}</span>
      </span>
    </span>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-bg/85 backdrop-blur supports-[backdrop-filter]:bg-bg/70">
      <Container className="flex items-center justify-between gap-4 py-2.5">
        <Link href={home} aria-label={t.nav.home} className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand">
          {names}
        </Link>
        <SectionNav links={links} label={t.nav.label} pagePath={home} className="hidden lg:block" />
        <div className="flex items-center gap-2">
          <div className="hidden lg:block">
            <LocaleSwitcher current={locale} locales={LOCALE_OPTIONS} label={t.common.language} />
          </div>
          <MobileNav
            links={links}
            pagePath={home}
            labels={{ open: t.nav.openMenu, close: t.nav.closeMenu, title: t.nav.label }}
            header={names}
            className="lg:hidden"
            footer={<LocaleToggle current={locale} locales={LOCALE_OPTIONS} label={t.common.language} />}
          />
        </div>
      </Container>
    </header>
  );
}
