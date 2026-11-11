import type { ReactNode } from 'react';
import { format } from '@web/core/i18n/format';
import { Container } from '@web/ui';
import { winery } from '@/content/winery';
import { href } from '@/i18n/locales';
import { getLocale, getMessages } from '@/i18n/messages';
import { LegalNotice } from './legal-notice';
import { Logo } from './logo';

export async function SiteFooter() {
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  const home = href(locale, '/');
  const explore = [
    { id: 'products', label: t.nav.products },
    { id: 'range', label: t.nav.range },
    { id: 'partners', label: t.nav.partners },
    { id: 'about', label: t.nav.about },
    { id: 'contact', label: t.nav.contact },
  ];
  const articles = href(locale, '/bai-viet');
  const linkClass = 'transition-colors hover:text-yellow';

  return (
    <footer className="bg-deep pb-24 text-white/75 sm:pb-0">
      <Container className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_0.8fr_1.4fr]">
        <div>
          <Logo tagline={t.brand.tagline} tone="light" />
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
          <li>
            <a href={articles} className={linkClass}>
              {t.nav.articles}
            </a>
          </li>
        </FooterColumn>
        <FooterColumn title={t.footer.contact}>
          {winery.addressLines.map((line) => (
            <li key={line}>{line}</li>
          ))}
          {winery.phones.map((phone) => (
            <li key={phone.id}>
              <span className="text-white/55">{t.contact.phones[phone.id]}: </span>
              <a href={phone.href} className={linkClass}>
                {phone.display}
              </a>
            </li>
          ))}
          <li>
            <a href={winery.website.href} className={linkClass}>
              {winery.website.display}
            </a>
          </li>
        </FooterColumn>
      </Container>
      <div className="border-t border-white/10">
        <Container className="flex flex-col gap-3 py-5 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p className="text-white/55">{format(t.footer.rights, { year: '2026', name: winery.fullName })}</p>
          <LegalNotice tone="light" />
        </Container>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="font-display text-lg font-bold text-gold-light">{title}</h2>
      <ul className="mt-4 space-y-2.5 text-sm">{children}</ul>
    </div>
  );
}
