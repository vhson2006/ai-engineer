import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { Toaster } from '@web/ui/toaster';
import { TooltipProvider } from '@web/ui/tooltip';
import { AdminHeader } from '@/components/admin-header';
import { LOCALE_CODES } from '@/i18n/locales';
import { getLocale, getMessages } from '@/i18n/messages';
import '../globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin', 'latin-ext', 'vietnamese'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin', 'vietnamese'] });

export function generateStaticParams() {
  return LOCALE_CODES.map((lang) => ({ lang }));
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getMessages();
  return {
    title: { default: t.meta.title, template: `%s · ${t.meta.title}` },
    description: t.meta.description,
    // Public host, private purpose: never indexed (the X-Robots-Tag header says it too).
    robots: { index: false, follow: false },
  };
}

export default async function RootLayout({ children }: LayoutProps<'/[lang]'>) {
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  return (
    <html lang={locale} className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-bg font-sans">
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2"
        >
          {t.common.skipToContent}
        </a>
        {/* A thin brand stripe: the admin site is recognisable at a glance. */}
        <div aria-hidden className="h-1 bg-gradient-to-r from-brand via-brand-hover to-brand" />
        {/* nuqs: list state in the URL; tooltips share a delay; toasts for action results. */}
        <NuqsAdapter>
          <TooltipProvider>
            <AdminHeader />
            <main id="content" className="flex-1">
              {children}
            </main>
          </TooltipProvider>
        </NuqsAdapter>
        <Toaster />
      </body>
    </html>
  );
}
