import Image from 'next/image';
import {
  Baby,
  BookOpen,
  Check,
  ChevronDown,
  Clock,
  Crown,
  Droplets,
  Footprints,
  Gem,
  Globe,
  Hand,
  HeartHandshake,
  Leaf,
  type LucideIcon,
  MapPin,
  Navigation,
  Phone,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { format } from '@web/core/i18n/format';
import { Container, buttonVariants, cn } from '@web/ui';
import { Reveal } from '@web/ui/reveal';
import { Monogram } from '@/components/logo';
import { NailArt } from '@/components/nail-art';
import { Eyebrow, SectionHeading } from '@/components/section-heading';
import {
  manicures,
  menuTables,
  menuTabs,
  nailCut,
  pedicureAddOns,
  pedicures,
  salon,
  services,
  styles,
  type Price,
  type ServiceIcon,
  type TableId,
} from '@/content/salon';
import { MenuTabs, type MenuTab } from '@/features/menu/menu-tabs';
import type { Locale } from '@/i18n/locales';
import { getLocale, getMessages, type Messages } from '@/i18n/messages';
import { formatHours, formatPrice } from '@/lib/format';
import leavesDark from '../../../public/images/leaves-dark.jpg';
import nailsBlueFlower from '../../../public/images/nails-blue-flower.jpg';
import nailsGreyGold from '../../../public/images/nails-grey-gold.jpg';
import spaBowls from '../../../public/images/spa-bowls.jpg';
import spaCandle from '../../../public/images/spa-candle.jpg';

const SERVICE_ICONS: Record<ServiceIcon, LucideIcon> = {
  gem: Gem,
  droplets: Droplets,
  hand: Hand,
  footprints: Footprints,
  sparkles: Sparkles,
  baby: Baby,
};

const PROMISE_ICONS: Record<keyof Messages['promise']['items'], LucideIcon> = {
  clean: ShieldCheck,
  products: Gem,
  staff: HeartHandshake,
  relax: Leaf,
};

const pill = (variant: 'primary' | 'secondary' = 'primary') => cn(buttonVariants({ variant, size: 'lg' }), 'rounded-full px-7');
const goldPill = cn(
  buttonVariants({ size: 'lg' }),
  'rounded-full bg-gradient-to-r from-[#c99a35] via-[#e9c86a] to-[#b8892c] px-7 text-deep shadow-lg shadow-black/20 hover:brightness-105',
);

type Ctx = { t: Messages; locale: Locale; price: (value: Price) => string };

/** One landing page, prerendered per language. Facts and prices: src/content/salon.ts. */
export default async function HomePage() {
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  const ctx: Ctx = { t, locale, price: (value) => formatPrice(locale, value) };
  return (
    <>
      <Hero {...ctx} />
      <PromiseStrip {...ctx} />
      <Reveal>
        <Services {...ctx} />
      </Reveal>
      <Reveal>
        <Pedicures {...ctx} />
      </Reveal>
      <Reveal>
        <Manicures {...ctx} />
      </Reveal>
      <Reveal>
        <Menu {...ctx} />
      </Reveal>
      <Reveal>
        <Styles {...ctx} />
      </Reveal>
      <Reveal>
        <GiftCertificates {...ctx} />
      </Reveal>
      <Reveal>
        <Policy {...ctx} />
      </Reveal>
      <Reveal>
        <Visit {...ctx} />
      </Reveal>
    </>
  );
}

/* ─────────────────────────────── Hero ─────────────────────────────── */

function Hero({ t, locale }: Ctx) {
  const phone = salon.phones[0];
  return (
    <section className="relative isolate overflow-hidden bg-deep text-white">
      <Image src={leavesDark} alt="" priority placeholder="blur" sizes="100vw" className="absolute inset-0 -z-20 size-full object-cover" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-deep via-deep/90 to-deep/50" />
      <Container className="grid gap-14 py-16 sm:py-24 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:py-28">
        <div>
          <Eyebrow tone="light" align="left">
            {t.hero.eyebrow}
          </Eyebrow>
          <h1 className="mt-6 font-display text-5xl leading-[1.02] font-semibold tracking-tight text-balance sm:text-6xl lg:text-7xl">
            {t.hero.title}
            <span className="text-gold-foil block italic">{t.hero.titleAccent}</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-pretty text-white/80">{t.hero.text}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <a href={phone.href} className={goldPill}>
              <Phone aria-hidden />
              {format(t.common.call, { phone: phone.display })}
            </a>
            <a
              href="#menu"
              className={cn(pill('secondary'), 'border-white/30 bg-white/5 text-white backdrop-blur hover:bg-white/15')}
            >
              <BookOpen aria-hidden />
              {t.common.viewMenu}
            </a>
          </div>
          <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/75">
            <li className="inline-flex items-center gap-2">
              <Check aria-hidden className="size-4 text-gold-light" />
              {t.topBar.welcome}
            </li>
            <li className="inline-flex items-center gap-2">
              <Check aria-hidden className="size-4 text-gold-light" />
              {t.topBar.gift}
            </li>
          </ul>
        </div>

        <div className="relative mx-auto w-full max-w-md pb-10 lg:pb-0">
          {/* Arched frame echoing the oval monogram */}
          <div className="relative mx-auto w-[68%] rounded-t-full border border-gold/70 p-2.5">
            <div className="relative aspect-[262/430] overflow-hidden rounded-t-full">
              <Image src={nailsBlueFlower} alt={t.hero.photoAlt} priority placeholder="blur" sizes="(min-width: 1024px) 300px, 60vw" className="size-full object-cover" />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 size-36 overflow-hidden rounded-full border-4 border-deep shadow-2xl ring-1 ring-gold/70 sm:size-44">
            <Image src={nailsGreyGold} alt={t.hero.photoAlt2} placeholder="blur" sizes="176px" className="size-full object-cover" />
          </div>
          <div className="absolute right-0 bottom-6 w-64 rounded-2xl border border-white/15 bg-deep/80 p-4 text-sm shadow-2xl backdrop-blur-md">
            <p className="flex items-center gap-2 font-display text-lg font-semibold text-gold-light">
              <Clock aria-hidden className="size-4" />
              {t.hero.hoursTitle}
            </p>
            <dl className="mt-2 space-y-1 text-xs text-white/80">
              {salon.hours.map((row) => (
                <div key={row.id} className="flex justify-between gap-3">
                  <dt className="whitespace-nowrap">{t.visit.days[row.id]}</dt>
                  <dd className="whitespace-nowrap tabular-nums">{formatHours(locale, row.open, row.close)}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </Container>
    </section>
  );
}

/* ─────────────────────────────── Promise ─────────────────────────────── */

function PromiseStrip({ t }: Ctx) {
  const items = Object.entries(t.promise.items) as [keyof Messages['promise']['items'], { title: string; text: string }][];
  return (
    <div className="bg-sage">
      <Container>
        <ul aria-label={t.promise.label} className="grid gap-px sm:grid-cols-2 lg:grid-cols-4">
          {items.map(([id, item]) => {
            const Icon = PROMISE_ICONS[id];
            return (
              <li key={id} className="flex gap-4 px-2 py-8 sm:px-6">
                <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-surface text-gold shadow-sm ring-1 ring-gold/30">
                  <Icon aria-hidden className="size-5" />
                </span>
                <div>
                  <h2 className="font-display text-xl font-semibold text-brand-strong">{item.title}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{item.text}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </Container>
    </div>
  );
}

/* ─────────────────────────────── Services ─────────────────────────────── */

function Services({ t, price }: Ctx) {
  return (
    <section id="services" className="py-20 sm:py-28">
      <Container>
        <SectionHeading eyebrow={t.services.eyebrow} title={t.services.title} intro={t.services.intro} />
        <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => {
            const Icon = SERVICE_ICONS[service.icon];
            const text = t.services.items[service.id];
            return (
              <li
                key={service.id}
                className="group relative flex flex-col rounded-[1.75rem] border border-border bg-surface p-7 transition duration-300 hover:-translate-y-1 hover:border-gold/50 hover:shadow-xl hover:shadow-brand/10"
              >
                <span className="inline-flex size-14 items-center justify-center rounded-full bg-gold-soft text-gold transition-colors group-hover:bg-brand group-hover:text-gold-light">
                  <Icon aria-hidden className="size-6" />
                </span>
                <h3 className="mt-6 font-display text-3xl font-semibold text-brand-strong">{text.name}</h3>
                <p className="mt-2 flex-1 leading-relaxed text-muted">{text.text}</p>
                <div className="mt-6 flex items-center justify-between border-t border-border pt-5">
                  <span className="font-display text-xl font-semibold text-brand-strong">
                    {format(t.common.from, { price: price(service.from) })}
                  </span>
                  <a href="#menu" className="text-sm font-semibold text-gold underline-offset-4 hover:underline">
                    {t.services.seePrices}
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}

/* ─────────────────────────────── Pedicures ─────────────────────────────── */

function Pedicures({ t, price }: Ctx) {
  return (
    <section id="pedicures" className="bg-surface-2 py-20 sm:py-28">
      <Container>
        <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <SectionHeading align="left" eyebrow={t.pedicure.eyebrow} title={t.pedicure.title} intro={t.pedicure.intro} />
          <div className="relative overflow-hidden rounded-[2rem] shadow-xl shadow-brand/10">
            <Image src={spaBowls} alt={t.pedicure.imageAlt} placeholder="blur" sizes="(min-width: 1024px) 600px, 100vw" className="h-56 w-full object-cover sm:h-64" />
          </div>
        </div>

        <ol className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {pedicures.map((pedicure, index) => {
            const text = t.pedicure.items[pedicure.id];
            const featured = pedicure.featured;
            return (
              <li
                key={pedicure.id}
                className={cn(
                  'relative flex flex-col rounded-[1.75rem] border p-7',
                  featured
                    ? 'overflow-hidden border-gold/60 bg-deep text-white md:col-span-2 lg:col-span-3 lg:grid lg:grid-cols-[1fr_1.3fr] lg:gap-10 lg:p-10'
                    : 'border-border bg-surface',
                )}
              >
                {featured && (
                  <Image src={leavesDark} alt="" placeholder="blur" sizes="100vw" className="absolute inset-0 -z-0 size-full object-cover opacity-25" />
                )}
                <div className="relative">
                  <div className="flex items-start justify-between gap-4">
                    <span className={cn('font-display text-sm font-semibold tracking-[0.2em]', featured ? 'text-gold-light' : 'text-gold')}>
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    {featured && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-light/15 px-3 py-1 text-xs font-semibold text-gold-light ring-1 ring-gold-light/40">
                        <Crown aria-hidden className="size-3.5" />
                        {t.pedicure.featured}
                      </span>
                    )}
                  </div>
                  <h3 className={cn('mt-3 font-display font-semibold', featured ? 'text-gold-foil text-4xl' : 'text-2xl text-brand-strong')}>
                    {text.name}
                  </h3>
                  <p className={cn('mt-2 leading-relaxed', featured ? 'text-white/80' : 'text-muted')}>{text.text}</p>
                  <p className={cn('mt-5 font-display text-4xl font-semibold', featured ? 'text-gold-light' : 'text-brand-strong')}>
                    {price(pedicure.price)}
                  </p>
                </div>
                <details open={featured} className="group relative mt-5 lg:mt-0">
                  <summary
                    className={cn(
                      'flex cursor-pointer list-none items-center justify-between gap-2 border-t pt-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-gold',
                      featured ? 'border-white/15 text-gold-light lg:border-t-0 lg:pt-0' : 'border-border text-brand-strong',
                    )}
                  >
                    {t.pedicure.includes}
                    <ChevronDown aria-hidden className="size-4 transition-transform group-open:rotate-180" />
                  </summary>
                  <ul className={cn('mt-3 grid gap-x-6 gap-y-1.5 text-sm', featured ? 'text-white/85 sm:grid-cols-2' : 'text-muted')}>
                    {text.includes.map((item) => (
                      <li key={item} className="flex gap-2">
                        <Check aria-hidden className={cn('mt-0.5 size-4 shrink-0', featured ? 'text-gold-light' : 'text-gold')} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </details>
              </li>
            );
          })}
        </ol>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm">
          <span className="font-semibold text-brand-strong">{t.pedicure.addOnsTitle}</span>
          {pedicureAddOns.map((addOn) => (
            <span key={addOn.id} className="inline-flex items-center gap-2 rounded-full bg-surface px-4 py-2 ring-1 ring-border">
              {t.pedicure.addOns[addOn.id]}
              <span className="font-display text-base font-semibold text-gold">+{price(addOn.price)}</span>
            </span>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* ─────────────────────────────── Manicures ─────────────────────────────── */

function Manicures({ t, price }: Ctx) {
  return (
    <section className="py-20 sm:py-28">
      <Container>
        <SectionHeading eyebrow={t.manicure.eyebrow} title={t.manicure.title} />
        <ul className="mt-14 grid gap-5 lg:grid-cols-3">
          {manicures.map((manicure) => {
            const text = t.manicure.items[manicure.id];
            return (
              <li key={manicure.id} className="flex flex-col rounded-[1.75rem] border border-border bg-surface p-7">
                <h3 className="font-display text-3xl font-semibold text-brand-strong">{text.name}</h3>
                <p className="mt-1 text-muted">{text.text}</p>
                <div className="mt-6 grid grid-cols-2 overflow-hidden rounded-2xl border border-border text-center">
                  <PriceCell label={t.manicure.regular} value={price(manicure.regular)} />
                  <PriceCell label={t.manicure.gel} value={price(manicure.gel)} highlight />
                </div>
                <ul className="mt-6 space-y-2 text-sm text-muted">
                  {text.includes.map((item) => (
                    <li key={item} className="flex gap-2">
                      <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-gold" />
                      {item}
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
        <p className="mt-8 text-center text-muted">
          {t.manicure.nailCut} · <span className="font-display text-lg font-semibold text-brand-strong">{price(nailCut)}</span>
        </p>
      </Container>
    </section>
  );
}

function PriceCell({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn('px-4 py-4', highlight ? 'bg-brand text-brand-fg' : 'bg-surface-2')}>
      <p className={cn('text-xs font-semibold tracking-[0.18em] uppercase', highlight ? 'text-gold-light' : 'text-gold')}>{label}</p>
      <p className="mt-1 font-display text-3xl font-semibold">{value}</p>
    </div>
  );
}

/* ─────────────────────────────── Full menu ─────────────────────────────── */

function Menu({ t, price }: Ctx) {
  const notes = t.menu.notes as Partial<Record<string, string>>;
  const tabs: MenuTab[] = menuTabs.map((tab) => ({
    id: tab.id,
    name: t.menu.tabs[tab.id],
    note: notes[tab.id],
    tables: tab.tables.map((tableId: TableId) => {
      const text = t.menu.tables[tableId];
      const items = text.items as Record<string, string>;
      const rows = menuTables[tableId] as { id: string; prices: (Price | null)[] }[];
      return {
        id: tableId,
        title: text.title,
        columns: text.columns,
        rows: rows.map((row) => ({
          id: row.id,
          name: items[row.id],
          prices: row.prices.map((value) => (value ? price(value) : null)),
        })),
      };
    }),
  }));
  return (
    <section id="menu" className="relative bg-surface-2 py-20 sm:py-28">
      <Container className="max-w-5xl">
        <SectionHeading eyebrow={t.menu.eyebrow} title={t.menu.title} intro={t.menu.intro} />
        <div className="mt-12">
          <MenuTabs tabs={tabs} labels={{ tabs: t.menu.tabsLabel, service: t.menu.service, notOffered: t.menu.notOffered }} />
        </div>
      </Container>
    </section>
  );
}

/* ─────────────────────────────── Nail styles ─────────────────────────────── */

function Styles({ t, price }: Ctx) {
  return (
    <section id="styles" className="py-20 sm:py-28">
      <Container>
        <SectionHeading eyebrow={t.styles.eyebrow} title={t.styles.title} intro={t.styles.intro} />
        <div className="mt-14 grid gap-5 lg:grid-cols-[1fr_1.6fr]">
          <div className="grid grid-cols-2 gap-5">
            {[
              { src: nailsBlueFlower, alt: t.hero.photoAlt },
              { src: nailsGreyGold, alt: t.hero.photoAlt2 },
            ].map((photo, index) => (
              <figure key={index} className={cn('overflow-hidden rounded-t-full rounded-b-[1.75rem] border border-gold/40 p-1.5', index === 1 && 'mt-10')}>
                <Image src={photo.src} alt={photo.alt} placeholder="blur" sizes="(min-width: 1024px) 220px, 45vw" className="aspect-[3/5] w-full rounded-t-full rounded-b-3xl object-cover" />
              </figure>
            ))}
          </div>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {styles.map((style) => (
              <li key={style.id} style={{ backgroundColor: style.backdrop }} className="flex flex-col rounded-[1.5rem] p-4 ring-1 ring-black/5">
                <NailArt id={`style-${style.id}`} pattern={style.pattern} base={style.base} accent={style.accent} className="w-full text-[#17261c]" />
                <div className="mt-3 flex items-end justify-between gap-2 text-[#17261c]">
                  <span className="text-sm font-semibold">{t.styles.items[style.id]}</span>
                  <span className="font-display text-lg font-semibold whitespace-nowrap text-[#22502f]">{price(style.price)}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}

/* ─────────────────────────────── Gift certificates ─────────────────────────────── */

function GiftCertificates({ t }: Ctx) {
  const phone = salon.phones[0];
  return (
    <section id="gift" className="overflow-hidden bg-gold-soft py-20 sm:py-28">
      <Container className="grid gap-16 lg:grid-cols-2 lg:items-center">
        <div>
          <SectionHeading align="left" eyebrow={t.gift.eyebrow} title={t.gift.title} intro={t.gift.text} />
          <ul className="mt-8 space-y-3">
            {t.gift.points.map((point) => (
              <li key={point} className="flex gap-3">
                <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-brand text-gold-light">
                  <Check aria-hidden className="size-3.5" strokeWidth={3} />
                </span>
                {point}
              </li>
            ))}
          </ul>
          <a href={phone.href} className={cn(pill(), 'mt-9')}>
            <Phone aria-hidden />
            {t.gift.cta}
          </a>
        </div>

        <div className="relative mx-auto w-full max-w-lg py-6" aria-hidden>
          <div className="absolute inset-x-8 top-0 bottom-10 rotate-6 overflow-hidden rounded-3xl bg-deep shadow-xl">
            <Image src={leavesDark} alt="" placeholder="blur" sizes="500px" className="size-full object-cover opacity-60" />
          </div>
          <div className="guilloche relative -rotate-2 rounded-3xl p-2 shadow-2xl shadow-black/15">
            <div className="rounded-[1.25rem] border-2 border-double border-gold/70 p-6 text-[#17261c] sm:p-8">
              <div className="flex items-center justify-between gap-4">
                <p className="font-display text-3xl font-bold tracking-[0.08em] text-[#22502f] uppercase sm:text-4xl">{t.gift.card}</p>
                <Monogram id="gift-monogram" className="h-16 w-auto shrink-0" />
              </div>
              <div className="mt-6 space-y-4 text-sm">
                <p className="flex items-end gap-3">
                  <span className="font-display text-2xl font-semibold">$</span>
                  <span className="h-8 w-24 rounded border border-[#17261c]/30" />
                  <span className="flex-1 border-b border-[#17261c]/30" />
                  <span className="font-semibold">{t.gift.cardAmount}</span>
                </p>
                <CertificateLine label={t.gift.cardFrom} />
                <CertificateLine label={t.gift.cardTo} />
              </div>
              <p className="mt-6 text-[0.7rem] text-[#17261c]/70">{t.gift.fineprint}</p>
              <p className="mt-3 text-right font-display text-lg font-semibold text-[#22502f]">{salon.name}</p>
            </div>
          </div>
        </div>
      </Container>
      <p className="sr-only">{t.gift.fineprint}</p>
    </section>
  );
}

function CertificateLine({ label }: { label: string }) {
  return (
    <p className="flex items-end gap-3">
      <span className="w-24 shrink-0 font-semibold">{label}</span>
      <span className="flex-1 border-b border-[#17261c]/30" />
    </p>
  );
}

/* ─────────────────────────────── Policy ─────────────────────────────── */

function Policy({ t }: Ctx) {
  return (
    <section className="relative isolate overflow-hidden bg-deep py-20 text-white sm:py-28">
      <Image src={leavesDark} alt="" placeholder="blur" sizes="100vw" className="absolute inset-0 -z-20 size-full object-cover opacity-35" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-deep/70 via-deep/85 to-deep" />
      <Container className="max-w-5xl">
        <SectionHeading tone="light" eyebrow={t.policy.eyebrow} title={t.policy.title} />
        <ol className="mt-12 grid gap-x-10 gap-y-5 md:grid-cols-2">
          {t.policy.items.map((item, index) => (
            <li key={item} className="flex gap-4">
              <span className="font-display text-2xl leading-none font-semibold text-gold-light">{String(index + 1).padStart(2, '0')}</span>
              <span className="leading-relaxed text-white/80">{item}</span>
            </li>
          ))}
        </ol>
        <div className="mt-14 text-center">
          <p className="mx-auto max-w-xl text-white/80">{t.policy.thanks}</p>
          <p className="text-gold-foil mt-2 font-script text-6xl leading-tight sm:text-7xl">{t.policy.signature}</p>
        </div>
      </Container>
    </section>
  );
}

/* ─────────────────────────────── Visit ─────────────────────────────── */

function Visit({ t, locale }: Ctx) {
  return (
    <section id="visit" className="py-20 sm:py-28">
      <Container>
        <div className="grid overflow-hidden rounded-[2.5rem] border border-border bg-surface lg:grid-cols-[1.1fr_1fr]">
          <div className="p-8 sm:p-12">
            <SectionHeading align="left" eyebrow={t.visit.eyebrow} title={t.visit.title} intro={t.visit.text} />
            <dl className="mt-10 space-y-6">
              <InfoRow icon={MapPin} label={t.visit.address}>
                {salon.addressLines.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </InfoRow>
              <InfoRow icon={Phone} label={t.visit.phone}>
                {salon.phones.map((phone, index) => (
                  <span key={phone.href}>
                    {index > 0 && <span className="text-subtle"> {t.common.or} </span>}
                    <a href={phone.href} className="font-semibold text-brand-strong hover:underline">
                      {phone.display}
                    </a>
                  </span>
                ))}
              </InfoRow>
              <InfoRow icon={Globe} label={t.visit.website}>
                <a href={salon.website.href} className="hover:text-brand-strong hover:underline">
                  {salon.website.display}
                </a>
              </InfoRow>
            </dl>
            <div className="mt-10 flex flex-wrap gap-3">
              <a href={salon.phones[0].href} className={pill()}>
                <Phone aria-hidden />
                {t.common.callNow}
              </a>
              <a href={salon.mapsHref} target="_blank" rel="noopener noreferrer" className={pill('secondary')}>
                <Navigation aria-hidden />
                {t.common.directions}
              </a>
            </div>
          </div>

          <div className="flex flex-col bg-surface-2">
            <Image src={spaCandle} alt={t.visit.imageAlt} placeholder="blur" sizes="(min-width: 1024px) 560px, 100vw" className="h-48 w-full object-cover sm:h-56" />
            <div className="flex-1 p-8 sm:p-12">
              <h3 className="flex items-center gap-2 font-display text-3xl font-semibold text-brand-strong">
                <Clock aria-hidden className="size-6 text-gold" />
                {t.visit.hours}
              </h3>
              <dl className="mt-6 divide-y divide-border">
                {salon.hours.map((row) => (
                  <div key={row.id} className="flex justify-between gap-4 py-3.5">
                    <dt className="font-medium">{t.visit.days[row.id]}</dt>
                    <dd className="font-display text-lg font-semibold text-brand-strong tabular-nums">{formatHours(locale, row.open, row.close)}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-6 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
                <span className="inline-flex items-center gap-2">
                  <Sparkles aria-hidden className="size-4 text-gold" />
                  {t.topBar.welcome}
                </span>
                <span className="inline-flex items-center gap-2">
                  <Sparkles aria-hidden className="size-4 text-gold" />
                  {t.topBar.gift}
                </span>
              </p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

function InfoRow({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-4">
      <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-gold-soft text-gold">
        <Icon aria-hidden className="size-5" />
      </span>
      <div>
        <dt className="text-xs font-semibold tracking-[0.18em] text-gold uppercase">{label}</dt>
        <dd className="mt-1 leading-relaxed">{children}</dd>
      </div>
    </div>
  );
}
