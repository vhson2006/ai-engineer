import Image from 'next/image';
import { Bed, Bike, Coffee, MapPin, Maximize2, Plane, Shirt, Users, Waves, Wifi } from 'lucide-react';
import { format } from '@web/core/i18n/format';
import { LatestArticles } from '@web/site-kit/components/articles';
import { ContactSection } from '@web/site-kit/components/contact';
import { Faq } from '@web/site-kit/components/faq';
import { SectionHeading } from '@web/site-kit/components/section';
import { formatTime, formatVnd } from '@web/site-kit/format';
import { Container, buttonVariants, cn } from '@web/ui';
import { JsonLd } from '@web/ui/json-ld';
import { CHECK_IN, CHECK_OUT } from '@/content/business';
import { nearby, rooms } from '@/content/rooms';
import { site } from '@/site';
import courtyard from '../../../public/images/courtyard.jpg';
import hero from '../../../public/images/hero.jpg';
import oldTown from '../../../public/images/old-town.jpg';
import pool from '../../../public/images/pool.jpg';

const AMENITY_ICONS = [Waves, Coffee, Bike, Plane, Wifi, Shirt];

/** The landing page: hero, rooms, amenities, location, policies, articles, FAQ, contact. */
export default async function HomePage() {
  const [t, locale] = await Promise.all([site.getMessages(), site.getLocale()]);
  const latest = await site.latestArticles(locale);
  const { business } = site;

  return (
    <>
      <JsonLd data={site.structuredData(t, locale)} />

      {/* Hero: the courtyard at dusk, centred words. */}
      <section id="top" aria-labelledby="hero-title" className="relative isolate scroll-mt-[100vh] overflow-hidden text-white">
        <Image src={hero} alt={t.hero.imageAlt} priority placeholder="blur" sizes="100vw" className="absolute inset-0 -z-10 size-full object-cover" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-[#1a2238]/70 via-[#1a2238]/35 to-[#1a2238]/80" />
        <Container className="flex min-h-[min(85vh,900px)] flex-col items-center justify-center py-24 text-center">
          <p className="ornament text-xs font-semibold tracking-[0.35em] uppercase">{t.hero.eyebrow}</p>
          <h1 id="hero-title" className="display mt-6 max-w-4xl text-6xl leading-[1] text-balance sm:text-7xl lg:text-8xl">
            {t.hero.title}
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-relaxed text-white/90">{t.hero.text}</p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <a href={business.zaloHref} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ size: 'lg' }), 'rounded-button bg-accent px-8 text-accent-fg hover:bg-accent/90')}>
              {t.hero.book}
            </a>
            <a href="#rooms" className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }), 'rounded-button border-white/50 bg-transparent px-8 text-white hover:bg-white/10')}>
              {t.hero.viewRooms}
            </a>
          </div>
        </Container>
      </section>

      {/* Rooms. */}
      <section id="rooms" aria-labelledby="rooms-title" className="py-16 sm:py-24">
        <Container>
          <div id="rooms-title">
            <SectionHeading eyebrow={t.rooms.eyebrow} title={t.rooms.title} intro={t.rooms.intro} />
          </div>
          <ul className="mt-14 grid gap-8 lg:grid-cols-3">
            {rooms.map((room) => {
              const text = t.rooms.items[room.id];
              return (
                <li key={room.id}>
                  <article className="flex h-full flex-col overflow-hidden rounded-card border border-border bg-surface">
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <Image src={room.image} alt={text.imageAlt} placeholder="blur" sizes="(min-width: 1024px) 400px, 100vw" className="size-full object-cover" />
                    </div>
                    <div className="flex flex-1 flex-col p-7">
                      <h3 className="display text-3xl text-brand-strong">{text.name}</h3>
                      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted">
                        <li className="inline-flex items-center gap-1.5">
                          <Maximize2 aria-hidden className="size-4 text-accent" />
                          {format(t.rooms.size, { size: room.size })}
                        </li>
                        <li className="inline-flex items-center gap-1.5">
                          <Users aria-hidden className="size-4 text-accent" />
                          {format(t.rooms.guests, { count: room.guests })}
                        </li>
                        <li className="inline-flex items-center gap-1.5">
                          <Bed aria-hidden className="size-4 text-accent" />
                          {text.bed}
                        </li>
                      </ul>
                      <ul className="mt-5 flex-1 space-y-2 border-t border-border pt-5">
                        {text.features.map((feature) => (
                          <li key={feature} className="flex gap-2.5 text-sm">
                            <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-7 flex items-end justify-between gap-4">
                        <p>
                          <span className="display text-3xl text-brand-strong tabular-nums">{formatVnd(locale, room.price)}</span>
                          <span className="ml-1.5 text-sm text-muted">{t.rooms.perNight}</span>
                          <span className="mt-1 block text-xs font-semibold tracking-wide text-accent uppercase">{t.rooms.breakfast}</span>
                        </p>
                      </div>
                      <a href={business.zaloHref} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants(), 'mt-6 rounded-button')}>
                        {t.rooms.book}
                      </a>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        </Container>
      </section>

      {/* Amenities: two photos and six things. */}
      <section id="amenities" aria-labelledby="amenities-title" className="bg-surface-2 py-16 sm:py-24">
        <Container className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div className="grid grid-cols-2 gap-4">
            <div className="relative col-span-2 aspect-[16/9] overflow-hidden rounded-card">
              <Image src={pool} alt={t.amenities.poolAlt} placeholder="blur" sizes="(min-width: 1024px) 560px, 100vw" className="size-full object-cover" />
            </div>
            <div className="relative col-span-2 aspect-[16/9] overflow-hidden rounded-card sm:col-span-1 sm:aspect-square">
              <Image src={courtyard} alt={t.amenities.courtyardAlt} placeholder="blur" sizes="(min-width: 1024px) 280px, 100vw" className="size-full object-cover" />
            </div>
            <div className="hidden items-center justify-center rounded-card bg-deep p-6 text-center text-deep-fg sm:flex">
              <p className="display text-3xl leading-tight text-accent">{t.footer.tagline}</p>
            </div>
          </div>
          <div>
            <div id="amenities-title">
              <SectionHeading eyebrow={t.amenities.eyebrow} title={t.amenities.title} intro={t.amenities.intro} align="left" />
            </div>
            <ul className="mt-8 grid gap-6 sm:grid-cols-2">
              {t.amenities.items.map((item, index) => {
                const Icon = AMENITY_ICONS[index];
                return (
                  <li key={item.title} className="flex gap-4">
                    <Icon aria-hidden className="mt-0.5 size-6 shrink-0 text-accent" />
                    <div>
                      <h3 className="font-bold">{item.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted">{item.text}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </Container>
      </section>

      {/* Location: the old town at night and what is near. */}
      <section id="location" aria-labelledby="location-title" className="py-16 sm:py-24">
        <Container className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <div id="location-title">
              <SectionHeading eyebrow={t.location.eyebrow} title={t.location.title} intro={t.location.intro} align="left" />
            </div>
            <dl className="mt-8 divide-y divide-border border-y border-border">
              {nearby.map((place) => (
                <div key={place.id} className="flex items-center justify-between gap-6 py-3.5">
                  <dt className="inline-flex items-center gap-2.5 font-semibold">
                    <MapPin aria-hidden className="size-4 text-accent" />
                    {t.location.places[place.id]}
                  </dt>
                  <dd className="shrink-0 text-sm text-muted">{format(t.location.modes[place.mode], { minutes: place.minutes })}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-card">
            <Image src={oldTown} alt={t.location.imageAlt} placeholder="blur" sizes="(min-width: 1024px) 600px, 100vw" className="size-full object-cover" />
          </div>
        </Container>
      </section>

      {/* Policies: check-in / check-out and four things to know. */}
      <section id="policies" aria-labelledby="policies-title" className="bg-deep py-16 text-deep-fg sm:py-24">
        <Container>
          <div id="policies-title">
            <SectionHeading eyebrow={t.policies.eyebrow} title={t.policies.title} tone="light" />
          </div>
          <dl className="mx-auto mt-12 grid max-w-xl grid-cols-2 gap-px overflow-hidden rounded-card bg-deep-fg/15 text-center">
            <div className="bg-deep p-6">
              <dt className="text-xs font-semibold tracking-[0.3em] text-accent uppercase">{t.policies.checkInLabel}</dt>
              <dd className="display mt-2 text-3xl">{format(t.policies.from, { time: formatTime(locale, CHECK_IN) })}</dd>
            </div>
            <div className="bg-deep p-6">
              <dt className="text-xs font-semibold tracking-[0.3em] text-accent uppercase">{t.policies.checkOutLabel}</dt>
              <dd className="display mt-2 text-3xl">{format(t.policies.until, { time: formatTime(locale, CHECK_OUT) })}</dd>
            </div>
          </dl>
          <ul className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {t.policies.items.map((item) => (
              <li key={item.title} className="border-t border-accent/50 pt-5">
                <h3 className="display text-xl text-accent">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-deep-fg/80">{item.text}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <LatestArticles articles={latest} website={site.website} locale={locale} t={t} />

      <Faq items={t.questions.items} website={site.website} t={t} />

      <ContactSection website={site.website} t={t} locale={locale} eyebrow={t.visit.eyebrow} title={t.visit.title} text={t.visit.text} note={t.visit.note} />
    </>
  );
}
