import type { Viewport } from 'next';
import { Baloo_2, Be_Vietnam_Pro } from 'next/font/google';
import { Clock, Gift } from 'lucide-react';
import { format } from '@web/core/i18n/format';
import { Container } from '@web/ui';
import { articlesLink, SiteShell } from '@web/site-kit/components/chrome';
import { LOCALE_CODES } from '@web/site-kit/locales';
import { Logo } from '@/components/logo';
import { hoursOf } from '@/content/business';
import { site } from '@/site';
import '../globals.css';

// Both fonts ship Vietnamese glyphs (ạ, ế, ữ…); next/font self-hosts them (CSP: font-src 'self').
const body = Be_Vietnam_Pro({ variable: '--font-body', subsets: ['latin', 'vietnamese'], weight: ['400', '500', '600', '700'] });
// Round, chunky headings like the shop sign.
const heading = Baloo_2({ variable: '--font-heading', subsets: ['latin', 'vietnamese'], weight: ['600', '700', '800'] });

export function generateStaticParams() {
  return LOCALE_CODES.map((lang) => ({ lang }));
}

/** The home page's metadata, and the defaults of every page (absolute URLs from SITE_URL). */
export const generateMetadata = site.layoutMetadata;

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#13883a' },
    { media: '(prefers-color-scheme: dark)', color: '#06200f' },
  ],
  colorScheme: 'light dark',
};

export default async function RootLayout({ children }: LayoutProps<'/[lang]'>) {
  const [t, locale] = await Promise.all([site.getMessages(), site.getLocale()]);
  const { website } = site;
  // The home page shows its "latest articles" section only when there are articles: then the menu
  // scrolls to it; otherwise (none yet, or the API is down) it opens the articles page.
  const hasArticles = (await site.latestArticles(locale)).length > 0;
  // Same order as the sections of the home page (src/app/[lang]/page.tsx).
  const links = [
    { id: 'top', label: t.nav.top },
    { id: 'prices', label: t.nav.prices },
    { id: 'process', label: t.nav.process },
    articlesLink(website, t, locale, hasArticles),
    { id: 'faq', label: t.nav.faq },
    { id: 'contact', label: t.nav.contact },
  ];
  const hours = format(t.topBar.hours, {
    weekdays: website.hours(locale, hoursOf('weekdays')),
    weekend: website.hours(locale, hoursOf('weekend')),
  });
  const logo = <Logo laundry={t.brand.laundry} />;

  return (
    <html lang={locale} className={`${body.variable} ${heading.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <SiteShell
          website={website}
          t={t}
          locale={locale}
          links={links}
          logo={logo}
          logoLight={<Logo laundry={t.brand.laundry} tone="light" />}
          topBar={
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
          }
          drawerNote={<p className="text-center text-xs font-medium text-muted">{hours}</p>}
          footer={{
            hoursNote: t.contact.holidays,
            className: 'bubbles',
          }}
        >
          {children}
        </SiteShell>
      </body>
    </html>
  );
}
