import Image from 'next/image';
import { BatteryCharging, CheckCircle2, Cog, Disc3, Droplet, Filter, Lightbulb, MessageCircle, ShieldCheck, Thermometer, Waves } from 'lucide-react';
import { format } from '@web/core/i18n/format';
import { LatestArticles } from '@web/site-kit/components/articles';
import { ContactSection } from '@web/site-kit/components/contact';
import { Faq } from '@web/site-kit/components/faq';
import { Eyebrow, SectionHeading } from '@web/site-kit/components/section';
import { formatVnd } from '@web/site-kit/format';
import { Container, buttonVariants, cn } from '@web/ui';
import { JsonLd } from '@web/ui/json-ld';
import { CATEGORIES, parts, services, type CategoryId } from '@/content/parts';
import { PartsCatalog } from '@/features/catalog/parts-catalog';
import { site } from '@/site';
import hero from '../../../public/images/hero.jpg';
import workshop from '../../../public/images/workshop.jpg';

const ICONS: Record<CategoryId, typeof Disc3> = {
  brakes: Disc3,
  filters: Filter,
  oil: Droplet,
  battery: BatteryCharging,
  suspension: Waves,
  lighting: Lightbulb,
  belts: Cog,
  cooling: Thermometer,
};

/** The landing page: hero, categories, catalogue, how to order, workshop, articles, FAQ, contact. */
export default async function HomePage() {
  const [t, locale] = await Promise.all([site.getMessages(), site.getLocale()]);
  const latest = await site.latestArticles(locale);
  const { business } = site;
  const rows = parts.map((part) => ({
    id: part.id,
    category: part.category,
    name: t.catalog.items[part.id].name,
    fits: t.catalog.items[part.id].fits,
    price: formatVnd(locale, part.price),
    inStock: part.inStock,
  }));

  return (
    <>
      <JsonLd data={site.structuredData(t, locale)} />

      {/* Hero: graphite, the parts lit in orange, three promises. */}
      <section id="top" aria-labelledby="hero-title" className="relative scroll-mt-[100vh] bg-deep text-deep-fg">
        <div aria-hidden className="hazard" />
        <Container className="grid items-center gap-12 py-16 sm:py-20 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <Eyebrow tone="light">{t.hero.eyebrow}</Eyebrow>
            <h1 id="hero-title" className="display mt-6 text-5xl leading-[1.02] text-balance sm:text-6xl lg:text-7xl">
              {t.hero.title}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-deep-fg/80">{t.hero.text}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a href={business.zaloHref} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ size: 'lg' }), 'rounded-button px-7')}>
                <MessageCircle aria-hidden />
                {t.hero.ask}
              </a>
              <a
                href="#catalog"
                className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }), 'rounded-button border-deep-fg/25 bg-transparent px-7 text-deep-fg hover:bg-deep-fg/10')}
              >
                {t.hero.viewCatalog}
              </a>
            </div>
            <ul className="mt-10 space-y-3">
              {t.hero.points.map((point) => (
                <li key={point} className="flex items-center gap-3 font-semibold">
                  <CheckCircle2 aria-hidden className="size-5 text-accent" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative aspect-[16/10] overflow-hidden rounded-card ring-1 ring-deep-fg/10">
            <Image src={hero} alt={t.hero.imageAlt} priority placeholder="blur" sizes="(min-width: 1024px) 640px, 100vw" className="size-full object-cover" />
          </div>
        </Container>
      </section>

      {/* Categories. */}
      <section id="categories" aria-labelledby="categories-title" className="py-16 sm:py-24">
        <Container>
          <div id="categories-title">
            <SectionHeading eyebrow={t.categories.eyebrow} title={t.categories.title} intro={t.categories.intro} />
          </div>
          <ul className="mt-14 grid grid-cols-2 gap-4 md:grid-cols-4">
            {CATEGORIES.map((id) => {
              const Icon = ICONS[id];
              return (
                <li key={id} className="group rounded-card border border-border bg-surface p-5 transition-colors hover:border-brand sm:p-6">
                  <Icon aria-hidden className="size-8 text-brand" />
                  <h3 className="display mt-4 text-xl">{t.categories.items[id].name}</h3>
                  <p className="mt-1 text-sm text-muted">{t.categories.items[id].text}</p>
                </li>
              );
            })}
          </ul>
        </Container>
      </section>

      {/* Catalogue: filtered in the browser. */}
      <section id="catalog" aria-labelledby="catalog-title" className="bg-surface-2 py-16 sm:py-24">
        <Container>
          <div id="catalog-title">
            <SectionHeading eyebrow={t.catalog.eyebrow} title={t.catalog.title} intro={t.catalog.intro} align="left" />
          </div>
          <div className="mt-10">
            <PartsCatalog rows={rows} categories={CATEGORIES.map((id) => ({ id, label: t.categories.items[id].name }))} labels={t.catalog.labels} />
          </div>
          <p className="mt-6 text-sm text-muted">{t.catalog.note}</p>
        </Container>
      </section>

      {/* How to order: three steps. */}
      <section id="order" aria-labelledby="order-title" className="py-16 sm:py-24">
        <Container>
          <div id="order-title">
            <SectionHeading eyebrow={t.order.eyebrow} title={t.order.title} intro={t.order.intro} />
          </div>
          <ol className="mt-14 grid gap-6 md:grid-cols-3">
            {t.order.steps.map((step, index) => (
              <li key={step.title} className="relative overflow-hidden rounded-card border border-border bg-surface p-7">
                <span aria-hidden className="display absolute -top-4 -right-1 text-8xl text-brand/15">
                  {index + 1}
                </span>
                <span className="display text-sm text-brand">0{index + 1}</span>
                <h3 className="display mt-2 text-2xl">{step.title}</h3>
                <p className="mt-3 leading-relaxed text-muted">{step.text}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* Workshop: services with a price "from", warranty. */}
      <section id="workshop" aria-labelledby="workshop-title" className="bg-deep py-16 text-deep-fg sm:py-24">
        <Container className="grid gap-12 lg:grid-cols-2">
          <div>
            <div id="workshop-title">
              <SectionHeading eyebrow={t.workshop.eyebrow} title={t.workshop.title} intro={t.workshop.intro} align="left" tone="light" />
            </div>
            <ul className="mt-8 divide-y divide-deep-fg/15 border-y border-deep-fg/15">
              {services.map((service) => (
                <li key={service.id} className="flex items-start justify-between gap-6 py-4">
                  <div>
                    <p className="font-bold">{t.workshop.services[service.id].name}</p>
                    <p className="text-sm text-deep-fg/70">{t.workshop.services[service.id].text}</p>
                  </div>
                  <p className="shrink-0 text-right font-semibold text-accent tabular-nums">
                    {service.from === 0 ? t.workshop.free : format(t.workshop.from, { price: formatVnd(locale, service.from) })}
                  </p>
                </li>
              ))}
            </ul>
            <h3 className="display mt-10 flex items-center gap-2 text-xl text-accent">
              <ShieldCheck aria-hidden className="size-6" />
              {t.workshop.warrantyTitle}
            </h3>
            <ul className="mt-4 space-y-2 text-deep-fg/85">
              {t.workshop.warranty.map((line) => (
                <li key={line} className="flex gap-2.5">
                  <CheckCircle2 aria-hidden className="mt-0.5 size-5 shrink-0 text-brand" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-card lg:aspect-auto">
            <Image src={workshop} alt={t.workshop.imageAlt} placeholder="blur" sizes="(min-width: 1024px) 600px, 100vw" className="size-full object-cover" />
          </div>
        </Container>
      </section>

      <LatestArticles articles={latest} website={site.website} locale={locale} t={t} />

      <Faq items={t.questions.items} website={site.website} t={t} />

      <ContactSection website={site.website} t={t} locale={locale} eyebrow={t.visit.eyebrow} title={t.visit.title} text={t.visit.text} note={t.visit.note} />
    </>
  );
}
