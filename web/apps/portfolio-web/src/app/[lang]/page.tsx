import Link from 'next/link';
import { Card, Chip, Container, Section, buttonClass } from '@web/ui';
import { Reveal } from '@web/ui/reveal';
import { profile } from '@/content/profile';
import { format } from '@web/core/i18n/format';
import { href, type Locale } from '@/i18n/locales';
import { getLocale, getMessages, type Messages } from '@/i18n/messages';
import { JsonLd } from '@/components/json-ld';
import { publicPageMetadata, structuredData } from '@/seo';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  return publicPageMetadata({ t, locale, path: '/', description: t.profile.tagline, type: 'profile' });
}

/** Fully static: prerendered at build time once per language, served instantly. */
export default async function HomePage() {
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  const p = t.profile;
  return (
    <>
      <JsonLd data={structuredData(t, locale, { path: '/' })} />
      <Hero t={t} locale={locale} />

      <Reveal>
        <Section
          id="skills"
          eyebrow={t.home.skills.eyebrow}
          title={t.home.skills.title}
          intro={t.home.skills.intro}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {p.skills.map((group) => (
              <Card key={group.group}>
                <h3 className="font-semibold">{group.group}</h3>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {group.items.map((item) => (
                    <li key={item}>
                      <Chip>{item}</Chip>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </Section>
      </Reveal>

      <Reveal>
        <div className="border-y border-border bg-surface">
          <Section
            eyebrow={t.home.strengths.eyebrow}
            title={t.home.strengths.title}
            intro={t.home.strengths.intro}
          >
            <div className="grid gap-6 sm:grid-cols-2">
              {p.strengths.map((item, index) => (
                <div key={item.title} className="flex gap-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft font-mono text-sm font-semibold text-brand-soft-fg">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="mt-1.5 leading-relaxed text-muted">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </Reveal>

      <Reveal>
        <Section eyebrow={t.home.project.eyebrow} title={p.project.name} intro={p.project.summary}>
          <Card className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <ul className="grid gap-3">
              {p.project.points.map((point) => (
                <li key={point} className="flex gap-3">
                  <CheckIcon />
                  <span className="text-muted">{point}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link href={href(locale, '/dashboard')} className={buttonClass.primary}>
                {t.home.project.openDashboard}
              </Link>
              <Link href={href(locale, '/about')} className={buttonClass.secondary}>
                {t.home.project.moreAboutMe}
              </Link>
            </div>
          </Card>
        </Section>
      </Reveal>

      <Reveal>
        <Container className="pb-20">
          <div className="rounded-3xl bg-brand px-6 py-12 text-center text-brand-fg sm:px-12">
            <h2 className="text-2xl font-bold tracking-tight text-balance sm:text-3xl">{t.home.cta.title}</h2>
            <p className="mx-auto mt-3 max-w-xl text-pretty opacity-90">{t.home.cta.text}</p>
            <a
              href={`mailto:${profile.contact.email}`}
              className="mt-6 inline-flex rounded-lg bg-brand-fg px-5 py-2.5 text-sm font-semibold text-brand transition-opacity hover:opacity-90"
            >
              {profile.contact.email}
            </a>
          </div>
        </Container>
      </Reveal>
    </>
  );
}

function Hero({ t, locale }: { t: Messages; locale: Locale }) {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 h-[28rem] bg-[radial-gradient(ellipse_at_top,var(--brand-soft),transparent_65%)]"
      />
      <Container className="relative grid gap-12 py-20 sm:py-28 lg:grid-cols-[1.3fr_1fr] lg:items-center">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-sm text-muted">
            <span className="size-2 rounded-full bg-emerald-500" aria-hidden />
            {t.profile.availability}
          </p>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-balance sm:text-6xl">
            {format(t.home.hero.greeting, { name: profile.name })}
            <span className="mt-2 block text-brand">{t.profile.role}</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-pretty text-muted">{t.profile.tagline}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="#skills" className={buttonClass.primary}>
              {t.home.hero.seeSkills}
            </Link>
            <Link href={href(locale, '/about')} className={buttonClass.secondary}>
              {t.home.hero.aboutMe}
            </Link>
          </div>
        </div>

        <Card className="font-mono text-sm">
          <div className="mb-4 flex gap-1.5" aria-hidden>
            <span className="size-3 rounded-full bg-red-400" />
            <span className="size-3 rounded-full bg-amber-400" />
            <span className="size-3 rounded-full bg-emerald-400" />
          </div>
          <pre className="overflow-x-auto leading-relaxed text-muted">
            <span className="text-brand">const</span> engineer = {'{'}
            {'\n'}  focus: <span className="text-emerald-600 dark:text-emerald-400">&apos;platforms&apos;</span>,
            {'\n'}  gateway: <span className="text-emerald-600 dark:text-emerald-400">&apos;KrakenD&apos;</span>,
            {'\n'}  identity: <span className="text-emerald-600 dark:text-emerald-400">&apos;Keycloak&apos;</span>,
            {'\n'}  runsOn: <span className="text-emerald-600 dark:text-emerald-400">&apos;Kubernetes&apos;</span>,
            {'\n'}  ships: <span className="text-brand">true</span>,
            {'\n'}{'}'};
          </pre>
        </Card>
      </Container>
    </section>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden className="mt-0.5 size-5 shrink-0 text-brand">
      <path
        fillRule="evenodd"
        d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.8 3.8 6.8-6.8a1 1 0 0 1 1.4 0Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
