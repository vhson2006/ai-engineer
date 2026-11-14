import Image from 'next/image';
import { Clock, Leaf, MessageCircle } from 'lucide-react';
import { format } from '@web/core/i18n/format';
import { LatestArticles } from '@web/site-kit/components/articles';
import { ContactSection } from '@web/site-kit/components/contact';
import { Faq } from '@web/site-kit/components/faq';
import { Eyebrow, SectionHeading } from '@web/site-kit/components/section';
import { formatVnd } from '@web/site-kit/format';
import { Container, buttonVariants, cn } from '@web/ui';
import { JsonLd } from '@web/ui/json-ld';
import { packages, treatmentGroups, treatments } from '@/content/treatments';
import { site } from '@/site';
import facial from '../../../public/images/facial.jpg';
import hero from '../../../public/images/hero.jpg';
import lounge from '../../../public/images/lounge.jpg';
import massage from '../../../public/images/massage.jpg';
import ritual from '../../../public/images/ritual.jpg';

const GROUP_IMAGES = { massage, facial, body: ritual };

/** The landing page: hero, treatments, packages, your visit, articles, FAQ, contact. */
export default async function HomePage() {
  const [t, locale] = await Promise.all([site.getMessages(), site.getLocale()]);
  const latest = await site.latestArticles(locale);
  const { business } = site;
  const tr = t.treatments;

  return (
    <>
      <JsonLd data={site.structuredData(t, locale)} />

      {/* Hero: words on sand, the treatment room, a quiet quote. */}
      <section id="top" aria-labelledby="hero-title" className="scroll-mt-[100vh]">
        <Container className="grid items-center gap-12 py-16 sm:py-20 lg:grid-cols-[1fr_1.15fr]">
          <div>
            <Eyebrow>{t.hero.eyebrow}</Eyebrow>
            <h1 id="hero-title" className="display mt-6 text-5xl leading-[1.05] text-balance text-brand-strong sm:text-6xl lg:text-7xl">
              {t.hero.title}
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted">{t.hero.text}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a href={business.zaloHref} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ size: 'lg' }), 'rounded-button px-7')}>
                <MessageCircle aria-hidden />
                {t.hero.book}
              </a>
              <a href="#treatments" className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }), 'rounded-button px-7')}>
                {t.hero.viewTreatments}
              </a>
            </div>
          </div>
          <div className="relative">
            <div className="relative aspect-[4/3] overflow-hidden rounded-card lg:aspect-[5/4]">
              <Image src={hero} alt={t.hero.imageAlt} priority placeholder="blur" sizes="(min-width: 1024px) 640px, 100vw" className="size-full object-cover" />
            </div>
            <figure className="absolute -bottom-8 left-6 max-w-xs rounded-card bg-surface p-5 shadow-xl sm:left-auto sm:right-8">
              <blockquote className="display text-xl text-brand-strong">{t.hero.quote}</blockquote>
              <figcaption className="mt-2 text-sm text-muted">{t.hero.quoteNote}</figcaption>
            </figure>
          </div>
        </Container>
      </section>

      {/* Treatments: three groups, each with its photo; durations and prices. */}
      <section id="treatments" aria-labelledby="treatments-title" className="py-16 sm:py-24">
        <Container>
          <div id="treatments-title">
            <SectionHeading eyebrow={tr.eyebrow} title={tr.title} intro={tr.intro} />
          </div>
          <div className="mt-14 space-y-12">
            {treatmentGroups.map((group, index) => (
              <div
                key={group}
                className={cn('grid gap-8 rounded-card bg-surface p-6 sm:p-8', index % 2 === 1 ? 'lg:grid-cols-[1fr_18rem]' : 'lg:grid-cols-[18rem_1fr]')}
              >
                <div className={cn('relative aspect-[4/3] overflow-hidden rounded-card lg:aspect-auto', index % 2 === 1 && 'lg:order-last')}>
                  <Image src={GROUP_IMAGES[group]} alt="" placeholder="blur" sizes="(min-width: 1024px) 288px, 100vw" className="size-full object-cover" />
                </div>
                <div>
                  <h3 className="display flex items-center gap-3 text-3xl text-brand-strong">
                    <Leaf aria-hidden className="size-6 text-accent" />
                    {tr.groups[group]}
                  </h3>
                  <ul className="mt-6 divide-y divide-border">
                    {treatments[group].map((item) => {
                      const text = (tr[group].items as Record<string, { name: string; desc: string }>)[item.id];
                      return (
                        <li key={item.id} className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-8">
                          <div>
                            <p className="font-bold">{text.name}</p>
                            <p className="mt-1 text-sm leading-relaxed text-muted">{text.desc}</p>
                          </div>
                          <ul className="flex flex-wrap gap-2 sm:justify-end">
                            {item.options.map((option) => (
                              <li key={option.minutes} className="rounded-full bg-surface-2 px-4 py-1.5 text-sm whitespace-nowrap">
                                <span className="text-accent">{format(tr.minutes, { minutes: option.minutes })}</span>
                                <span aria-hidden className="mx-1.5 text-subtle">·</span>
                                <span className="font-semibold tabular-nums">{formatVnd(locale, option.price)}</span>
                              </li>
                            ))}
                          </ul>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Packages. */}
      <section id="packages" aria-labelledby="packages-title" className="bg-deep py-16 text-deep-fg sm:py-24">
        <Container>
          <div id="packages-title">
            <SectionHeading eyebrow={t.packages.eyebrow} title={t.packages.title} intro={t.packages.intro} tone="light" />
          </div>
          <ul className="mt-14 grid gap-6 md:grid-cols-3">
            {packages.map((pack) => (
              <li
                key={pack.id}
                className={cn(
                  'relative flex flex-col rounded-card p-7',
                  pack.signature ? 'bg-deep-fg text-brand-strong' : 'border border-deep-fg/20',
                )}
              >
                {pack.signature && (
                  <span className="absolute -top-3 left-7 rounded-full bg-accent px-3 py-1 text-xs font-bold tracking-wide text-accent-fg uppercase">
                    {t.packages.signature}
                  </span>
                )}
                <p className={cn('inline-flex items-center gap-2 text-sm font-semibold', pack.signature ? 'text-accent' : 'text-deep-fg/70')}>
                  <Clock aria-hidden className="size-4" />
                  {format(t.packages.duration, { minutes: pack.minutes })}
                </p>
                <h3 className="display mt-3 text-3xl">{t.packages.items[pack.id].name}</h3>
                <p className={cn('mt-3 flex-1 leading-relaxed', pack.signature ? 'text-muted' : 'text-deep-fg/80')}>{t.packages.items[pack.id].desc}</p>
                <p className="mt-6 text-2xl font-semibold tabular-nums">
                  {formatVnd(locale, pack.price)}
                  {pack.id === 'together' && <span className="ml-2 text-sm font-normal opacity-75">{t.packages.forTwo}</span>}
                </p>
                <a
                  href={business.zaloHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    buttonVariants({ variant: pack.signature ? 'primary' : 'secondary' }),
                    'mt-6 rounded-button',
                    !pack.signature && 'border-deep-fg/30 bg-transparent text-deep-fg hover:bg-deep-fg/10',
                  )}
                >
                  {t.packages.book}
                </a>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* Your visit: four steps and a few manners. */}
      <section id="ritual" aria-labelledby="ritual-title" className="py-16 sm:py-24">
        <Container className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <div id="ritual-title">
              <SectionHeading eyebrow={t.ritual.eyebrow} title={t.ritual.title} intro={t.ritual.intro} align="left" />
            </div>
            <ol className="mt-8 space-y-5">
              {t.ritual.steps.map((step, index) => (
                <li key={step.title} className="flex gap-5">
                  <span className="display flex size-11 shrink-0 items-center justify-center rounded-full border border-accent text-lg text-accent">{index + 1}</span>
                  <div>
                    <h3 className="font-bold">{step.title}</h3>
                    <p className="mt-0.5 text-muted">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-10 rounded-card bg-brand-soft p-6">
              <h3 className="display text-xl text-brand-soft-fg">{t.ritual.etiquetteTitle}</h3>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed marker:text-brand">
                {t.ritual.etiquette.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="relative aspect-[4/5] overflow-hidden rounded-card">
            <Image src={lounge} alt={t.ritual.imageAlt} placeholder="blur" sizes="(min-width: 1024px) 600px, 100vw" className="size-full object-cover" />
          </div>
        </Container>
      </section>

      <LatestArticles articles={latest} website={site.website} locale={locale} t={t} />

      <Faq items={t.questions.items} website={site.website} t={t} />

      <ContactSection website={site.website} t={t} locale={locale} eyebrow={t.visit.eyebrow} title={t.visit.title} text={t.visit.text} note={t.visit.note} />
    </>
  );
}
