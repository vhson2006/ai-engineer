import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  BedDouble,
  Check,
  Clock,
  Footprints,
  Gift,
  Hand,
  HardHat,
  Layers,
  type LucideIcon,
  MapPin,
  MessageCircle,
  Navigation,
  Package,
  Phone,
  Plus,
  Rabbit,
  Scale,
  Shirt,
  ShieldCheck,
  Sparkles,
  Tag,
  WashingMachine,
  Wind,
} from 'lucide-react';
import { format } from '@web/core/i18n/format';
import { Container, buttonVariants, cn } from '@web/ui';
import { Reveal } from '@web/ui/reveal';
import { MachineMark } from '@/components/logo';
import { Eyebrow, SectionHeading } from '@/components/section-heading';
import { branchMapsHref, priceTableOrder, priceTables, services, shop, type PriceRow, type ServiceIcon, type Unit } from '@/content/shop';
import { ArticleGrid } from '@/features/articles/article-card';
import { articlePaths, listArticles } from '@/features/articles/data';
import { Estimator } from '@/features/estimate/estimator';
import { href, type Locale } from '@/i18n/locales';
import { getLocale, getMessages, type Messages } from '@/i18n/messages';
import { formatTime, formatVnd } from '@/lib/format';
import machines from '../../../public/images/machines.jpg';
import shelves from '../../../public/images/shelves.jpg';
import signboard from '../../../public/images/signboard.jpg';

const SERVICE_ICONS: Record<ServiceIcon, LucideIcon> = {
  shirt: WashingMachine,
  bed: BedDouble,
  sparkles: Sparkles,
  footprints: Footprints,
  teddy: Rabbit,
  layers: Layers,
  hardHat: HardHat,
  hand: Hand,
  iron: Shirt,
};

const HIGHLIGHT_ICONS: Record<keyof Messages['highlights']['items'], LucideIcon> = {
  oneMachine: WashingMachine,
  clean: Sparkles,
  fast: Wind,
  labelled: Tag,
};

const STEP_ICONS: LucideIcon[] = [Package, Scale, WashingMachine, Check];

const pill = (variant: 'primary' | 'secondary' = 'primary') => cn(buttonVariants({ variant, size: 'lg' }), 'rounded-full px-7');
const sunPill = cn(buttonVariants({ size: 'lg' }), 'rounded-full bg-sun px-7 text-deep shadow-lg shadow-black/15 hover:bg-[#ffe14d]');

type Ctx = { t: Messages; locale: Locale; vnd: (amount: number) => string; unit: (unit: Unit) => string };

/** One landing page, prerendered per language. Facts and prices: src/content/shop.ts. */
export default async function HomePage() {
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  const ctx: Ctx = { t, locale, vnd: (amount) => formatVnd(locale, amount), unit: (unit) => t.common.units[unit] };
  return (
    <>
      <Hero {...ctx} />
      <Highlights {...ctx} />
      <Reveal>
        <Prices {...ctx} />
      </Reveal>
      <Reveal>
        <Services {...ctx} />
      </Reveal>
      <Reveal>
        <Process {...ctx} />
      </Reveal>
      <Reveal>
        <Loyalty {...ctx} />
      </Reveal>
      <Reveal>
        <Tips {...ctx} />
      </Reveal>
      <Reveal>
        <LatestArticles {...ctx} />
      </Reveal>
      <Reveal>
        <Faq {...ctx} />
      </Reveal>
      <Reveal>
        <Contact {...ctx} />
      </Reveal>
    </>
  );
}

/* ─────────────────────────────── Hero ─────────────────────────────── */

