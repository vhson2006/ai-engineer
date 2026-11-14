import Image from 'next/image';
import { CalendarClock, Fish, Phone } from 'lucide-react';
import { format } from '@web/core/i18n/format';
import { LatestArticles } from '@web/site-kit/components/articles';
import { ContactSection } from '@web/site-kit/components/contact';
import { Faq } from '@web/site-kit/components/faq';
import { Eyebrow, SectionHeading } from '@web/site-kit/components/section';
import { formatHours, formatVnd } from '@web/site-kit/format';
import { Container, buttonVariants, cn } from '@web/ui';
import { JsonLd } from '@web/ui/json-ld';
import { menu, menuGroups, omakase } from '@/content/menu';
import { site } from '@/site';
import chef from '../../../public/images/chef.jpg';
import counter from '../../../public/images/counter.jpg';
import hero from '../../../public/images/hero.jpg';
import omakaseImage from '../../../public/images/omakase.jpg';
import sake from '../../../public/images/sake.jpg';

const KANJI = ['一', '二', '三', '四'];

/** The landing page: hero, menu, story, the omakase evening, gallery, articles, FAQ, contact. */
export default async function HomePage() {
  const [t, locale] = await Promise.all([site.getMessages(), site.getLocale()]);
  const latest = await site.latestArticles(locale);
  const { business } = site;
  const f = t.food;
  const hourLabels: Record<string, string> = t.hours;

  return (
    <>
      <JsonLd data={site.structuredData(t, locale)} />

      {/* Hero: the counter at night, the promise, two ways in. */}
      <section id="top" aria-labelledby="hero-title" className="relative isolate scroll-mt-[100vh] overflow-hidden bg-deep text-deep-fg">
        <Image src={hero} alt={t.hero.imageAlt} priority placeholder="blur" sizes="100vw" className="absolute inset-0 -z-10 size-full object-cover opacity-55" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-deep via-deep/80 to-deep/10" />
        <span aria-hidden className="pointer-events-none absolute top-10 right-6 hidden text-[11rem] leading-none text-deep-fg/10 [writing-mode:vertical-rl] lg:block">
          雲
        </span>
        <Container className="flex min-h-[min(78vh,860px)] flex-col justify-center py-24">
          <Eyebrow tone="light">{t.hero.eyebrow}</Eyebrow>
          <h1 id="hero-title" className="display mt-6 max-w-3xl text-5xl leading-[1.05] text-balance sm:text-6xl lg:text-7xl">
            {t.hero.title}
          </h1>
          <div aria-hidden className="brush mt-8" />
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-deep-fg/85">{t.hero.text}</p>
          <div className="mt-10 flex flex-wrap gap-3">
            <a href={business.phone.href} className={cn(buttonVariants({ size: 'lg' }), 'rounded-button px-7')}>
              <Phone aria-hidden />
              {t.hero.reserve}
            </a>
            <a
              href="#menu"
              className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }), 'rounded-button border-deep-fg/30 bg-transparent px-7 text-deep-fg hover:bg-deep-fg/10')}
            >
              {t.hero.viewMenu}
            </a>
          </div>
          <p className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-deep-fg/75">
            {business.hours.map((row) => (
              <span key={row.key} className="inline-flex items-center gap-2">
                <CalendarClock aria-hidden className="size-4 text-accent" />
                {hourLabels[row.key]}: {formatHours(locale, row)}
              </span>
            ))}
            <span>{t.hero.closed}</span>
          </p>
        </Container>
      </section>

      {/* Menu: the omakase courses first, then à la carte. */}
      <section id="menu" aria-labelledby="menu-title" className="py-16 sm:py-24">
        <Container>
          <div id="menu-title">
            <SectionHeading eyebrow={f.eyebrow} title={f.title} intro={f.intro} />
          </div>
          <h3 className="display mt-14 text-center text-2xl text-brand-strong">{f.omakaseTitle}</h3>
          <ul className="mt-8 grid gap-5 md:grid-cols-3">
            {omakase.map((course) => (
              <li
                key={course.id}
                className={cn(
                  'relative flex flex-col rounded-card border bg-surface p-7',
                  course.signature ? 'border-brand shadow-xl shadow-brand/10' : 'border-border',
                )}
              >
                {course.signature && (
                  <span className="absolute -top-3 left-7 rounded-button bg-brand px-3 py-1 text-xs font-bold tracking-wide text-brand-fg uppercase">
                    {f.signature}
                  </span>
                )}
                <p className="text-sm font-semibold tracking-[0.2em] text-accent uppercase">{format(f.courses, { count: course.courses })}</p>
                <p className="display mt-2 text-3xl text-brand-strong">{f.omakase.items[course.id].name}</p>
                <p className="mt-3 flex-1 leading-relaxed text-muted">{f.omakase.items[course.id].desc}</p>
                <p className="mt-6 border-t border-border pt-4 text-2xl font-semibold tabular-nums">{formatVnd(locale, course.price)}</p>
              </li>
            ))}
          </ul>

          <div className="mt-16 grid gap-10 lg:grid-cols-3">
            {menuGroups.map((group) => (
              <div key={group}>
                <h3 className="display flex items-center gap-3 border-b border-border pb-3 text-2xl text-brand-strong">
                  <Fish aria-hidden className="size-5 text-brand" />
                  {f.groups[group]}
                  {group === 'nigiri' && <span className="ml-auto text-sm font-normal text-muted">{f.perPiece}</span>}
                </h3>
                <ul className="mt-4 space-y-5">
                  {menu[group].map((item) => {
                    const text = (f[group].items as Record<string, { name: string; desc: string }>)[item.id];
                    return (
                      <li key={item.id}>
                        <p className="flex items-baseline gap-3 font-semibold">
                          <span>{text.name}</span>
                          <span aria-hidden className="flex-1 border-b border-dotted border-border" />
                          <span className="tabular-nums">{formatVnd(locale, item.price)}</span>
                        </p>
                        <p className="mt-1 text-sm text-muted">{text.desc}</p>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Story: the chef's hands, two paragraphs, three numbers. */}
      <section id="story" aria-labelledby="story-title" className="bg-surface-2 py-16 sm:py-24">
        <Container className="grid items-center gap-12 lg:grid-cols-2">
          <div className="relative aspect-[4/3] overflow-hidden rounded-card">
            <Image src={chef} alt={t.story.imageAlt} placeholder="blur" sizes="(min-width: 1024px) 600px, 100vw" className="size-full object-cover" />
          </div>
          <div>
            <Eyebrow>{t.story.eyebrow}</Eyebrow>
            <h2 id="story-title" className="display mt-4 text-4xl leading-[1.1] text-balance text-brand-strong sm:text-5xl">
              {t.story.title}
            </h2>
            {t.story.paragraphs.map((paragraph) => (
              <p key={paragraph} className="mt-5 text-lg leading-relaxed text-muted">
                {paragraph}
              </p>
            ))}
            <dl className="mt-10 grid grid-cols-3 gap-4 border-t border-border pt-8">
              {t.story.facts.map((fact) => (
                <div key={fact.label}>
                  <dt className="sr-only">{fact.label}</dt>
                  <dd>
                    <span className="display block text-4xl text-brand">{fact.value}</span>
                    <span className="mt-1 block text-sm text-muted">{fact.label}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </Container>
      </section>

      {/* The omakase evening, in four steps (numbered in kanji). */}
      <section id="omakase" aria-labelledby="omakase-title" className="bg-deep py-16 text-deep-fg sm:py-24">
        <Container>
          <div id="omakase-title">
            <SectionHeading eyebrow={t.omakase.eyebrow} title={t.omakase.title} intro={t.omakase.intro} tone="light" />
          </div>
          <ol className="mt-14 grid gap-px overflow-hidden rounded-card bg-deep-fg/10 sm:grid-cols-2 lg:grid-cols-4">
            {t.omakase.steps.map((step, index) => (
              <li key={step.title} className="bg-deep p-7">
                <span aria-hidden className="display block text-5xl text-brand">
                  {KANJI[index]}
                </span>
                <h3 className="display mt-5 text-xl text-accent">{step.title}</h3>
                <p className="mt-3 leading-relaxed text-deep-fg/80">{step.text}</p>
              </li>
            ))}
          </ol>
          <p className="mt-8 text-center text-sm text-deep-fg/70">{t.omakase.note}</p>
        </Container>
      </section>

      {/* Gallery. */}
      <section aria-labelledby="gallery-title" className="py-16 sm:py-24">
        <Container>
          <h2 id="gallery-title" className="display text-center text-3xl text-brand-strong">
            {t.gallery.title}
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-[1.4fr_1fr] md:grid-rows-2">
            <figure className="relative aspect-[4/3] overflow-hidden rounded-card md:row-span-2 md:aspect-auto">
              <Image src={counter} alt={t.gallery.counter} placeholder="blur" sizes="(min-width: 768px) 700px, 100vw" className="size-full object-cover" />
            </figure>
            <figure className="relative aspect-[4/3] overflow-hidden rounded-card">
              <Image src={omakaseImage} alt={t.gallery.omakase} placeholder="blur" sizes="(min-width: 768px) 500px, 100vw" className="size-full object-cover" />
            </figure>
            <figure className="relative aspect-[4/3] overflow-hidden rounded-card">
              <Image src={sake} alt={t.gallery.sake} placeholder="blur" sizes="(min-width: 768px) 500px, 100vw" className="size-full object-cover" />
            </figure>
          </div>
        </Container>
      </section>

      <LatestArticles articles={latest} website={site.website} locale={locale} t={t} />

      <Faq items={t.questions.items} website={site.website} t={t} />

      <ContactSection website={site.website} t={t} locale={locale} eyebrow={t.visit.eyebrow} title={t.visit.title} text={t.visit.text} note={t.visit.note} />
    </>
  );
}
