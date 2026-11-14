import Image from 'next/image';
import { Check, Compass, Leaf, MessageCircle, ReceiptText, Users, X } from 'lucide-react';
import { format } from '@web/core/i18n/format';
import { LatestArticles } from '@web/site-kit/components/articles';
import { ContactSection } from '@web/site-kit/components/contact';
import { Faq } from '@web/site-kit/components/faq';
import { SectionHeading } from '@web/site-kit/components/section';
import { formatVnd } from '@web/site-kit/format';
import { Container, buttonVariants, cn } from '@web/ui';
import { JsonLd } from '@web/ui/json-ld';
import { tours } from '@/content/tours';
import { site } from '@/site';
import hero from '../../../public/images/hero.jpg';

const WHY_ICONS = [Compass, Users, ReceiptText, Leaf];

/** The landing page: hero, tours, why us, how it works, articles, FAQ, contact. */
export default async function HomePage() {
  const [t, locale] = await Promise.all([site.getMessages(), site.getLocale()]);
  const latest = await site.latestArticles(locale);
  const { business } = site;

  return (
    <>
      <JsonLd data={site.structuredData(t, locale)} />

      {/* Hero: the terraces at golden hour, the promise, three numbers. */}
      <section id="top" aria-labelledby="hero-title" className="relative isolate scroll-mt-[100vh] overflow-hidden text-white">
        <Image src={hero} alt={t.hero.imageAlt} priority placeholder="blur" sizes="100vw" className="absolute inset-0 -z-10 size-full object-cover" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-[#0b2a3a] via-[#0b2a3a]/45 to-[#0b2a3a]/10" />
        <Container className="flex min-h-[min(82vh,880px)] flex-col justify-end pt-32 pb-14">
          <p className="inline-flex w-fit items-center rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold backdrop-blur">{t.hero.eyebrow}</p>
          <h1 id="hero-title" className="display mt-5 max-w-4xl text-5xl leading-[1.02] text-balance sm:text-7xl">
            {t.hero.title}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/90">{t.hero.text}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <a href={business.zaloHref} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ size: 'lg' }), 'rounded-button bg-accent px-7 text-accent-fg hover:bg-accent/90')}>
              <MessageCircle aria-hidden />
              {t.hero.plan}
            </a>
            <a href="#tours" className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }), 'rounded-button border-white/40 bg-white/10 px-7 text-white backdrop-blur hover:bg-white/20')}>
              {t.hero.viewTours}
            </a>
          </div>
          <dl className="mt-12 grid max-w-2xl grid-cols-3 gap-6 border-t border-white/25 pt-6">
            {t.hero.stats.map((stat) => (
              <div key={stat.label}>
                <dt className="sr-only">{stat.label}</dt>
                <dd>
                  <span className="display block text-3xl sm:text-4xl">{stat.value}</span>
                  <span className="mt-1 block text-sm text-white/80">{stat.label}</span>
                </dd>
              </div>
            ))}
          </dl>
        </Container>
      </section>

      {/* Tours: four cards, region, length, group size, highlights, price. */}
      <section id="tours" aria-labelledby="tours-title" className="py-16 sm:py-24">
        <Container>
          <div id="tours-title">
            <SectionHeading eyebrow={t.tours.eyebrow} title={t.tours.title} intro={t.tours.intro} />
          </div>
          <ul className="mt-14 grid gap-8 md:grid-cols-2">
            {tours.map((tour) => {
              const text = t.tours.items[tour.id];
              return (
                <li key={tour.id}>
                  <article className="group flex h-full flex-col overflow-hidden rounded-card border border-border bg-surface shadow-sm transition-shadow hover:shadow-xl hover:shadow-brand/10">
                    <div className="relative aspect-[16/10] overflow-hidden">
                      <Image
                        src={tour.image}
                        alt=""
                        placeholder="blur"
                        sizes="(min-width: 768px) 600px, 100vw"
                        className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <span className="absolute top-4 left-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold tracking-wide text-brand-strong uppercase">
                        {t.tours.regions[tour.region]}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col p-7">
                      <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold text-brand">
                        <span>{format(t.tours.duration, { days: tour.days, nights: tour.nights })}</span>
                        <span aria-hidden>·</span>
                        <span>{format(t.tours.group, { count: tour.maxGroup })}</span>
                      </p>
                      <h3 className="display mt-2 text-2xl text-brand-strong">{text.name}</h3>
                      <p className="mt-2 leading-relaxed text-muted">{text.summary}</p>
                      <ul className="mt-5 flex-1 space-y-2">
                        {text.highlights.map((highlight) => (
                          <li key={highlight} className="flex gap-2.5 text-sm">
                            <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-brand" />
                            {highlight}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-7 flex flex-wrap items-end justify-between gap-4 border-t border-border pt-5">
                        <p>
                          <span className="block text-xs font-semibold tracking-wide text-muted uppercase">{t.tours.from}</span>
                          <span className="display text-2xl text-accent tabular-nums">{formatVnd(locale, tour.price)}</span>
                          <span className="ml-1.5 text-sm text-muted">{t.tours.perPerson}</span>
                        </p>
                        <a href={business.zaloHref} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: 'secondary' }), 'rounded-button')}>
                          <MessageCircle aria-hidden />
                          {t.tours.ask}
                        </a>
                      </div>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        </Container>
      </section>

      {/* Why us: four reasons. */}
      <section id="why" aria-labelledby="why-title" className="bg-surface-2 py-16 sm:py-24">
        <Container className="grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:items-center">
          <div id="why-title">
            <SectionHeading eyebrow={t.why.eyebrow} title={t.why.title} intro={t.why.intro} align="left" />
          </div>
          <ul className="grid gap-5 sm:grid-cols-2">
            {t.why.items.map((item, index) => {
              const Icon = WHY_ICONS[index];
              return (
                <li key={item.title} className="rounded-card bg-surface p-6 shadow-sm">
                  <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                    <Icon aria-hidden className="size-6" />
                  </span>
                  <h3 className="display mt-4 text-xl text-brand-strong">{item.title}</h3>
                  <p className="mt-2 leading-relaxed text-muted">{item.text}</p>
                </li>
              );
            })}
          </ul>
        </Container>
      </section>

      {/* How it works: four steps, then what a quote usually includes. */}
      <section id="plan" aria-labelledby="plan-title" className="bg-deep py-16 text-deep-fg sm:py-24">
        <Container>
          <div id="plan-title">
            <SectionHeading eyebrow={t.plan.eyebrow} title={t.plan.title} intro={t.plan.intro} tone="light" />
          </div>
          <ol className="mt-14 grid gap-6 md:grid-cols-4">
            {t.plan.steps.map((step, index) => (
              <li key={step.title} className="relative rounded-card border border-deep-fg/15 p-6">
                <span className="display inline-flex size-11 items-center justify-center rounded-full bg-accent text-lg text-accent-fg">{index + 1}</span>
                <h3 className="display mt-4 text-xl">{step.title}</h3>
                <p className="mt-2 leading-relaxed text-deep-fg/80">{step.text}</p>
              </li>
            ))}
          </ol>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <div className="rounded-card bg-deep-fg/5 p-7">
              <h3 className="display text-lg text-accent">{t.plan.includesTitle}</h3>
              <ul className="mt-4 space-y-2.5">
                {t.plan.includes.map((item) => (
                  <li key={item} className="flex gap-2.5">
                    <Check aria-hidden className="mt-0.5 size-5 shrink-0 text-accent" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-card bg-deep-fg/5 p-7">
              <h3 className="display text-lg text-deep-fg/80">{t.plan.excludesTitle}</h3>
              <ul className="mt-4 space-y-2.5 text-deep-fg/80">
                {t.plan.excludes.map((item) => (
                  <li key={item} className="flex gap-2.5">
                    <X aria-hidden className="mt-0.5 size-5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </section>

      <LatestArticles articles={latest} website={site.website} locale={locale} t={t} />

      <Faq items={t.questions.items} website={site.website} t={t} />

      <ContactSection website={site.website} t={t} locale={locale} eyebrow={t.visit.eyebrow} title={t.visit.title} text={t.visit.text} note={t.visit.note} />
    </>
  );
}
