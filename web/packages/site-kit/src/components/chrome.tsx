import Link from 'next/link';
import type { ReactNode } from 'react';
import { Mail, MessageCircle, Phone } from 'lucide-react';
import { format } from '@web/core/i18n/format';
import { Container, buttonVariants, cn } from '@web/ui';
import { LocaleSwitcher, LocaleToggle } from '@web/ui/locale-switcher';
import { MobileNav, SectionNav, type SectionLink } from '@web/ui/section-nav';
import { SmoothScroll } from '@web/ui/smooth-scroll';
import { fullAddress, mapsHref } from '../business';
import { href, type Locale } from '../locales';
import type { BaseMessages } from '../messages';
import type { Website } from '../website';
import { AccountLink } from './account';

export type { SectionLink };

type Cta = { href: string; label: string; icon?: ReactNode; external?: boolean };

/**
 * The sticky header of a business site: logo (home), the landing page's section links (desktop
 * row, mobile drawer, scrollspy), the language switcher and one call to action (phone by
 * default; between xl and 2xl the full menu leaves no room for the number: icon only).
 * `topBar`: an optional band above it (hours, an offer); `drawerNote`: a line under the drawer's
 * buttons.
 */
export function SiteHeader({
  website,
  t,
  locale,
  links,
  logo,
  topBar,
  cta,
  drawerNote,
}: {
  website: Website;
  t: BaseMessages;
  locale: Locale;
  links: SectionLink[];
  logo: ReactNode;
  topBar?: ReactNode;
  /** The header's button; default: call the business. */
  cta?: Cta;
  drawerNote?: ReactNode;
}) {
  const { business } = website;
  const home = href(locale, '/');
  const phoneCta = !cta;
  const action = cta ?? { href: business.phone.href, label: business.phone.display, icon: <Phone aria-hidden />, external: false };
  return (
    <>
      {topBar && <div className="bg-deep text-deep-fg">{topBar}</div>}
      <header className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur supports-[backdrop-filter]:bg-bg/80">
        <Container className="flex min-h-[var(--header-h,67px)] items-center justify-between gap-4 py-2">
          <Link href={home} aria-label={t.menu.home} className="shrink-0 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand">
            {logo}
          </Link>
          <SectionNav links={links} label={t.menu.label} pagePath={home} className="hidden xl:block" />
          <div className="flex items-center gap-2">
            <div className="hidden xl:block">
              <LocaleSwitcher current={locale} locales={website.localeOptions} label={t.common.language} />
            </div>
            <AccountLink t={t} locale={locale} className="hidden sm:inline-flex" />
            <a
              href={action.href}
              {...(action.external && { target: '_blank', rel: 'noopener noreferrer' })}
              className={cn(buttonVariants(), 'hidden rounded-button px-5 sm:inline-flex', phoneCta && 'xl:max-2xl:px-3')}
            >
              {action.icon}
              <span className={cn(phoneCta && 'xl:max-2xl:sr-only')}>{action.label}</span>
            </a>
            <MobileNav
              links={links}
              pagePath={home}
              labels={{ open: t.menu.open, close: t.menu.close, title: t.menu.label }}
              header={logo}
              className="xl:hidden"
              footer={
                <>
                  <LocaleToggle current={locale} locales={website.localeOptions} label={t.common.language} />
                  <AccountLink t={t} locale={locale} className="w-full justify-center sm:hidden" />
                  <a href={business.phone.href} className={cn(buttonVariants({ size: 'lg' }), 'w-full rounded-button')}>
                    <Phone aria-hidden />
                    {format(t.common.call, { phone: business.phone.display })}
                  </a>
                  {drawerNote}
                </>
              }
            />
          </div>
        </Container>
      </header>
    </>
  );
}

/** "Articles" in the menu: the landing page's section when it shows articles, else the articles page. */
export function articlesLink(website: Website, t: BaseMessages, locale: Locale, onPage: boolean, id = 'articles'): SectionLink {
  return onPage ? { id, label: t.menu.articles } : { id, label: t.menu.articles, href: href(locale, website.paths.articles) };
}

