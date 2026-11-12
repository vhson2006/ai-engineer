import type { Metadata, Viewport } from 'next';
import { Be_Vietnam_Pro, Playfair_Display } from 'next/font/google';
import { SmoothScroll } from '@web/ui/smooth-scroll';
import { MobileActionBar } from '@/components/mobile-action-bar';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { winery } from '@/content/winery';
import { LOCALE_CODES } from '@/i18n/locales';
import { getLocale, getMessages } from '@/i18n/messages';
import { pageMetadata, samePath } from '@/seo';
import { SITE_URL } from '@/site';
import '../globals.css';

// Both fonts ship Vietnamese glyphs (ạ, ế, ữ…); next/font self-hosts them (CSP: font-src 'self').
const body = Be_Vietnam_Pro({ variable: '--font-body', subsets: ['latin', 'vietnamese'], weight: ['400', '500', '600', '700'] });
// The brochure's bold, classic serif (and the labels' italic lettering).
const display = Playfair_Display({
  variable: '--font-display-serif',
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '600', '700', '800'],
  style: ['normal', 'italic'],
});

export function generateStaticParams() {
  return LOCALE_CODES.map((lang) => ({ lang }));
}

/** The home page's metadata, and the defaults of every page (absolute URLs from SITE_URL). */
export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  return {
    // Relative URLs in metadata (canonical, hreflang, Open Graph images) resolve against SITE_URL.
    metadataBase: new URL(SITE_URL),
    ...pageMetadata({ t, locale, paths: samePath('/'), description: t.meta.description }),
    title: { default: t.meta.title, template: `%s · ${winery.name}` },
    applicationName: winery.name,
    formatDetection: { telephone: false, address: false, email: false },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#b3141c' },
    { media: '(prefers-color-scheme: dark)', color: '#120605' },
  ],
  colorScheme: 'light dark',
};

export default async function RootLayout({ children }: LayoutProps<'/[lang]'>) {
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  return (
    <html lang={locale} className={`${body.variable} ${display.variable} h-full antialiased`}>
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
