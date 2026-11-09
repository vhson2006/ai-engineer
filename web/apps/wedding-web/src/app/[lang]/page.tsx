import Image from 'next/image';
import { CalendarPlus, ChevronDown, Clock, Heart, MapPin, Navigation, Wine } from 'lucide-react';
import { format } from '@web/core/i18n/format';
import { Container, buttonVariants, cn } from '@web/ui';
import { Reveal } from '@web/ui/reveal';
import { Monogram } from '@/components/monogram';
import { album, couple, events, mainEvent, photos, schedule, story, type WeddingEvent } from '@/content/wedding';
import { Countdown } from '@/features/countdown/countdown';
import { Gallery } from '@/features/gallery/gallery';
import type { Locale } from '@/i18n/locales';
import { getLocale, getMessages, type Messages } from '@/i18n/messages';
import { googleCalendarUrl, longDate, lunarDate, shortDate, time } from '@/lib/dates';

type Ctx = { t: Messages; locale: Locale };

/** The invitation: one page, prerendered per language. Data: src/content/wedding.ts. */
export default async function WeddingPage() {
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  const ctx: Ctx = { t, locale };
  return (
    <>
      <Hero {...ctx} />
      <Reveal>
        <Invitation {...ctx} />
      </Reveal>
      <Reveal>
        <Couple {...ctx} />
      </Reveal>
      <Reveal>
        <Story {...ctx} />
      </Reveal>
      <Reveal>
        <Events {...ctx} />
      </Reveal>
      <Reveal>
        <Album {...ctx} />
      </Reveal>
      <Reveal>
        <Closing {...ctx} />
      </Reveal>
    </>
  );
}

/* ─────────────────────────────── Ornaments ─────────────────────────────── */

