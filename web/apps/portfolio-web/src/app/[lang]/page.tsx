import type { Metadata } from 'next';
import { ArrowDown, ArrowUpRight } from 'lucide-react';
import { Container, buttonVariants, cn } from '@web/ui';
import { Reveal } from '@web/ui/reveal';
import { JsonLd } from '@web/ui/json-ld';
import { profile } from '@/content/profile';
import { inkLink, SectionHeading } from '@/features/editorial/section-heading';
import { ArchitectureDiagram } from '@/features/home/architecture-diagram';
import { SampleSites } from '@/features/freelance/sample-sites';
import { getLocale, getMessages, type Messages } from '@/i18n/messages';
import { publicPageMetadata, structuredData } from '@/seo';

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  return publicPageMetadata({ t, locale, path: '/', description: t.profile.tagline, type: 'profile' });
}

/** The CV's figures, as of the build year. */
const YEAR = 2026;

/**
 * The Freelancer page (home): hero, the sample sites, how we work together. The
 * platform and the CV are on the Resume page (/about); contact sits in the footer of every page.
 */
export default async function HomePage() {
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  return (
    <>
      <JsonLd data={structuredData(t, locale, { path: '/' })} />
      <Hero t={t} />
      <Reveal>
        <SampleSites t={t} locale={locale} />
      </Reveal>
      <Reveal>
        <Process t={t} />
      </Reveal>
    </>
  );
}

/* ─────────────────────────────── Hero ─────────────────────────────── */

function Hero({ t }: { t: Messages }) {
  const h = t.home.hero;
  return (
    <section className="relative">
      <Container className="pt-10 pb-16 sm:pt-14 sm:pb-20">
        <p className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-border pb-4 font-mono text-xs tracking-widest text-subtle uppercase">
          <span>{t.profile.role}</span>
          <span>{h.basedIn}</span>
          <span className="flex items-center gap-2 text-fg">
            <span className="size-1.5 rounded-full bg-brand" aria-hidden />
            {t.profile.availability}
          </span>
        </p>

        <h1 className="mt-12 max-w-6xl font-display text-5xl leading-[0.98] font-medium tracking-tight text-balance sm:text-7xl xl:text-[7.5rem]">
          {h.headline} <em className="font-normal text-brand">{h.headlineAccent}</em>
        </h1>

        <div className="mt-14 grid gap-14 lg:grid-cols-[1fr_1.15fr] lg:items-start">
          <div>
            <p className="max-w-xl text-lg leading-relaxed text-pretty text-muted">
              <span className="font-medium text-fg">{profile.name}.</span> {t.profile.tagline}
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
              <a href="#samples" className={cn(buttonVariants({ size: 'lg' }), 'rounded-full')}>
                {h.seeSamples}
                <ArrowDown aria-hidden className="size-4" />
              </a>
              <a href="#contact" className={inkLink}>
                {h.contact}
                <ArrowUpRight aria-hidden className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </a>
            </div>
            <dl aria-label={t.home.stats.label} className="mt-14 flex gap-12">
              <div className="flex flex-col-reverse">
                <dt className="mt-1 max-w-32 text-sm leading-snug text-muted">{t.home.stats.coding}</dt>
                <dd className="font-display text-5xl font-medium">{YEAR - profile.stats.codingSince}+</dd>
              </div>
              <div className="flex flex-col-reverse">
                <dt className="mt-1 max-w-32 text-sm leading-snug text-muted">{t.home.stats.companies}</dt>
                <dd className="font-display text-5xl font-medium">{profile.stats.companies}</dd>
              </div>
            </dl>
          </div>

          <ArchitectureDiagram label={t.home.diagram.label} hint={t.home.diagram.hint} nodes={t.home.diagram.nodes} />
        </div>
      </Container>
    </section>
  );
}

/* ─────────────────────────────── How we work together ─────────────────────────────── */

function Process({ t }: { t: Messages }) {
  const s = t.services;
  return (
    <section>
      <Container className="py-16 sm:py-20">
        <SectionHeading eyebrow={s.processEyebrow} title={s.processTitle} />
        <div className="mt-12 grid gap-16 lg:grid-cols-[1.4fr_1fr]">
          <ol className="space-y-8">
            {s.process.map((step, index) => (
              <li key={step.title} className="grid grid-cols-[3rem_1fr] gap-4">
                <span className="font-display text-3xl text-brand italic">{index + 1}</span>
                <div>
                  <h3 className="text-lg font-semibold">{step.title}</h3>
                  <p className="mt-1 leading-relaxed text-muted">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="self-start border-t border-fg pt-6">
            <h3 className="font-mono text-xs tracking-widest text-subtle uppercase">{s.includedTitle}</h3>
            <ul className="mt-6 divide-y divide-border">
              {s.included.map((item) => (
                <li key={item} className="py-3">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </section>
  );
}
