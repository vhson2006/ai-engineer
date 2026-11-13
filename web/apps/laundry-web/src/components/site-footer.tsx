import type { ReactNode } from 'react';
import { format } from '@web/core/i18n/format';
import { Container } from '@web/ui';
import { fullAddress, mapsHref, shop } from '@/content/shop';
import { href } from '@/i18n/locales';
import { getLocale, getMessages } from '@/i18n/messages';
import { LEGAL_PATHS, type LegalPage } from '@/site';
import { formatHours } from '@/lib/format';
import { Logo } from './logo';

const LEGAL_LINKS: LegalPage[] = ['privacy', 'terms', 'dataDeletion'];

export async function SiteFooter() {
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  const home = href(locale, '/');
  const explore = [
    { id: 'prices', label: t.nav.prices },
    { id: 'process', label: t.nav.process },
    { id: 'faq', label: t.nav.faq },
    { id: 'contact', label: t.nav.contact },
  ];
  const linkClass = 'transition-colors hover:text-sun';

  return (
    <footer className="bubbles bg-deep pb-24 text-white/80 sm:pb-0">
      <Container className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_0.8fr_1.2fr]">
        <div>
          <Logo laundry={t.brand.laundry} tone="light" />
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
            <a href={href(locale, '/bai-viet')} className={linkClass}>
              {t.nav.articles}
            </a>
          </li>
        </FooterColumn>
        <FooterColumn title={t.footer.contact}>
          <li>
            <a href={mapsHref} target="_blank" rel="noopener noreferrer" className={linkClass}>
              {fullAddress}
            </a>
          </li>
          <li>
            <a href={shop.phone.href} className={linkClass}>
              {shop.phone.display}
            </a>
          </li>
          <li>
            {t.contact.weekdays}: {formatHours(locale, shop.hours.weekdays)}
          </li>
          <li>
            {t.contact.weekend}: {formatHours(locale, shop.hours.weekend)}
          </li>
          <li className="text-white/60">{t.contact.holidays}</li>
        </FooterColumn>
      </Container>
      <div className="border-t border-white/10">
        <Container className="flex flex-col gap-3 py-5 text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <p>{format(t.footer.rights, { year: '2026', name: shop.fullName })}</p>
          {/* Privacy policy, terms and data deletion: on every page (search engines, social platforms' app review). */}
          <nav aria-label={t.footer.legal}>
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {LEGAL_LINKS.map((page) => (
                <li key={page}>
                  <a href={href(locale, LEGAL_PATHS[page])} className="underline-offset-4 transition-colors hover:text-sun hover:underline">
                    {t.legal.links[page]}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </Container>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="font-display text-xl font-extrabold text-sun">{title}</h2>
      <ul className="mt-4 space-y-2.5 text-sm">{children}</ul>
    </div>
  );
}
