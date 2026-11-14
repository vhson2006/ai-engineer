import { articlesLink, type SectionLink } from '@web/site-kit/components/chrome';
import type { Locale } from '@web/site-kit/locales';
import type { Messages } from '@/i18n/dictionaries';
import { website } from '@/website';

/**
 * The landing page's sections, in page order (src/app/[lang]/page.tsx): the menu row, the mobile
 * drawer and the footer. "Articles" scrolls to the section when the page shows it, else opens
 * the articles page.
 */
export function navLinks(t: Messages, locale: Locale, hasArticles: boolean): SectionLink[] {
  return [
    { id: 'top', label: t.nav.top },
    { id: 'menu', label: t.nav.menu },
    { id: 'story', label: t.nav.story },
    { id: 'omakase', label: t.nav.omakase },
    articlesLink(website, t, locale, hasArticles),
    { id: 'faq', label: t.menu.faq },
    { id: 'contact', label: t.menu.contact },
  ];
}