function Hero({ t, vnd, unit }: Ctx) {
  return (
    // id="top": the menu's Home link. The huge scroll margin makes it scroll to the very top of the
    // page (top bar included), and the hero in view highlights Home.
    <section id="top" className="bubbles relative scroll-mt-[100vh] overflow-hidden bg-brand text-white">
      <Container className="grid gap-12 py-14 sm:py-20 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:py-24">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-sun px-4 py-1.5 font-display text-base font-extrabold text-deep shadow-md">
            <WashingMachine aria-hidden className="size-5" />
            {t.brand.oneMachine}
          </p>
          <h1 className="mt-6 font-display text-5xl leading-[1.02] font-extrabold tracking-tight text-balance sm:text-6xl lg:text-[4.2rem]">
            {t.hero.title}
            <span className="sign-letters mt-1 block">{t.hero.titleAccent}</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-pretty text-white/90">{t.hero.text}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <a href={shop.phone.href} className={sunPill}>
              <Phone aria-hidden />
              {format(t.common.call, { phone: shop.phone.display })}
            </a>
            <a href="#prices" className={cn(pill('secondary'), 'border-white/40 bg-white/10 text-white hover:bg-white/20')}>
              {t.common.viewPrices}
            </a>
          </div>
          <p className="mt-8 font-display text-2xl font-extrabold tracking-wide text-white/95">{t.brand.tagline}</p>
        </div>

        <div className="relative mx-auto w-full max-w-xl">
          <div className="relative overflow-hidden rounded-[2.5rem] border-[6px] border-white/90 shadow-2xl shadow-black/25">
            <Image src={machines} alt={t.hero.imageAlt} priority placeholder="blur" sizes="(min-width: 1024px) 560px, 92vw" className="aspect-[4/3] w-full object-cover" />
          </div>
          <div className="float-slow absolute -top-5 -left-3 flex items-center gap-3 rounded-2xl bg-surface px-4 py-3 text-fg shadow-xl sm:-left-8">
            <MachineMark className="size-10" />
            <span className="text-sm font-semibold">{t.hero.machines}</span>
          </div>
          <div className="float-slower absolute -right-2 -bottom-6 rounded-2xl bg-sun px-5 py-3 text-deep shadow-xl sm:-right-6">
            <p className="text-xs font-bold uppercase">{t.hero.fromPrice}</p>
            <p className="font-display text-3xl leading-none font-extrabold">
              {vnd(35_000)}
              <span className="text-base font-bold"> {unit('load')}</span>
            </p>
          </div>
        </div>
      </Container>
      {/* Wave into the next section */}
      <svg aria-hidden viewBox="0 0 1440 60" preserveAspectRatio="none" className="block h-8 w-full text-bg sm:h-12">
        <path d="M0 30c120 25 240 25 360 0s240-25 360 0 240 25 360 0 240-25 360 0v30H0Z" fill="currentColor" />
      </svg>
    </section>
  );
}

/* ─────────────────────────────── Highlights ─────────────────────────────── */

