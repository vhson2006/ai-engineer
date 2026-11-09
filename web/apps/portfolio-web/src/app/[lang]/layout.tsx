import type { Metadata, Viewport } from 'next';
import { localizedPath } from '@web/core/i18n/paths';
import { SmoothScroll } from '@web/ui/smooth-scroll';
import { Fraunces, Geist, Geist_Mono } from 'next/font/google';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { profile } from '@/content/profile';
import { LOCALE_CODES } from '@/i18n/locales';
import { getLocale, getMessages } from '@/i18n/messages';
import { ogLocale } from '@/seo';
import { SITE_URL } from '@/site';
import '../globals.css';

// `vietnamese` adds the precomposed letters (ạ, ế, ữ…): without it they fall back to another font.
const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin', 'latin-ext', 'vietnamese'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin', 'vietnamese'] });
/** Display serif for headlines (editorial look); italic for the accent words. */
const fraunces = Fraunces({ variable: '--font-fraunces', subsets: ['latin', 'latin-ext', 'vietnamese'], style: ['normal', 'italic'] });

/** Every page is prerendered once per language (Cache Components needs a value per root param). */
export function generateStaticParams() {
  return LOCALE_CODES.map((lang) => ({ lang }));
}

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  return {
    // Every relative URL in metadata (canonical, hreflang, og:url, og:image) resolves against it.
    metadataBase: new URL(SITE_URL),
    title: { default: `${profile.name} · ${t.profile.role}`, template: `%s · ${profile.name}` },
    description: t.profile.tagline,
    applicationName: profile.name,
    authors: [{ name: profile.name, url: localizedPath(locale, '/about') }],
    creator: profile.name,
    // Defaults for pages without their own (pages build a complete set: src/seo.ts).
    openGraph: { type: 'website', siteName: `${profile.name} · ${t.profile.role}`, locale: ogLocale(locale) },
    twitter: { card: 'summary_large_image' },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large' } },
    // Don't turn numbers in the text into phone links on iOS.
    formatDetection: { telephone: false, address: false, email: false },
  };
}

/** Browser UI color (address bar on mobile) following the page's light/dark tokens. */
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f1ea' },
    { media: '(prefers-color-scheme: dark)', color: '#0f0e0c' },
  ],
  colorScheme: 'light dark',
};

export default async function RootLayout({ children }: LayoutProps<'/[lang]'>) {
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  return (
    <html lang={locale} className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}>
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