/** The legal pages this site has, as a list of links (every footer: search engines, platforms' app review). */
export function LegalLinks({ website, t, locale, linkClassName }: { website: Website; t: BaseMessages; locale: Locale; linkClassName?: string }) {
  return (
    <nav aria-label={t.footer.legal}>
      <ul className="flex flex-wrap gap-x-5 gap-y-2">
        {website.legalPages.map((page) => (
          <li key={page}>
            <a href={href(locale, website.legalPath(page))} className={cn('underline-offset-4 transition-colors hover:underline', linkClassName)}>
              {t.legal.links[page]}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * The footer: logo and tagline, the landing page's sections, contact and hours, legal links and
 * the sample-site notice. `contact`: the site's own contact column (several phones, a website…);
 * `hoursNote`: a line under the hours (holidays); `note`: something beside the legal links.
 */
export function SiteFooter({
  website,
  t,
  locale,
  logo,
  explore,
  contact,
  hoursNote,
  note,
  className,
}: {
  website: Website;
  t: BaseMessages;
  locale: Locale;
  /** The logo, light version (on the deep band). */
  logo: ReactNode;
  /** Section links of the landing page (same order as the menu). */
  explore: SectionLink[];
  contact?: ReactNode;
  hoursNote?: string;
  note?: ReactNode;
  className?: string;
}) {
  const { business } = website;
  const home = href(locale, '/');
  const linkClass = 'transition-colors hover:text-accent';
  return (
    <footer className={cn('bg-deep pb-24 text-deep-fg/80 sm:pb-0', className)}>
      <Container className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_0.8fr_1.2fr]">
        <div>
          {logo}
          <p className="mt-5 max-w-xs text-sm leading-relaxed">{t.footer.tagline}</p>
        </div>
        <FooterColumn title={t.footer.explore}>
          {explore.map((link) => (
            <li key={link.id}>
              <a href={link.href ?? `${home}#${link.id}`} className={linkClass}>
                {link.label}
              </a>
            </li>
          ))}
        </FooterColumn>
        <FooterColumn title={t.footer.contact}>
          {contact ?? (
            <>
              <li>
                <a href={mapsHref(business)} target="_blank" rel="noopener noreferrer" className={linkClass}>
                  {fullAddress(business)}
                </a>
              </li>
              <li>
                <a href={business.phone.href} className={linkClass}>
                  {business.phone.display}
                </a>
              </li>
              {business.email && (
                <li>
                  <a href={`mailto:${business.email}`} className={linkClass}>
                    {business.email}
                  </a>
                </li>
              )}
              {business.hours.map((row) => (
                <li key={row.key}>
                  {t.hours[row.key]}: {website.hours(locale, row)}
                </li>
              ))}
              {hoursNote && <li className="text-deep-fg/60">{hoursNote}</li>}
            </>
          )}
        </FooterColumn>
      </Container>
      <div className="border-t border-deep-fg/10">
        <Container className="flex flex-col gap-3 py-5 text-xs text-deep-fg/60 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <p>{format(t.footer.rights, { year: '2026', name: business.legalName ?? business.fullName })}</p>
            {business.sample && <p>{t.footer.sample}</p>}
            {note && <LegalLinks website={website} t={t} locale={locale} linkClassName="hover:text-accent" />}
          </div>
          {note ?? <LegalLinks website={website} t={t} locale={locale} linkClassName="hover:text-accent" />}
        </Container>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="display text-lg text-accent">{title}</h2>
      <ul className="mt-4 space-y-2.5 text-sm">{children}</ul>
    </div>
  );
}

/** Phones: Zalo (when the business has it) and call always one tap away. */
export function MobileActionBar({ website, t }: { website: Website; t: BaseMessages }) {
  const { business } = website;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 p-3 backdrop-blur sm:hidden">
      <div className={cn('grid gap-2', business.zaloHref && 'grid-cols-2')}>
        {business.zaloHref && (
          <a href={business.zaloHref} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }), 'rounded-button')}>
            <MessageCircle aria-hidden />
            {t.common.zalo}
          </a>
        )}
        <a href={business.phone.href} className={cn(buttonVariants({ size: 'lg' }), 'rounded-button')}>
          <Phone aria-hidden />
          {t.common.callNow}
        </a>
      </div>
    </div>
  );
}

/** The ways to reach the business, as buttons (contact boxes, article call to action). */
export function ContactButtons({ website, t, tone = 'dark' }: { website: Website; t: BaseMessages; tone?: 'dark' | 'light' }) {
  const { business } = website;
  const ghost =
    tone === 'light' ? 'rounded-button border-deep-fg/30 bg-deep-fg/10 px-6 text-deep-fg hover:bg-deep-fg/20' : 'rounded-button px-6';
  return (
    <div className="flex flex-wrap gap-3">
      <a
        href={business.phone.href}
        className={cn(buttonVariants({ size: 'lg' }), 'rounded-button px-6', tone === 'light' && 'bg-accent text-accent-fg hover:bg-accent/90')}
      >
        <Phone aria-hidden />
        {business.phone.display}
      </a>
      {business.zaloHref && (
        <a href={business.zaloHref} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }), ghost)}>
          <MessageCircle aria-hidden />
          Zalo
        </a>
      )}
      {business.email && (
        <a href={`mailto:${business.email}`} className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }), ghost)}>
          <Mail aria-hidden />
          {t.common.email}
        </a>
      )}
    </div>
  );
}

/** "Skip to content": the first focusable element of every page. */
export function SkipLink({ t, className }: { t: BaseMessages; className?: string }) {
  return (
    <a
      href="#content"
      className={cn(
        'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2',
        className,
      )}
    >
      {t.common.skipToContent}
    </a>
  );
}

/**
 * The body of every page: skip link, header, main content, footer, the phones' action bar and
 * smooth scrolling between the landing page's sections. The site's layout keeps <html>, fonts
 * and the menu. A site with its own header and footer composes SkipLink, its chrome, <main
 * id="content"> and SmoothScroll itself.
 */
export function SiteShell({
  website,
  t,
  locale,
  links,
  logo,
  logoLight,
  topBar,
  cta,
  drawerNote,
  footer,
  children,
}: {
  website: Website;
  t: BaseMessages;
  locale: Locale;
  /** The landing page's sections, in page order (the first is the hero: "top"). */
  links: SectionLink[];
  logo: ReactNode;
  logoLight: ReactNode;
  topBar?: ReactNode;
  cta?: Cta;
  drawerNote?: ReactNode;
  /** The footer's options (SiteFooter): its own contact column, a note, a class. */
  footer?: { explore?: SectionLink[]; contact?: ReactNode; hoursNote?: string; note?: ReactNode; className?: string };
  children: ReactNode;
}) {
  return (
    <>
      <SkipLink t={t} />
      <SiteHeader website={website} t={t} locale={locale} links={links} logo={logo} topBar={topBar} cta={cta} drawerNote={drawerNote} />
      <main id="content" className="flex-1">
        {children}
      </main>
      <SiteFooter website={website} t={t} locale={locale} logo={logoLight} {...footer} explore={footer?.explore ?? links.slice(1)} />
      <MobileActionBar website={website} t={t} />
      <SmoothScroll />
    </>
  );
}
