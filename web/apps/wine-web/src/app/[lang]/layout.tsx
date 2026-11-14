import type { Viewport } from 'next';
import { Be_Vietnam_Pro, Playfair_Display } from 'next/font/google';
import { ShieldCheck } from 'lucide-react';
import { Container, richText } from '@web/ui';
import { articlesLink, SiteShell } from '@web/site-kit/components/chrome';
import { LOCALE_CODES } from '@web/site-kit/locales';
import { LegalNotice } from '@/components/legal-notice';
import { Logo } from '@/components/logo';
import { business, winery } from '@/content/business';
import { site } from '@/site';
import '../globals.css';

// Both fonts ship Vietnamese glyphs (ạ, ế, ữ…); next/font self-hosts them (CSP: font-src 'self').
const body = Be_Vietnam_Pro({ variable: '--font-body', subsets: ['latin', 'vietnamese'], weight: ['400', '500', '600', '700'] });
// The brochure's bold, classic serif (and the labels' italic lettering).
const heading = Playfair_Display({
  variable: '--font-heading',
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '600', '700', '800'],
  style: ['normal', 'italic'],
});

export function generateStaticParams() {
  return LOCALE_CODES.map((lang) => ({ lang }));
}

/** The home page's metadata, and the defaults of every page (absolute URLs from SITE_URL). */
export const generateMetadata = site.layoutMetadata;

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#b3141c' },
    { media: '(prefers-color-scheme: dark)', color: '#120605' },
  ],
  colorScheme: 'light dark',
};

export default async function RootLayout({ children }: LayoutProps<'/[lang]'>) {
  const [t, locale] = await Promise.all([site.getMessages(), site.getLocale()]);
  const { website } = site;
  // The home page shows its articles section only when there are articles: then the menu scrolls
  // to it; otherwise (none yet, or the API is down) it opens /bai-viet.
  const hasArticles = (await site.latestArticles(locale)).length > 0;
  // Same order as the sections of the home page.
  const links = [
    { id: 'top', label: t.nav.top },
    { id: 'products', label: t.nav.products },
    { id: 'range', label: t.nav.range },
    { id: 'partners', label: t.nav.partners },
    { id: 'about', label: t.nav.about },
    articlesLink(website, t, locale, hasArticles),
    { id: 'contact', label: t.nav.contact },
  ];
  const linkClass = 'transition-colors hover:text-yellow';

  return (
    <html lang={locale} className={`${body.variable} ${heading.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <SiteShell
          website={website}
          t={t}
          locale={locale}
          links={links}
          logo={<Logo tagline={t.brand.tagline} />}
          logoLight={<Logo tagline={t.brand.tagline} tone="light" />}
          topBar={
            <div className="lattice bg-brand text-white">
              <Container className="flex items-center justify-center gap-2 py-2 text-center text-xs font-medium sm:text-sm">
                <ShieldCheck aria-hidden className="hidden size-4 shrink-0 text-yellow sm:block" />
                <p>
                  {richText(t.topBar.orderOnly, {
                    phone: (
                      <a href={business.phone.href} className="font-bold text-yellow underline-offset-4 hover:underline">
                        {business.phone.display}
                      </a>
                    ),
                  })}
                </p>
              </Container>
            </div>
          }
          drawerNote={<LegalNotice t={t} className="justify-center" />}
          footer={{
            contact: (
              <>
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
              </>
            ),
            note: <LegalNotice t={t} tone="light" />,
          }}
        >
          {children}
        </SiteShell>
      </body>
    </html>
  );
}
