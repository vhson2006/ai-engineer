import { articlesLink, type SectionLink } from '@web/site-kit/components/chrome';
import type { Locale } from '@web/site-kit/locales';
import type { Messages } from '@/i18n/dictionaries';
import { website } from '@/website';

/** The landing page's sections, in page order (src/app/[lang]/page.tsx): menu, drawer, footer. */
export function navLinks(t: Messages, locale: Locale, hasArticles: boolean): SectionLink[] {
  return [
    { id: 'top', label: t.nav.top },
    { id: 'categories', label: t.nav.categories },
    { id: 'catalog', label: t.nav.catalog },
    { id: 'order', label: t.nav.order },
    { id: 'workshop', label: t.nav.workshop },
    articlesLink(website, t, locale, hasArticles),
    { id: 'faq', label: t.menu.faq },
    { id: 'contact', label: t.menu.contact },
  ];
}