function Flourish({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 20" aria-hidden className={cn('h-4 w-40 text-gold-light', className)}>
      <path d="M2 10h70M128 10h70" stroke="currentColor" strokeWidth="1" />
      <path d="M100 3c-6 0-9 4-9 7s3 7 9 7 9-4 9-7-3-7-9-7Z" fill="none" stroke="currentColor" strokeWidth="1" />
      <path d="M80 10c4-5 8-5 11 0M109 10c3 5 7 5 11 0" fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function Heading({ eyebrow, title, intro, tone = 'dark' }: { eyebrow: string; title: string; intro?: string; tone?: 'dark' | 'light' }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className={cn('font-script text-3xl', tone === 'light' ? 'text-gold-light' : 'text-brand-strong')}>{eyebrow}</p>
      <h2 className={cn('mt-1 font-display text-4xl font-semibold tracking-tight text-balance sm:text-5xl', tone === 'light' ? 'text-white' : 'text-fg')}>{title}</h2>
      <Flourish className="mx-auto mt-4" />
      {intro && <p className={cn('mt-4 text-lg leading-relaxed text-pretty', tone === 'light' ? 'text-white/80' : 'text-muted')}>{intro}</p>}
    </div>
  );
}

/* ─────────────────────────────── Hero ─────────────────────────────── */

function Hero({ t }: Ctx) {
  return (
    <section className="relative isolate flex min-h-[calc(100dvh-4.5rem)] items-center overflow-hidden bg-deep text-white">
      <Image
        src={photos.bouquet.image}
        alt={t.photos.bouquet}
        priority
        placeholder="blur"
        sizes="100vw"
        className="absolute inset-0 -z-20 size-full object-cover object-[50%_35%]"
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-deep/55 via-deep/45 to-deep/85" />
      <Container className="py-20 text-center">
        <p className="text-sm font-medium tracking-[0.45em] text-white/85 uppercase">{t.hero.saveTheDate}</p>
        <h1 className="mt-6">
          <span className="text-foil block font-script text-6xl leading-[1.15] sm:text-8xl">{couple.groom.short}</span>
          <span className="block font-script text-4xl text-gold-light sm:text-5xl">&amp;</span>
          <span className="text-foil block font-script text-6xl leading-[1.15] sm:text-8xl">{couple.bride.short}</span>
        </h1>
        <p className="mt-7 font-display text-2xl text-white/90 italic sm:text-3xl">{t.hero.announce}</p>
        <div className="mt-6 flex items-center justify-center gap-4">
          <span aria-hidden className="h-px w-12 bg-gold-light/70 sm:w-20" />
          <p className="font-display text-3xl font-semibold tracking-[0.2em] sm:text-4xl">{shortDate(mainEvent.start)}</p>
          <span aria-hidden className="h-px w-12 bg-gold-light/70 sm:w-20" />
        </div>
        <div className="mt-10">
          <Countdown target={mainEvent.start} end={mainEvent.end} labels={t.countdown} />
        </div>
        <a href="#invitation" className="mt-12 inline-flex flex-col items-center gap-1 text-sm tracking-[0.2em] text-white/80 uppercase hover:text-white">
          {t.hero.scroll}
          <ChevronDown aria-hidden className="scroll-cue size-5" />
        </a>
      </Container>
    </section>
  );
}

/* ─────────────────────────────── Invitation ─────────────────────────────── */

function Invitation({ t, locale }: Ctx) {
  const lunar = lunarDate(mainEvent.start);
  return (
    <section id="invitation" className="py-20 sm:py-28">
      <Container className="grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="relative mx-auto w-full max-w-sm">
          <div aria-hidden className="absolute -inset-3 rounded-t-full border border-gold-light" />
          <Image
            src={photos.corridor.image}
            alt={t.photos.corridor}
            placeholder="blur"
            sizes="(min-width: 1024px) 380px, 80vw"
            className="relative aspect-[2/3] w-full rounded-t-full object-cover shadow-2xl shadow-deep/20"
          />
        </div>

        <div className="card-frame rounded-[2rem] bg-surface px-6 py-12 text-center sm:px-12">
          <p className="font-display text-lg text-muted italic">“{t.invitation.quote}”</p>
          <Flourish className="mx-auto my-6" />
          <p className="text-sm font-medium tracking-[0.3em] text-brand-strong uppercase">{t.invitation.intro}</p>
          <p className="mt-2 font-display text-2xl font-semibold">{t.invitation.guest}</p>
          <p className="mt-2 text-muted">{t.invitation.text}</p>
          <p className="mt-6 font-script text-5xl leading-tight text-brand-strong sm:text-6xl">{couple.groom.full}</p>
          <p className="font-display text-xl text-subtle italic">{t.invitation.and}</p>
          <p className="font-script text-5xl leading-tight text-brand-strong sm:text-6xl">{couple.bride.full}</p>
          <Flourish className="mx-auto my-6" />
          <p className="font-display text-xl font-semibold">
            {format(t.invitation.on, { time: time(locale, mainEvent.start), date: longDate(locale, mainEvent.start) })}
          </p>
          <p className="mt-1 text-sm text-muted italic">
            {format(t.invitation.lunar, { day: lunar.day, month: lunar.month, yearName: lunar.yearName })}
          </p>
          <p className="mt-4 font-display text-lg text-brand-strong">{mainEvent.venue}</p>
          <p className="text-sm text-muted">{mainEvent.address}</p>
          <p className="mt-6 text-muted">{t.invitation.presence}</p>
        </div>
      </Container>
    </section>
  );
}

/* ─────────────────────────────── Couple ─────────────────────────────── */

function Couple({ t }: Ctx) {
  const people = [
    { role: t.couple.groomRole, name: couple.groom.full, text: t.couple.groomText },
    { role: t.couple.brideRole, name: couple.bride.full, text: t.couple.brideText },
  ];
  return (
    <section id="couple" className="bg-surface-2 py-20 sm:py-28">
      <Container>
        <Heading eyebrow={t.couple.eyebrow} title={t.couple.title} />
        <div className="mt-14 grid items-center gap-10 lg:grid-cols-[1fr_auto_1fr]">
          <Person {...people[0]} align="right" />
          <div className="relative mx-auto w-64 sm:w-72">
            <Image
              src={photos.stairs.image}
              alt={t.photos.stairs}
              placeholder="blur"
              sizes="300px"
              className="aspect-[3/4] w-full rounded-[999px] border-4 border-surface object-cover shadow-xl"
            />
            <span className="absolute -bottom-5 left-1/2 inline-flex size-12 -translate-x-1/2 items-center justify-center rounded-full bg-brand text-brand-fg shadow-lg">
              <Heart aria-hidden className="size-5 fill-current" />
            </span>
          </div>
          <Person {...people[1]} align="left" />
        </div>
      </Container>
    </section>
  );
}

function Person({ role, name, text, align }: { role: string; name: string; text: string; align: 'left' | 'right' }) {
  return (
    <div className={cn('text-center', align === 'right' ? 'lg:text-right' : 'lg:text-left')}>
      <p className="text-sm font-medium tracking-[0.3em] text-brand-strong uppercase">{role}</p>
      <p className="mt-2 font-script text-5xl text-fg">{name}</p>
      <p className="mx-auto mt-3 max-w-sm leading-relaxed text-muted lg:mx-0 lg:inline-block">{text}</p>
    </div>
  );
}

/* ─────────────────────────────── Story ─────────────────────────────── */

function Story({ t }: Ctx) {
  return (
    <section id="story" className="py-20 sm:py-28">
      <Container className="max-w-5xl">
        <Heading eyebrow={t.story.eyebrow} title={t.story.title} />
        <ol className="relative mt-14 space-y-12 before:absolute before:top-0 before:bottom-0 before:left-1/2 before:hidden before:w-px before:bg-gold-light md:before:block">
          {story.map((chapter, index) => {
            const text = t.story.items[chapter.id];
            const flip = index % 2 === 1;
            return (
              <li key={chapter.id} className="relative grid items-center gap-6 md:grid-cols-2 md:gap-16">
                <span aria-hidden className="absolute top-1/2 left-1/2 hidden size-4 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-gold-light bg-bg md:block" />
                <div className={cn(flip && 'md:order-2')}>
                  <Image
                    src={chapter.photo.image}
                    alt={t.photos[chapter.photo.id]}
                    placeholder="blur"
                    sizes="(min-width: 768px) 440px, 92vw"
                    className="aspect-[4/3] w-full rounded-3xl object-cover shadow-lg"
                  />
                </div>
                <div className={cn('text-center md:text-left', flip && 'md:text-right')}>
                  <p className="font-display text-sm font-semibold tracking-[0.3em] text-brand-strong">{String(index + 1).padStart(2, '0')}</p>
                  <h3 className="mt-1 font-display text-3xl font-semibold">{text.title}</h3>
                  <p className="mt-3 leading-relaxed text-muted">{text.text}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </Container>
    </section>
  );
}

/* ─────────────────────────────── Events ─────────────────────────────── */

function Events({ t, locale }: Ctx) {
  const names = { groom: couple.groom.short, bride: couple.bride.short };
  return (
    <section id="events" className="bg-surface-2 py-20 sm:py-28">
      <Container>
        <Heading eyebrow={t.events.eyebrow} title={t.events.title} intro={t.events.intro} />
        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          {events.map((event) => (
            <EventCard key={event.id} event={event} t={t} locale={locale} names={names} />
          ))}
        </div>

        <div className="mx-auto mt-14 max-w-3xl rounded-[2rem] bg-deep px-6 py-10 text-white sm:px-10">
          <h3 className="text-center font-display text-3xl font-semibold text-gold-light">{t.schedule.title}</h3>
          <ol className="mt-8 grid gap-6 sm:grid-cols-4">
            {schedule.map((item) => (
              <li key={item.id} className="text-center">
                <p className="font-display text-3xl font-semibold tabular-nums">{item.time}</p>
                <span aria-hidden className="mx-auto my-3 block size-2 rotate-45 bg-gold-light" />
                <p className="text-sm text-white/80">{t.schedule.items[item.id]}</p>
              </li>
            ))}
          </ol>
        </div>
      </Container>
    </section>
  );
}

function EventCard({ event, t, locale, names }: { event: WeddingEvent; t: Messages; locale: Locale; names: { groom: string; bride: string } }) {
  const text = t.events.items[event.id];
  const calendar = googleCalendarUrl({
    title: `${text.name} · ${format(t.events.calendarTitle, names)}`,
    start: event.start,
    end: event.end,
    location: `${event.venue}, ${event.address}`,
    details: format(t.events.calendarDetails, names),
  });
  const Icon = event.id === 'ceremony' ? Heart : Wine;
  const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.mapsQuery)}`;
  const secondary = cn(buttonVariants({ variant: 'secondary' }), 'rounded-full');

  return (
    <article className="card-frame flex flex-col rounded-[2rem] bg-surface p-8 text-center sm:p-10">
      <span className="mx-auto inline-flex size-14 items-center justify-center rounded-full bg-brand-soft text-brand-strong">
        <Icon aria-hidden className="size-6" />
      </span>
      <h3 className="mt-4 font-display text-3xl font-semibold">{text.name}</h3>
      <p className="mt-1 text-muted">{text.text}</p>
      <Flourish className="mx-auto my-5" />
      <p className="font-display text-xl font-semibold capitalize">{longDate(locale, event.start)}</p>
      <p className="mt-1 inline-flex items-center justify-center gap-2 text-brand-strong">
        <Clock aria-hidden className="size-4" />
        {format(t.events.time, { start: time(locale, event.start), end: time(locale, event.end) })}
      </p>
      <p className="mt-4 font-display text-xl text-fg">{event.venue}</p>
      <p className="mt-1 inline-flex items-start justify-center gap-2 text-sm text-muted">
        <MapPin aria-hidden className="mt-0.5 size-4 shrink-0" />
        {event.address}
      </p>
      <div className="mt-auto flex flex-wrap justify-center gap-2 pt-8">
        <a href={maps} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants(), 'rounded-full')}>
          <Navigation aria-hidden />
          {t.common.directions}
        </a>
        <a href={calendar} target="_blank" rel="noopener noreferrer" className={secondary} aria-label={`${t.common.addToCalendar}: ${t.common.googleCalendar}`}>
          <CalendarPlus aria-hidden />
          {t.common.googleCalendar}
        </a>
        <a href={`/calendar.ics?lang=${locale}`} download className={secondary} aria-label={`${t.common.addToCalendar}: ${t.common.icsCalendar}`}>
          <CalendarPlus aria-hidden />
          {t.common.icsCalendar}
        </a>
      </div>
    </article>
  );
}

/* ─────────────────────────────── Album ─────────────────────────────── */

function Album({ t }: Ctx) {
  return (
    <section id="album" className="py-20 sm:py-28">
      <Container>
        <Heading eyebrow={t.album.eyebrow} title={t.album.title} intro={t.album.intro} />
        <div className="mt-12">
          <Gallery
            photos={album.map((photo) => ({ id: photo.id, image: photo.image, alt: t.photos[photo.id] }))}
            labels={{ viewPhoto: t.common.viewPhoto, photoCount: t.common.photoCount, previous: t.common.previous, next: t.common.next, close: t.common.close }}
          />
        </div>
      </Container>
    </section>
  );
}

/* ─────────────────────────────── Closing ─────────────────────────────── */

function Closing({ t }: Ctx) {
  return (
    <section className="relative isolate overflow-hidden bg-deep py-28 text-center text-white sm:py-36">
      <Image src={photos.window.image} alt="" placeholder="blur" sizes="100vw" className="absolute inset-0 -z-20 size-full object-cover object-top opacity-50" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-deep/70 to-deep/90" />
      <Container className="max-w-2xl">
        <Monogram tone="light" className="size-16 text-3xl" />
        <p className="mt-6 font-display text-3xl leading-snug italic sm:text-4xl">{t.closing.quote}</p>
        <Flourish className="mx-auto my-8" />
        <p className="text-lg text-white/85">{t.closing.thanks}</p>
        <p className="mt-6 font-display text-lg text-white/70 italic">{t.closing.signature}</p>
        <p className="text-foil font-script text-5xl leading-tight sm:text-6xl">
          {couple.groom.short} &amp; {couple.bride.short}
        </p>
      </Container>
    </section>
  );
}
