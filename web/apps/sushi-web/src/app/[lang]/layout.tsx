import type { Viewport } from 'next';
import { Be_Vietnam_Pro, Noto_Serif_Display } from 'next/font/google';
import { SiteShell } from '@web/site-kit/components/chrome';
import { LOCALE_CODES } from '@web/site-kit/locales';
import { Logo } from '@/components/logo';
import { navLinks } from '@/content/nav';
import { site } from '@/site';
import '../globals.css';

// Both fonts ship Vietnamese glyphs; next/font self-hosts them (CSP: font-src 'self').
const body = Be_Vietnam_Pro({ variable: '--font-body', subsets: ['latin', 'vietnamese'], weight: ['400', '500', '600', '700'] });
// A light, high-contrast serif: menu cards, brush-written signs.
const heading = Noto_Serif_Display({ variable: '--font-heading', subsets: ['latin', 'vietnamese'], weight: ['400', '500', '600'] });

export function generateStaticParams() {
  return LOCALE_CODES.map((lang) => ({ lang }));
}

/** The home page's metadata, and every page's defaults (absolute URLs from SITE_URL). */
export const generateMetadata = site.layoutMetadata;

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#16161a' },
    { media: '(prefers-color-scheme: dark)', color: '#0b0b0d' },
  ],
  colorScheme: 'light dark',
};

export default async function RootLayout({ children }: LayoutProps<'/[lang]'>) {
  const [t, locale] = await Promise.all([site.getMessages(), site.getLocale()]);
  const hasArticles = (await site.latestArticles(locale)).length > 0;
  return (
    <html lang={locale} className={`${body.variable} ${heading.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <SiteShell
          website={site.website}
          t={t}
          locale={locale}
          links={navLinks(t, locale, hasArticles)}
          logo={<Logo />}
          logoLight={<Logo tone="light" />}
          cta={{ href: site.business.phone.href, label: t.hero.reserve }}
        >
          {children}
        </SiteShell>
      </body>
    </html>
  );
}
