import { format } from '@web/core/i18n/format';
import { LegalLinks } from '@web/site-kit/components/chrome';
import { href } from '@web/site-kit/locales';
import { business } from '@/content/business';
import { site } from '@/site';
import { Logo } from './logo';

/** A slim footer (contact and hours live in the Visit bento); room at the bottom for the quick bar. */
export async function SiteFooter() {
  const [t, locale] = await Promise.all([site.getMessages(), site.getLocale()]);
  const { website } = site;
  const home = href(locale, '/');
  // The home page's bands, in their order (the blog link opens the blog page).
  const explore = [
    { id: 'gallery', label: t.nav.gallery },
    { id: 'artists', label: t.nav.artists },
    { id: 'menu', label: t.nav.menu },
    { id: 'faq', label: t.nav.faq },
  ];
  const chip = 'inline-flex rounded-full bg-bg px-4 py-2 transition-colors hover:bg-mint';
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
                  <a href={`${home}#${link.id}`} className={chip}>
                    {link.label}
                  </a>
                </li>
              ))}
              <li>
                <a href={href(locale, website.paths.articles)} className={chip}>
                  {t.nav.blog}
                </a>
              </li>
              <li>
                <a href={`${home}#visit`} className={chip}>
                  {t.nav.visit}
                </a>
              </li>
            </ul>
          </nav>
        </div>
        <ul aria-label={t.visit.follow} className="mt-6 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
          {business.socials.map((social) => (
            <li key={social.id}>
              <a href={social.href} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:text-fg hover:underline">
                {social.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-col gap-3 border-t border-border pt-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>{format(t.footer.rights, { year: '2026', name: business.legalName })}</p>
          {/* Privacy policy and terms: on every page (search engines, the SMS program's registration). */}
          <LegalLinks website={website} t={t} locale={locale} linkClassName="hover:text-fg" />
        </div>
      </div>
    </footer>
  );
}
