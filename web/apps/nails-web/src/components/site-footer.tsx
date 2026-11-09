import type { ReactNode } from 'react';
import { format } from '@web/core/i18n/format';
import { Container } from '@web/ui';
import { salon } from '@/content/salon';
import { href } from '@/i18n/locales';
import { getLocale, getMessages } from '@/i18n/messages';
import { formatHours } from '@/lib/format';
import { Logo } from './logo';

export async function SiteFooter() {
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  const home = href(locale, '/');
  const explore = [
    { id: 'services', label: t.nav.services },
    { id: 'pedicures', label: t.nav.pedicures },
    { id: 'menu', label: t.nav.menu },
    { id: 'gift', label: t.nav.gift },
    { id: 'visit', label: t.nav.visit },
  ];
  const linkClass = 'transition-colors hover:text-gold-light';

  return (
    <footer className="bg-deep pb-24 text-white/75 sm:pb-0">
      <Container className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_0.9fr_1.2fr_1.2fr]">
        <div>
          <Logo id="footer-logo" tone="light" />
          <p className="mt-5 max-w-xs text-sm leading-relaxed">{t.footer.tagline}</p>
        </div>
        <FooterColumn title={t.footer.explore}>
          {explore.map((link) => (
            <li key={link.id}>
              <a href={`${home}#${link.id}`} className={linkClass}>
                {link.label}
              </a>
            </li>
          ))}
        </FooterColumn>
        <FooterColumn title={t.footer.contact}>
          {salon.addressLines.map((line) => (
            <li key={line}>{line}</li>
          ))}
          {salon.phones.map((phone) => (
            <li key={phone.href}>
              <a href={phone.href} className={linkClass}>
                {phone.display}
              </a>
            </li>
          ))}
          <li>
            <a href={salon.website.href} className={linkClass}>
              {salon.website.display}
            </a>
          </li>
        </FooterColumn>
        <FooterColumn title={t.footer.hours}>
          {salon.hours.map((row) => (
            <li key={row.id} className="flex justify-between gap-4">
              <span>{t.visit.days[row.id]}</span>
              <span className="tabular-nums">{formatHours(locale, row.open, row.close)}</span>
            </li>
          ))}
        </FooterColumn>
      </Container>
      <div className="border-t border-white/10">
        <Container className="py-5 text-xs text-white/55">
          <p>{format(t.footer.rights, { year: '2026', name: salon.name })}</p>
        </Container>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="font-display text-lg font-semibold text-gold-light">{title}</h2>
      <ul className="mt-4 space-y-2.5 text-sm">{children}</ul>
    </div>
  );
}
