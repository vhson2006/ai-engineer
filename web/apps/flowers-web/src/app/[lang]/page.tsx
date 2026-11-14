import Image from 'next/image';
import { Cake, Camera, Check, Flower2, GraduationCap, Heart, MessageCircle, PartyPopper, Sparkles, Truck } from 'lucide-react';
import { format } from '@web/core/i18n/format';
import { LatestArticles } from '@web/site-kit/components/articles';
import { ContactSection } from '@web/site-kit/components/contact';
import { Faq } from '@web/site-kit/components/faq';
import { Eyebrow, SectionHeading } from '@web/site-kit/components/section';
import { formatTime, formatVnd } from '@web/site-kit/format';
import { Container, buttonVariants, cn } from '@web/ui';
import { JsonLd } from '@web/ui/json-ld';
import { SAME_DAY_CUTOFF, SIZES, bouquets, zones } from '@/content/shop';
import { site } from '@/site';
import care from '../../../public/images/care.jpg';
import hero from '../../../public/images/hero.jpg';

const OCCASION_ICONS = [Cake, Heart, PartyPopper, GraduationCap, Flower2, Sparkles];
const BADGE_ICONS = [Truck, MessageCircle, Camera];

/** The landing page: hero, bouquets, occasions, delivery, flower care, articles, FAQ, contact. */
export default async function HomePage() {
  const [t, locale] = await Promise.all([site.getMessages(), site.getLocale()]);
  const latest = await site.latestArticles(locale);
  const { business } = site;
  const cutoff = formatTime(locale, SAME_DAY_CUTOFF);

  return (
    <>
      <JsonLd data={site.structuredData(t, locale)} />

      {/* Hero: words on the left, the bouquet in a soft arch on the right. */}
      <section id="top" aria-labelledby="hero-title" className="relative scroll-mt-[100vh] overflow-hidden">
        <div aria-hidden className="absolute -top-40 -left-40 size-[32rem] rounded-full bg-brand-soft blur-3xl" />
        <Container className="relative grid items-center gap-12 py-16 sm:py-20 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <Eyebrow>{t.hero.eyebrow}</Eyebrow>
            <h1 id="hero-title" className="display mt-6 text-5xl leading-[1.05] text-balance text-brand-strong sm:text-6xl lg:text-7xl">
              {t.hero.title} <em>{t.hero.titleAccent}</em>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">{t.hero.text}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a href={business.zaloHref} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ size: 'lg' }), 'rounded-button px-7')}>
                <MessageCircle aria-hidden />
                {t.hero.order}
              </a>
              <a href="#collections" className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }), 'rounded-button px-7')}>
                {t.hero.browse}
              </a>
            </div>
            <ul className="mt-10 flex flex-wrap gap-3">
              {t.hero.badges.map((badge, index) => {
                const Icon = BADGE_ICONS[index];
                return (
                  <li key={badge} className="inline-flex items-center gap-2 rounded-full bg-surface px-4 py-2 text-sm font-semibold shadow-sm">
                    <Icon aria-hidden className="size-4 text-accent" />
                    {badge}
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="relative mx-auto w-full max-w-xl">
            <div className="relative aspect-[4/5] overflow-hidden rounded-t-[12rem] rounded-b-card shadow-2xl shadow-brand/15">
              <Image src={hero} alt={t.hero.imageAlt} priority placeholder="blur" sizes="(min-width: 1024px) 560px, 100vw" className="size-full object-cover" />
            </div>
          </div>
        </Container>
      </section>

      {/* Bouquets: three signature bouquets in three sizes. */}
      <section id="collections" aria-labelledby="collections-title" className="bg-surface-2 py-16 sm:py-24">
        <Container>
          <div id="collections-title">
            <SectionHeading eyebrow={t.collections.eyebrow} title={t.collections.title} intro={t.collections.intro} />
          </div>
          <ul className="mt-14 grid gap-8 md:grid-cols-3">
            {bouquets.map((bouquet) => {
              const text = t.collections.items[bouquet.id];
              return (
                <li key={bouquet.id} className="flex flex-col overflow-hidden rounded-card bg-surface shadow-sm">
                  <div className="relative aspect-[3/4] overflow-hidden">
                    <Image src={bouquet.image} alt={text.imageAlt} placeholder="blur" sizes="(min-width: 768px) 400px, 100vw" className="size-full object-cover" />
                  </div>
                  <div className="flex flex-1 flex-col p-7">
                    <h3 className="display text-3xl text-brand-strong italic">{text.name}</h3>
                    <p className="mt-2 flex-1 leading-relaxed text-muted">{text.desc}</p>
                    <dl className="mt-6 grid grid-cols-3 gap-2 text-center">
                      {SIZES.map((size) => (
                        <div key={size} className="rounded-2xl bg-surface-2 px-2 py-3">
                          <dt className="text-xs font-bold tracking-wide text-accent uppercase">{t.collections.sizes[size]}</dt>
                          <dd className="mt-1 text-sm font-bold tabular-nums">{formatVnd(locale, bouquet.prices[size])}</dd>
                        </div>
                      ))}
                    </dl>
                    <a href={business.zaloHref} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants(), 'mt-6 rounded-button')}>
                      {t.collections.order}
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mx-auto mt-10 max-w-2xl text-center text-muted">{t.collections.custom}</p>
        </Container>
      </section>

      {/* Occasions. */}
      <section id="occasions" aria-labelledby="occasions-title" className="py-16 sm:py-24">
        <Container>
          <div id="occasions-title">
            <SectionHeading eyebrow={t.occasions.eyebrow} title={t.occasions.title} intro={t.occasions.intro} />
          </div>
          <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {t.occasions.items.map((item, index) => {
              const Icon = OCCASION_ICONS[index];
              return (
                <li key={item.title} className="flex gap-4 rounded-card border border-border bg-surface p-6">
                  <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                    <Icon aria-hidden className="size-6" />
                  </span>
                  <div>
                    <h3 className="display text-xl text-brand-strong">{item.title}</h3>
                    <p className="mt-1 leading-relaxed text-muted">{item.text}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </Container>
      </section>

      {/* Delivery: cut-off time, fees by area, how it works. */}
      <section id="delivery" aria-labelledby="delivery-title" className="bg-deep py-16 text-deep-fg sm:py-24">
        <Container className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <div id="delivery-title">
              <SectionHeading eyebrow={t.delivery.eyebrow} title={t.delivery.title} intro={format(t.delivery.intro, { time: cutoff })} align="left" tone="light" />
            </div>
            <ul className="mt-8 space-y-3">
              {t.delivery.notes.map((note) => (
                <li key={note} className="flex gap-3">
                  <Check aria-hidden className="mt-0.5 size-5 shrink-0 text-accent" />
                  {note}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-card bg-deep-fg/5 p-7 sm:p-9">
            <h3 className="display text-2xl">{t.delivery.zonesTitle}</h3>
            <dl className="mt-6 divide-y divide-deep-fg/15">
              {zones.map((zone) => (
                <div key={zone.id} className="flex items-center justify-between gap-6 py-4">
                  <dt>
                    <span className="block font-bold">{t.delivery.zones[zone.id].name}</span>
                    <span className="text-sm text-deep-fg/70">{t.delivery.zones[zone.id].areas}</span>
                  </dt>
                  <dd className="display shrink-0 text-xl text-accent tabular-nums">{zone.fee === null ? t.delivery.free : formatVnd(locale, zone.fee)}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Container>
      </section>

      {/* Flower care: a photo and four habits. */}
      <section id="care" aria-labelledby="care-title" className="py-16 sm:py-24">
        <Container className="grid items-center gap-12 lg:grid-cols-2">
          <div className="relative aspect-[4/3] overflow-hidden rounded-card">
            <Image src={care} alt={t.care.imageAlt} placeholder="blur" sizes="(min-width: 1024px) 600px, 100vw" className="size-full object-cover" />
          </div>
          <div>
            <div id="care-title">
              <SectionHeading eyebrow={t.care.eyebrow} title={t.care.title} intro={t.care.intro} align="left" />
            </div>
            <ol className="mt-8 grid gap-5 sm:grid-cols-2">
              {t.care.tips.map((tip, index) => (
                <li key={tip.title}>
                  <span className="display text-3xl text-accent italic">0{index + 1}</span>
                  <h3 className="mt-1 font-bold">{tip.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{tip.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </Container>
      </section>

      <LatestArticles articles={latest} website={site.website} locale={locale} t={t} />

      <Faq items={t.questions.items} website={site.website} t={t} />

      <ContactSection website={site.website} t={t} locale={locale} eyebrow={t.visit.eyebrow} title={t.visit.title} text={t.visit.text} note={t.visit.note} />
    </>
  );
}