function Highlights({ t }: Ctx) {
  const items = Object.entries(t.highlights.items) as [keyof Messages['highlights']['items'], { title: string; text: string }][];
  return (
    <Container className="pt-6">
      <ul aria-label={t.highlights.label} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map(([id, item]) => {
          const Icon = HIGHLIGHT_ICONS[id];
          return (
            <li key={id} className="flex gap-4 rounded-3xl border border-border bg-surface p-5">
              <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-strong">
                <Icon aria-hidden className="size-6" />
              </span>
              <div>
                <h2 className="font-display text-xl leading-tight font-extrabold text-brand-strong">{item.title}</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted">{item.text}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </Container>
  );
}

/* ─────────────────────────────── Prices ─────────────────────────────── */

function Prices({ t, locale, vnd, unit }: Ctx) {
  const tables = priceTableOrder.map((id) => ({
    id,
    title: t.prices.tables[id].title,
    rows: (priceTables[id] as PriceRow<string>[]).map((row) => ({
      ...row,
      label: (t.prices.tables[id].items as Record<string, string>)[row.id],
    })),
  }));
  const [clothes, ...others] = tables;
  return (
    <section id="prices" className="py-20 sm:py-24">
      <Container>
        <SectionHeading eyebrow={t.prices.eyebrow} title={t.prices.title} intro={t.prices.intro} />
        <div className="mt-12 grid gap-6 lg:grid-cols-[1.15fr_1fr]">
          <PriceCard title={clothes.title} rows={clothes.rows} vnd={vnd} unit={unit} highlight />
          <Estimator locale={locale} labels={t.estimate} />
        </div>
        <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {others.map((table) => (
            <PriceCard key={table.id} title={table.title} rows={table.rows} vnd={vnd} unit={unit} />
          ))}
        </div>
        <p className="mt-6 text-center text-sm text-subtle">{t.prices.note}</p>
      </Container>
    </section>
  );
}

function PriceCard({
  title,
  rows,
  vnd,
  unit,
  highlight = false,
}: {
  title: string;
  rows: { id: string; label: string; price: number; unit: Unit }[];
  vnd: (amount: number) => string;
  unit: (unit: Unit) => string;
  highlight?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-border bg-surface">
      <h3 className={cn('px-6 py-4 font-display text-2xl font-extrabold', highlight ? 'bg-deep text-sun' : 'bg-brand-soft text-brand-strong')}>{title}</h3>
      <dl className="px-6 py-3">
        {rows.map((row) => (
          <div key={row.id} className="flex items-end gap-2 py-2.5">
            <dt className="font-medium">{row.label}</dt>
            <span aria-hidden className="mb-1.5 min-w-4 flex-1 border-b-2 border-dotted border-border" />
            <dd className="text-right whitespace-nowrap">
              <span className="font-display text-xl font-extrabold text-brand-strong tabular-nums">{vnd(row.price)}</span>
              <span className="text-sm text-muted"> {unit(row.unit)}</span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/* ─────────────────────────────── Services ─────────────────────────────── */

function Services({ t, vnd, unit }: Ctx) {
  return (
    <section id="services" className="bg-surface-2 py-20 sm:py-24">
      <Container>
        <SectionHeading eyebrow={t.services.eyebrow} title={t.services.title} intro={t.services.intro} />
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => {
            const Icon = SERVICE_ICONS[service.icon];
            const text = t.services.items[service.id];
            return (
              <li
                key={service.id}
                className="group flex gap-4 rounded-3xl border border-border bg-surface p-5 transition duration-300 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lg hover:shadow-brand/10"
              >
                <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-2xl bg-brand text-sun transition-transform group-hover:rotate-6">
                  <Icon aria-hidden className="size-7" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-display text-xl leading-tight font-extrabold text-brand-strong">{text.name}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{text.text}</p>
                  <p className="mt-2 text-sm font-bold text-cherry">
                    {format(t.common.from, { price: vnd(service.from) })} {unit(service.unit)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}

/* ─────────────────────────────── Process ─────────────────────────────── */

function Process({ t }: Ctx) {
  return (
    <section id="process" className="py-20 sm:py-24">
      <Container className="grid gap-12 lg:grid-cols-[1fr_1.05fr] lg:items-center">
        <div>
          <SectionHeading align="left" eyebrow={t.process.eyebrow} title={t.process.title} />
          <ol className="relative mt-10 space-y-6">
            <span aria-hidden className="absolute top-6 bottom-6 left-6 w-0.5 bg-border" />
            {t.process.steps.map((step, index) => {
              const Icon = STEP_ICONS[index] ?? Check;
              return (
                <li key={step.title} className="relative flex gap-5">
                  <span className="relative z-10 inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-brand text-sun ring-4 ring-bg">
                    <Icon aria-hidden className="size-5" />
                  </span>
                  <div className="pt-1">
                    <p className="text-xs font-bold tracking-[0.14em] text-cherry uppercase">{String(index + 1).padStart(2, '0')}</p>
                    <h3 className="font-display text-2xl leading-tight font-extrabold text-brand-strong">{step.title}</h3>
                    <p className="mt-1 leading-relaxed text-muted">{step.text}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
        <div className="relative">
          <div aria-hidden className="absolute -inset-3 -rotate-2 rounded-[2.5rem] bg-sun" />
          <Image src={shelves} alt={t.process.imageAlt} placeholder="blur" sizes="(min-width: 1024px) 560px, 92vw" className="relative aspect-[4/3] w-full rounded-[2.5rem] object-cover shadow-xl" />
        </div>
      </Container>
    </section>
  );
}

/* ─────────────────────────────── Loyalty ─────────────────────────────── */

function Loyalty({ t }: Ctx) {
  const stamps = shop.loyalty.paid + shop.loyalty.free;
  return (
    <section className="py-6">
      <Container>
        <div className="bubbles relative overflow-hidden rounded-[2.5rem] bg-deep px-6 py-12 text-white sm:px-12">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center">
            <div>
              <Eyebrow tone="light">{t.loyalty.eyebrow}</Eyebrow>
              <h2 className="sign-letters mt-4 font-display text-5xl leading-none font-extrabold sm:text-6xl">{t.loyalty.title}</h2>
              <p className="mt-4 max-w-md text-lg text-white/85">{t.loyalty.text}</p>
            </div>
            <div role="img" aria-label={t.loyalty.card} className="rounded-3xl bg-surface p-6 text-fg shadow-2xl sm:p-8">
              <div className="flex items-center justify-between">
                <span className="sign-letters font-display text-3xl font-extrabold">SFaster</span>
                <Gift aria-hidden className="size-7 text-cherry" />
              </div>
              <div className="mt-6 grid grid-cols-4 gap-3">
                {Array.from({ length: stamps }, (_, index) => {
                  const free = index >= shop.loyalty.paid;
                  return (
                    <span
                      key={index}
                      aria-hidden
                      className={cn(
                        'flex aspect-square items-center justify-center rounded-full font-display text-lg font-extrabold',
                        free ? 'bg-cherry text-white' : 'border-2 border-dashed border-brand/50 text-brand-strong',
                      )}
                    >
                      {free ? t.loyalty.free : index + 1}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

/* ─────────────────────────────── Tips ─────────────────────────────── */

function Tips({ t }: Ctx) {
  return (
    <section id="tips" className="py-20 sm:py-24">
      <Container className="max-w-4xl">
        <SectionHeading eyebrow={t.tips.eyebrow} title={t.tips.title} />
        <ul className="mt-10 grid gap-3 sm:grid-cols-2">
          {t.tips.items.map((tip) => (
            <li key={tip} className="flex gap-3 rounded-2xl border border-border bg-surface p-4">
              <ShieldCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-brand-strong" />
              <span className="leading-relaxed">{tip}</span>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

/* ─────────────────────────────── Latest articles ─────────────────────────────── */

async function LatestArticles({ t, locale }: Ctx) {
  const articles = (await listArticles(locale)).slice(0, 3);
  if (articles.length === 0) return null;
  return (
    <section id="articles" className="pb-20 sm:pb-24">
      <Container>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading align="left" eyebrow={t.articles.eyebrow} title={t.articles.latest} intro={t.articles.latestIntro} />
          <Link href={href(locale, articlePaths.index)} className={cn(pill('secondary'), 'shrink-0 self-start sm:self-auto')}>
            {t.articles.viewAll}
            <ArrowRight aria-hidden />
          </Link>
        </div>
        <div className="mt-12">
          <ArticleGrid articles={articles} locale={locale} t={t} />
        </div>
      </Container>
    </section>
  );
}

/* ─────────────────────────────── FAQ ─────────────────────────────── */

function Faq({ t }: Ctx) {
  return (
    <section id="faq" className="bg-surface-2 py-20 sm:py-24">
      <Container className="max-w-3xl">
        <SectionHeading eyebrow={t.faq.eyebrow} title={t.faq.title} />
        <div className="mt-10 space-y-3">
          {t.faq.items.map((item, index) => (
            <details key={item.q} open={index === 0} className="group rounded-2xl border border-border bg-surface px-5 open:border-brand/50">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-semibold focus-visible:outline-2 focus-visible:outline-brand">
                {item.q}
                <Plus aria-hidden className="size-5 shrink-0 text-brand-strong transition-transform group-open:rotate-45" />
              </summary>
              <p className="pb-4 leading-relaxed text-muted">{item.a}</p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* ─────────────────────────────── Contact ─────────────────────────────── */

function Contact({ t, locale }: Ctx) {
  const open = formatTime(locale, shop.hours.open);
  const close = formatTime(locale, shop.hours.close);
  return (
    <section id="contact" className="py-20 sm:py-24">
      <Container>
        <div className="grid gap-10 lg:grid-cols-[1fr_1.05fr] lg:items-start lg:gap-14">
          <div>
            <SectionHeading align="left" eyebrow={t.contact.eyebrow} title={t.contact.title} intro={t.contact.text} />

            {/* The branches, as printed on the sign: one card each, with its own directions. */}
            <h3 className="sr-only">{t.contact.branchesLabel}</h3>
            <ul className="mt-10 grid gap-4 sm:grid-cols-2">
              {shop.branches.map((branch, index) => (
                <li key={branch.id} className="flex flex-col rounded-[1.75rem] border border-border bg-surface p-6 shadow-sm">
                  <span className="inline-flex items-center gap-2 self-start rounded-full bg-brand px-3 py-1 text-xs font-extrabold tracking-wide text-white uppercase">
                    <MapPin aria-hidden className="size-3.5" />
                    {format(t.contact.branch, { number: index + 1 })}
                  </span>
                  <address className="mt-4 flex-1 not-italic">
                    <span className="block font-display text-2xl leading-tight font-extrabold text-brand-strong">{branch.street}</span>
                    <span className="mt-1 block text-muted">
                      {branch.ward}, {branch.city}
                    </span>
                  </address>
                  <a
                    href={branchMapsHref(branch)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 inline-flex items-center gap-2 self-start text-sm font-bold text-brand-strong hover:underline"
                  >
                    <Navigation aria-hidden className="size-4" />
                    {t.common.directions}
                  </a>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex flex-col gap-5 rounded-[1.75rem] bg-brand-soft p-6 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-xs font-bold tracking-[0.14em] text-cherry uppercase">{t.contact.phone}</p>
                <a href={shop.phone.href} className="mt-1 block font-display text-3xl font-extrabold whitespace-nowrap text-brand-strong tabular-nums hover:underline">
                  {shop.phone.display}
                </a>
              </div>
              <div className="flex flex-wrap gap-3">
                <a href={shop.phone.href} className={pill()}>
                  <Phone aria-hidden />
                  {t.common.callNow}
                </a>
                <a href={shop.zaloHref} target="_blank" rel="noopener noreferrer" className={pill('secondary')}>
                  <MessageCircle aria-hidden />
                  {t.common.zalo}
                </a>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <Image
              src={signboard}
              alt={t.contact.imageAlt}
              placeholder="blur"
              sizes="(min-width: 1024px) 580px, 92vw"
              className="w-full rounded-[1.75rem] shadow-xl ring-1 ring-black/5"
            />
            <HoursPoster t={t} open={open} close={close} />
          </div>
        </div>
      </Container>
    </section>
  );
}

/** The shop's opening-hours poster (red, white and yellow), rebuilt in HTML: crisp and readable. */
function HoursPoster({ t, open, close }: { t: Messages; open: string; close: string }) {
  return (
    <div className="overflow-hidden rounded-[1.75rem] bg-cherry text-center text-white shadow-xl">
      <div className="px-6 pt-8 pb-7">
        <p className="inline-flex items-center gap-2 font-display text-3xl leading-none font-extrabold tracking-wide uppercase sm:text-4xl">
          <Clock aria-hidden className="size-7 sm:size-8" />
          {t.contact.posterTitle}
        </p>
        <p className="mt-4 font-display text-4xl leading-none font-extrabold text-sun tabular-nums sm:text-5xl">
          {open} – {close}
        </p>
        <p className="mt-3 font-display text-lg font-bold text-sun/95 uppercase">
          {t.contact.posterDaily} · {t.contact.holidays}
        </p>
      </div>
      <a
        href={shop.zaloHref}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-4 bg-sun px-6 py-4 text-cherry transition-colors hover:bg-[#ffe14d]"
      >
        <span className="rounded-xl bg-cherry px-2.5 py-1.5 text-sm font-extrabold text-white">Zalo</span>
        <span className="text-left">
          <span className="block text-xs font-bold tracking-[0.12em] uppercase">{t.contact.posterZalo}</span>
          <span className="block font-display text-3xl leading-none font-extrabold tabular-nums">{shop.phone.display}</span>
        </span>
      </a>
    </div>
  );
}
