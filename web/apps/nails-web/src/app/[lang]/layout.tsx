import type { Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { format } from '@web/core/i18n/format';
import { SmoothScroll } from '@web/ui/smooth-scroll';
import { SkipLink } from '@web/site-kit/components/chrome';
import { LOCALE_CODES, type Locale } from '@web/site-kit/locales';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { menuTables, menuTabs, salon, type Price } from '@/content/salon';
import { BookingProvider } from '@/features/booking/booking-provider';
import type { BookingData } from '@/features/booking/booking-dialog';
import { QuickBookingBar } from '@/features/booking/quick-bar';
import type { Messages } from '@/i18n/dictionaries';
import { formatPrice } from '@/lib/format';
import { site } from '@/site';
import '../globals.css';

// Ships Vietnamese glyphs (ạ, ế, ữ…); next/font self-hosts it (CSP: font-src 'self'). Heavy
// weights for the bold, tight headlines of the bento cards.
const body = Plus_Jakarta_Sans({
  variable: '--font-body',
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700', '800'],
});

export function generateStaticParams() {
  return LOCALE_CODES.map((lang) => ({ lang }));
}

/** The home page's metadata, and the defaults of every page (absolute URLs from SITE_URL). */
export const generateMetadata = site.layoutMetadata;

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#111618' },
  ],
  colorScheme: 'light dark',
};

/** The booking dialog's services: each bookable menu page's first table, priced from its first column. */
function bookingData(t: Messages, locale: Locale): BookingData {
  return {
    locale,
    hours: salon.hours,
    phone: salon.phones[0],
    bookingUrl: salon.bookingUrl,
    labels: t.booking,
    groups: menuTabs
      .filter((tab) => tab.bookable)
      .map((tab) => {
        const tableId = tab.tables[0];
        const names = t.services.tables[tableId].items as Record<string, string>;
        const rows = menuTables[tableId] as { id: string; prices: (Price | null)[] }[];
        return {
          id: tab.id,
          name: t.services.tabs[tab.id],
          services: rows.map((row) => {
            const price = formatPrice(locale, row.prices[0] ?? { amount: 0 });
            return {
              id: `${tableId}.${row.id}`,
              name: names[row.id],
              price: row.prices.length > 1 ? format(t.common.from, { price }) : price,
            };
          }),
        };
      }),
  };
}

export default async function RootLayout({ children }: LayoutProps<'/[lang]'>) {
  const [t, locale] = await Promise.all([site.getMessages(), site.getLocale()]);
  return (
    <html lang={locale} className={`${body.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <SkipLink t={t} className="focus:rounded-full focus:bg-surface-2" />
        <BookingProvider data={bookingData(t, locale)}>
          <SiteHeader />
          <main id="content" className="flex-1">
            {children}
          </main>
          <SiteFooter />
          <QuickBookingBar labels={t.quick} />
        </BookingProvider>
        <SmoothScroll />
      </body>
    </html>
  );
}
