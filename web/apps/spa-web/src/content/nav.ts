import { articlesLink, type SectionLink } from '@web/site-kit/components/chrome';
import type { Locale } from '@web/site-kit/locales';
import type { Messages } from '@/i18n/dictionaries';
import { website } from '@/website';

/** The landing page's sections, in page order (src/app/[lang]/page.tsx): menu, drawer, footer. */
export function navLinks(t: Messages, locale: Locale, hasArticles: boolean): SectionLink[] {
  return [
    { id: 'top', label: t.nav.top },
    { id: 'treatments', label: t.nav.treatments },
    { id: 'packages', label: t.nav.packages },
    { id: 'ritual', label: t.nav.ritual },
    articlesLink(website, t, locale, hasArticles),
    { id: 'faq', label: t.menu.faq },
    { id: 'contact', label: t.menu.contact },
  ];
}
