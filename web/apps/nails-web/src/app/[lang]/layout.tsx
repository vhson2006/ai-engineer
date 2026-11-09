import type { Metadata, Viewport } from 'next';
import { Be_Vietnam_Pro, Cormorant_Garamond, Great_Vibes } from 'next/font/google';
import { localizedPath } from '@web/core/i18n/paths';
import { SmoothScroll } from '@web/ui/smooth-scroll';
import { MobileActionBar } from '@/components/mobile-action-bar';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { salon } from '@/content/salon';
import { LOCALE_CODES } from '@/i18n/locales';
import { getLocale, getMessages } from '@/i18n/messages';
import '../globals.css';

// All fonts ship Vietnamese glyphs (ạ, ế, ữ…); next/font self-hosts them (CSP: font-src 'self').
const body = Be_Vietnam_Pro({
  variable: '--font-body',
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
});
// The printed menu's look: a Garamond serif for headings, a calligraphic script for accents.
const display = Cormorant_Garamond({
  variable: '--font-display-serif',
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
});
const script = Great_Vibes({ variable: '--font-script-hand', subsets: ['latin', 'vietnamese'], weight: '400' });

export function generateStaticParams() {
  return LOCALE_CODES.map((lang) => ({ lang }));
}

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  return {
    title: { default: t.meta.title, template: `%s · ${salon.name}` },
    description: t.meta.description,
    applicationName: salon.name,
    alternates: {
      canonical: localizedPath(locale, '/'),
      languages: Object.fromEntries(LOCALE_CODES.map((code) => [code, localizedPath(code, '/')])),
    },
    formatDetection: { telephone: false, address: false, email: false },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0e2216' },
    { media: '(prefers-color-scheme: dark)', color: '#08140d' },
  ],
  colorScheme: 'light dark',
};

export default async function RootLayout({ children }: LayoutProps<'/[lang]'>) {
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  return (
    <html lang={locale} className={`${body.variable} ${display.variable} ${script.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2"
        >
          {t.common.skipToContent}
        </a>
        <SiteHeader />
        <main id="content" className="flex-1">
          {children}
        </main>
        <SiteFooter />
        <MobileActionBar />
        <SmoothScroll />
      </body>
    </html>
  );
}
