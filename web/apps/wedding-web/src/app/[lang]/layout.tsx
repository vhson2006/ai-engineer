import type { Metadata, Viewport } from 'next';
import { Be_Vietnam_Pro, Cormorant_Garamond, Great_Vibes } from 'next/font/google';
import { format } from '@web/core/i18n/format';
import { localizedPath } from '@web/core/i18n/paths';
import { SmoothScroll } from '@web/ui/smooth-scroll';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { couple, mainEvent } from '@/content/wedding';
import { LOCALE_CODES } from '@/i18n/locales';
import { getLocale, getMessages } from '@/i18n/messages';
import { longDate } from '@/lib/dates';
import '../globals.css';

// All fonts ship Vietnamese glyphs (ạ, ế, ữ…); next/font self-hosts them (CSP: font-src 'self').
const body = Be_Vietnam_Pro({ variable: '--font-body', subsets: ['latin', 'vietnamese'], weight: ['300', '400', '500', '600'] });
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
    title: t.meta.title,
    description: format(t.meta.description, { date: longDate(locale, mainEvent.start) }),
    applicationName: `${couple.groom.short} & ${couple.bride.short}`,
    alternates: {
      canonical: localizedPath(locale, '/'),
      languages: Object.fromEntries(LOCALE_CODES.map((code) => [code, localizedPath(code, '/')])),
    },
    // A private invitation: shared by link, not listed by search engines.
    robots: { index: false, follow: false },
    formatDetection: { telephone: false, address: false, email: false },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#241913' },
    { media: '(prefers-color-scheme: dark)', color: '#0d0907' },
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
        <SmoothScroll />
      </body>
    </html>
  );
}
