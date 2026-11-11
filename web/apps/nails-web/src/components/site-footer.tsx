import { format } from '@web/core/i18n/format';
import { salon } from '@/content/salon';
import { href } from '@/i18n/locales';
import { getLocale, getMessages } from '@/i18n/messages';
import { Logo } from './logo';

/** A slim footer (contact and hours live in the Visit bento); room at the bottom for the quick bar. */
export async function SiteFooter() {
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  const home = href(locale, '/');
  const explore = [
    { id: 'gallery', label: t.nav.gallery },
    { id: 'artists', label: t.nav.artists },
    { id: 'menu', label: t.nav.menu },
    { id: 'faq', label: t.nav.faq },
    { id: 'visit', label: t.nav.visit },
  ];
  return (
    <footer className="px-3 pb-28 sm:px-4">
      <div className="mx-auto max-w-7xl rounded-3xl bg-surface-2 px-6 py-8 sm:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Logo />
            <p className="mt-3 max-w-sm text-sm text-muted">{t.footer.tagline}</p>
          </div>
          <nav aria-label={t.footer.explore}>
            <ul className="flex flex-wrap gap-2 text-sm font-semibold">
              {explore.map((link) => (
                <li key={link.id}>
                  <a href={`${home}#${link.id}`} className="inline-flex rounded-full bg-bg px-4 py-2 transition-colors hover:bg-mint">
                    {link.label}
                  </a>
                </li>
              ))}
              <li>
                <a href={href(locale, '/blog')} className="inline-flex rounded-full bg-bg px-4 py-2 transition-colors hover:bg-mint">
                  {t.nav.blog}
                </a>
              </li>
            </ul>
          </nav>
        </div>
        <ul aria-label={t.visit.follow} className="mt-6 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
          {salon.socials.map((social) => (
            <li key={social.id}>
              <a href={social.href} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:text-fg hover:underline">
                {social.label}
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-xs text-muted">{format(t.footer.rights, { year: '2026', name: salon.legalName })}</p>
      </div>
    </footer>
  );
}
