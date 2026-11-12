import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Check,
  Clock,
  type LucideIcon,
  MessageCircle,
  Package,
  Phone,
  Plus,
  Scale,
  Sparkles,
  Tag,
  WashingMachine,
  Wind,
} from 'lucide-react';
import { format } from '@web/core/i18n/format';
import { Container, buttonVariants, cn } from '@web/ui';
import { Reveal } from '@web/ui/reveal';
import { MachineMark } from '@/components/logo';
import { SectionHeading } from '@/components/section-heading';
import { mapEmbedSrc, priceTableOrder, priceTables, shop, type PriceRow, type Unit } from '@/content/shop';
import { ArticleGrid } from '@/features/articles/article-card';
import { articlePaths, listArticles } from '@/features/articles/data';
import { Estimator } from '@/features/estimate/estimator';
import { href, type Locale } from '@/i18n/locales';
import { getLocale, getMessages, type Messages } from '@/i18n/messages';
import { formatHours, formatVnd } from '@/lib/format';
import machines from '../../../public/images/machines.jpg';
import shelves from '../../../public/images/shelves.jpg';

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
        <Process {...ctx} />
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
    <section id="prices" className="py-14 sm:py-16">
      <Container>
        <SectionHeading eyebrow={t.prices.eyebrow} title={t.prices.title} intro={t.prices.intro} />
        <div className="mt-10 grid gap-6 lg:grid-cols-[1.15fr_1fr]">
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

/* ─────────────────────────────── Process ─────────────────────────────── */

function Process({ t }: Ctx) {
  return (
    <section id="process" className="py-14 sm:py-16">
      <Container className="grid gap-12 lg:grid-cols-[1fr_1.05fr] lg:items-center">
        <div>
          <SectionHeading align="left" eyebrow={t.process.eyebrow} title={t.process.title} />
          <ol className="relative mt-8 space-y-6">
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

/* ─────────────────────────────── Latest articles ─────────────────────────────── */

async function LatestArticles({ t, locale }: Ctx) {
  const articles = (await listArticles(locale)).slice(0, 3);
  if (articles.length === 0) return null;
  return (
    <section id="articles" className="py-14 sm:py-16">
      <Container>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading align="left" eyebrow={t.articles.eyebrow} title={t.articles.latest} intro={t.articles.latestIntro} />
          <Link href={href(locale, articlePaths.index)} className={cn(pill('secondary'), 'shrink-0 self-start sm:self-auto')}>
            {t.articles.viewAll}
            <ArrowRight aria-hidden />
          </Link>
        </div>
        <div className="mt-10">
          <ArticleGrid articles={articles} locale={locale} t={t} />
        </div>
      </Container>
    </section>
  );
}

/* ─────────────────────────────── FAQ ─────────────────────────────── */

function Faq({ t }: Ctx) {
  return (
    <section id="faq" className="bg-surface-2 py-14 sm:py-16">
      <Container className="max-w-3xl">
        <SectionHeading eyebrow={t.faq.eyebrow} title={t.faq.title} />
        <div className="mt-8 space-y-3">
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
  return (
    <section id="contact" className="py-14 sm:py-16">
      <Container>
        <div className="grid gap-10 lg:grid-cols-[1fr_1.05fr] lg:gap-14">
          <div>
            <SectionHeading align="left" eyebrow={t.contact.eyebrow} title={t.contact.title} intro={t.contact.text} />

            {/* Opening hours (the map beside shows where the shop is). */}
            <div className="mt-8 flex gap-4 rounded-[1.75rem] border border-border bg-surface p-6 shadow-sm">
              <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-cherry text-white">
                <Clock aria-hidden className="size-6" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold tracking-[0.14em] text-cherry uppercase">{t.contact.hours}</p>
                <dl className="mt-1 divide-y divide-border">
                  {(['weekdays', 'weekend'] as const).map((days) => (
                    <div key={days} className="flex flex-wrap items-baseline justify-between gap-x-4 py-2">
                      <dt className="font-medium">{t.contact[days]}</dt>
                      <dd className="font-display text-2xl leading-tight font-extrabold text-brand-strong tabular-nums">
                        {formatHours(locale, shop.hours[days])}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-1 text-sm text-muted">{t.contact.holidays}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-5 rounded-[1.75rem] bg-brand-soft p-6 xl:flex-row xl:items-center xl:justify-between">
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

          {/* Google Maps (keyless embed; www.google.com is allowed in src/proxy.ts frameOrigins).
              Square on phones and tablets; beside the cards (lg) it takes their height: about as tall as wide. */}
          <div className="relative isolate aspect-square overflow-hidden rounded-[1.75rem] bg-brand-soft shadow-xl ring-1 ring-black/5 lg:aspect-auto">
            <iframe
              title={t.contact.mapTitle}
              src={mapEmbedSrc(locale)}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="absolute inset-0 -z-10 size-full border-0"
            />
          </div>
        </div>
      </Container>
    </section>
  );
}
