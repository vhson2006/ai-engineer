import Image from 'next/image';
import Link from 'next/link';
import { ArrowDown, ArrowUpRight, Check, Clock, Gem, Globe, HeartHandshake, Leaf, type LucideIcon, MapPin, Navigation, Palette, Phone, Plus, ShieldCheck, Tag } from 'lucide-react';
import type { ReactNode } from 'react';
import { format } from '@web/core/i18n/format';
import { cn } from '@web/ui';
import { Reveal } from '@web/ui/reveal';
import { Band } from '@/components/band';
import { bento, GRID, STRONG, TINTS } from '@/components/bento';
import { Monogram } from '@/components/logo';
import { NailArt } from '@/components/nail-art';
import { pill } from '@/components/pill';
import { Eyebrow, SectionHeading } from '@/components/section-heading';
import {
  fromPrice,
  gallery,
  menuTables,
  menuTabs,
  priceOf,
  salon,
  specialties,
  sumPrices,
  type MenuRef,
  type Price,
  type TableId,
} from '@/content/salon';
import { ArticleGrid } from '@/features/articles/article-card';
import { articlePaths, listArticles } from '@/features/articles/data';
import { BookButton } from '@/features/booking/booking-provider';
import { Gallery, type GalleryLook } from '@/features/gallery/gallery';
import { FeaturedCarousel } from '@/features/hero/featured-carousel';
import { OpenStatusBadge } from '@/features/hero/open-status';
import { MenuGrid, type MenuCard } from '@/features/menu/menu-grid';
import { href, type Locale } from '@/i18n/locales';
import { getLocale, getMessages, type Messages } from '@/i18n/messages';
import { formatHours, formatPrice } from '@/lib/format';
import spaCandle from '../../../public/images/spa-candle.jpg';

const PROMISE_ICONS: Record<keyof Messages['promise']['items'], { icon: LucideIcon; tint: string }> = {
  clean: { icon: ShieldCheck, tint: 'bg-mint' },
  products: { icon: Gem, tint: 'bg-rose' },
  staff: { icon: HeartHandshake, tint: 'bg-baby' },
  relax: { icon: Leaf, tint: 'bg-lilac' },
};

type Ctx = { t: Messages; locale: Locale; price: (value: Price) => string };

/** One landing page, prerendered per language. Facts and prices: src/content/salon.ts. */
export default async function HomePage() {
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  const ctx: Ctx = { t, locale, price: (value) => formatPrice(locale, value) };
  // Bands alternate white / pastel wash (the band stays put; only its content fades in).
  return (
    <>
      <Band tone="white" className="pt-2 sm:pt-2">
        <div className="space-y-3 sm:space-y-4">
          <Hero {...ctx} />
          <PromiseRow {...ctx} />
        </div>
      </Band>
      <Band tone="rose">
        <Reveal>
          <GallerySection {...ctx} />
        </Reveal>
      </Band>
      <Band tone="white">
        <Reveal>
          <Artists {...ctx} />
        </Reveal>
      </Band>
      <Band tone="mint">
        <Reveal>
          <Menu {...ctx} />
        </Reveal>
      </Band>
      <Band tone="lilac">
        <Reveal>
          <Faq {...ctx} />
        </Reveal>
      </Band>
      <Band tone="white">
        <Reveal>
          <LatestArticles {...ctx} />
        </Reveal>
      </Band>
      <Band tone="white" className="pt-0 pb-24 sm:pt-0 sm:pb-28">
        <Reveal>
          <Visit {...ctx} />
        </Reveal>
      </Band>
    </>
  );
}

/** The three newest blog articles, with a link to the blog. */
async function LatestArticles({ t, locale }: Ctx) {
  const articles = (await listArticles(locale)).slice(0, 3);
  if (articles.length === 0) return null;
  return (
    <section id="blog">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <SectionHeading eyebrow={t.articles.eyebrow} dot="bg-rose-strong" title={t.articles.latest} intro={t.articles.latestIntro} />
        <Link href={href(locale, articlePaths.index)} className={pill('soft', 'md', 'shrink-0 self-start lg:self-auto')}>
          {t.articles.viewAll}
          <ArrowUpRight aria-hidden />
        </Link>
      </div>
      <div className="mt-10">
        <ArticleGrid articles={articles} locale={locale} t={t} />
      </div>
    </section>
  );
}

/** "Classic Manicure · Gel" for a menu line. */
function lineName(t: Messages, ref: MenuRef) {
  const table = t.menu.tables[ref.table];
  const name = (table.items as Record<string, string>)[ref.row];
  return table.columns.length > 1 ? `${name} · ${table.columns[ref.column ?? 0]}` : name;
}

/** A gallery look's photo filling its (positioned) parent. */
function LookArt({ look, size = 'md' }: { look: (typeof gallery)[number]; size?: 'md' | 'lg' }) {
  return (
    <Image
      src={look.photo}
      alt=""
      placeholder="blur"
      sizes={size === 'lg' ? '(min-width: 640px) 380px, 100vw' : '(min-width: 768px) 25vw, 50vw'}
      className="absolute inset-0 size-full object-cover"
    />
  );
}

/* ─────────────────────────────── Hero bento ─────────────────────────────── */

function Hero({ t, locale, price }: Ctx) {
  const royal = priceOf({ table: 'pedicure', row: 'royal' });
  const featured = ['floralStiletto', 'mintGoldFoil', 'peacock', 'butterBlossoms', 'milkyPink'] as const;
  return (
    <section className={cn(GRID, 'lg:grid-cols-4')}>
      {/* Brand statement */}
      <div className={bento('mint', 'flex min-h-[30rem] flex-col justify-between lg:col-span-2 lg:row-span-2 lg:p-10')}>
        <div aria-hidden className="absolute -right-16 -bottom-16 size-64 rounded-full bg-mint-strong/15" />
        <div aria-hidden className="absolute right-10 bottom-36 size-16 rotate-12 rounded-2xl bg-white/50 motion-safe:animate-float" />
        <div aria-hidden className="absolute top-24 right-8 size-6 rounded-full bg-rose-strong/40" />
        <div className="relative">
          <Eyebrow dot="bg-mint-strong" className="bg-white/70 dark:bg-white/10">
            {t.hero.eyebrow}
          </Eyebrow>
          <h1 className="mt-8 text-[clamp(2.75rem,6.5vw,5.25rem)] leading-[0.95] font-extrabold tracking-[-0.045em] text-balance">
            {t.hero.title}{' '}
            <span className="relative inline-block">
              <span aria-hidden className="absolute inset-x-0 bottom-[0.08em] -z-0 h-[0.32em] rounded-full bg-rose" />
              <span className="relative">{t.hero.titleAccent}</span>
            </span>
          </h1>
          <p className="mt-6 max-w-lg leading-relaxed text-pretty text-muted">{t.hero.text}</p>
        </div>
        <div className="relative mt-8 flex flex-wrap items-center gap-2">
          <BookButton className={pill('ink', 'lg')}>
            {t.booking.open}
            <ArrowUpRight aria-hidden />
          </BookButton>
          <a href="#menu" className={pill('glass', 'lg')}>
            {t.common.viewMenu}
            <ArrowDown aria-hidden />
          </a>
        </div>
      </div>

      {/* Featured looks slideshow */}
      <div className={bento('lilac', 'min-h-[24rem] p-0 sm:p-0 lg:row-span-2')}>
        <p className="absolute top-4 left-4 z-10 rounded-full bg-white/80 px-3 py-1.5 text-xs font-bold text-[#263238] backdrop-blur">{t.hero.featured}</p>
        <FeaturedCarousel
          labels={{ title: t.hero.featured, slide: t.hero.slide, pause: t.hero.pause, play: t.hero.play }}
          slides={featured.map((id) => {
            const look = gallery.find((item) => item.id === id)!;
            return {
              id,
              name: t.gallery.items[id].name,
              node: (
                <div className={cn('absolute inset-0', TINTS[look.tint])}>
                  <LookArt look={look} size="lg" />
                </div>
              ),
            };
          })}
        />
      </div>

      {/* Open now + hours */}
      <div className={bento('rose')}>
        <OpenStatusBadge hours={salon.hours} timeZone={salon.timeZone} locale={locale} labels={t.status} />
        <dl className="mt-4 space-y-1.5 text-sm">
          {salon.hours.map((row) => (
            <div key={row.id} className="flex justify-between gap-3">
              <dt className="text-muted">{t.visit.days[row.id]}</dt>
              <dd className="font-semibold whitespace-nowrap tabular-nums">{formatHours(locale, row.open, row.close)}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Signature service */}
      <div className={bento('baby', 'flex flex-col justify-between gap-6')}>
        <div>
          <p className="text-xs font-bold tracking-wide text-muted uppercase">{t.hero.signatureLabel}</p>
          <p className="mt-2 text-2xl leading-tight font-extrabold tracking-[-0.03em]">{t.hero.signatureName}</p>
        </div>
        <div className="flex items-center justify-between gap-3">
          {royal && <span className="text-3xl font-extrabold tabular-nums">{price(royal)}</span>}
          <BookButton service="pedicure.royal" className={pill('ink', 'sm')}>
            {t.menu.book}
            <ArrowUpRight aria-hidden />
          </BookButton>
        </div>
      </div>
    </section>
  );
}

function PromiseRow({ t }: Ctx) {
  const items = Object.entries(t.promise.items) as [keyof Messages['promise']['items'], { title: string; text: string }][];
  return (
    <ul aria-label={t.promise.label} className={cn(GRID, 'sm:grid-cols-2 lg:grid-cols-4')}>
      {items.map(([id, item]) => {
        const { icon: Icon, tint } = PROMISE_ICONS[id];
        return (
          <li key={id} className={bento('white', 'flex gap-4 p-5 sm:p-6')}>
            <span className={cn('inline-flex size-11 shrink-0 items-center justify-center rounded-2xl', tint)}>
              <Icon aria-hidden className="size-5" />
            </span>
            <div>
              <h2 className="font-bold">{item.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted">{item.text}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/* ─────────────────────────────── Gallery ─────────────────────────────── */

function GallerySection({ t, price }: Ctx) {
  const looks: GalleryLook[] = gallery.map((look) => {
    const text = t.gallery.items[look.id];
    const lines = [look.base, ...(look.addOn ? [look.addOn] : [])].map((ref) => ({ name: lineName(t, ref), price: priceOf(ref)! }));
    return {
      id: look.id,
      category: look.category,
      name: text.name,
      text: text.text,
      tint: TINTS[look.tint],
      service: `${look.base.table}.${look.base.row}`,
      cover: <LookArt look={look} />,
      visual: <LookArt look={look} size="lg" />,
      details: (
        <dl className="space-y-5 text-sm">
          <div className="flex items-start gap-3">
            <dt className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-mint">
              <Clock aria-hidden className="size-4" />
              <span className="sr-only">{t.gallery.time}</span>
            </dt>
            <dd className="pt-2 font-semibold">{format(t.gallery.timeValue, { min: look.minutes[0], max: look.minutes[1] })}</dd>
          </div>
          <div className="flex items-start gap-3">
            <dt className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-rose">
              <Tag aria-hidden className="size-4" />
              <span className="sr-only">{t.gallery.price}</span>
            </dt>
            <dd className="flex-1 space-y-1 pt-2">
              {lines.map((line) => (
                <p key={line.name} className="flex justify-between gap-3">
                  <span className="text-muted">{line.name}</span>
                  <span className="tabular-nums">{price(line.price)}</span>
                </p>
              ))}
              <p className="flex justify-between gap-3 border-t border-border pt-1.5 font-bold">
                <span>{t.gallery.total}</span>
                <span className="tabular-nums">{price(sumPrices(lines.map((line) => line.price)))}</span>
              </p>
            </dd>
          </div>
          <div className="flex items-start gap-3">
            <dt className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-baby">
              <Palette aria-hidden className="size-4" />
              <span className="sr-only">{t.gallery.palette}</span>
            </dt>
            <dd className="flex flex-wrap gap-2 pt-1">
              {look.palette.map((hex, index) => (
                <span key={hex} className="inline-flex items-center gap-2 rounded-full bg-surface-2 py-1 pr-3 pl-1 text-xs font-semibold">
                  <span aria-hidden className="size-5 rounded-full ring-1 ring-black/10" style={{ backgroundColor: hex }} />
                  {text.colors[index]}
                </span>
              ))}
            </dd>
          </div>
          <p className="text-xs leading-relaxed text-muted">{t.gallery.estimate}</p>
        </dl>
      ),
    };
  });
  const filters = [
    { id: 'all', label: t.gallery.all },
    ...(Object.entries(t.gallery.categories) as [string, string][]).map(([id, label]) => ({ id, label })),
  ];
  return (
    <section id="gallery">
      <SectionHeading eyebrow={t.gallery.eyebrow} dot="bg-lilac-strong" title={t.gallery.title} intro={t.gallery.intro} />
      <div className="mt-10">
        <Gallery looks={looks} filters={filters} labels={{ filters: t.gallery.filtersLabel, open: t.gallery.open, book: t.gallery.book, close: t.gallery.close }} />
      </div>
    </section>
  );
}

/* ─────────────────────────────── Artists (specialties) ─────────────────────────────── */

function Artists({ t, price }: Ctx) {
  return (
    <section id="artists">
      <SectionHeading eyebrow={t.artists.eyebrow} dot="bg-rose-strong" title={t.artists.title} intro={t.artists.intro} />
      <ul className={cn(GRID, 'mt-10 lg:grid-cols-3')}>
        {specialties.map((item, index) => {
          const text = t.artists.items[item.id];
          return (
            <li key={item.id} className={bento(item.tint, 'group flex flex-col', true)}>
              <div className="flex items-start justify-between gap-4">
                <span className="font-mono text-sm font-semibold text-muted">0{index + 1}</span>
                <span className="relative flex size-28 items-center justify-center overflow-hidden rounded-full bg-white/70 transition-transform duration-700 group-hover:rotate-6 dark:bg-white/10">
                  <span aria-hidden className={cn('absolute -right-3 -bottom-3 size-12 rounded-full opacity-30', STRONG[item.tint])} />
                  <NailArt id={`specialty-${item.id}`} pattern={item.pattern} base="#fbf7f5" accent={item.pattern === 'aura' ? '#b99be6' : '#64b5f6'} className="relative w-24 text-fg" />
                </span>
              </div>
              <h3 className="mt-6 text-2xl font-extrabold tracking-[-0.03em]">{text.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{text.text}</p>
              <ul className="mt-5 flex flex-wrap gap-1.5">
                {text.tags.map((tag) => (
                  <li key={tag} className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold dark:bg-white/10">
                    {tag}
                  </li>
                ))}
              </ul>
              <dl className="mt-6 flex-1 space-y-1.5 border-t border-[#263238]/10 pt-5 text-sm dark:border-white/10">
                <dt className="sr-only">{t.artists.from}</dt>
                {item.prices.map((ref) => (
                  <dd key={ref.row} className="flex justify-between gap-3">
                    <span className="text-muted">{lineName(t, ref)}</span>
                    <span className="font-semibold tabular-nums">{price(priceOf(ref)!)}</span>
                  </dd>
                ))}
              </dl>
              <BookButton group={item.group} className={pill('glass', 'md', 'mt-6 self-start')}>
                {t.artists.book}
                <ArrowUpRight aria-hidden />
              </BookButton>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ─────────────────────────────── Menu ─────────────────────────────── */

function Menu(ctx: Ctx) {
  const { t, price } = ctx;
  const cards: MenuCard[] = menuTabs.map((tab) => {
    const firstTable = tab.tables[0];
    const names = t.menu.tables[firstTable].items as Record<string, string>;
    const rows = menuTables[firstTable] as { id: string; prices: (Price | null)[] }[];
    const total = tab.tables.reduce((count, id) => count + menuTables[id].length, 0);
    const teaser = rows.slice(0, 3).map((row) => ({ name: names[row.id], price: row.prices[0] ? price(row.prices[0]) : '–' }));
    const note = (t.menu.notes as Partial<Record<string, string>>)[tab.id];
    return {
      id: tab.id,
      name: t.menu.tabs[tab.id],
      blurb: t.menu.blurbs[tab.id],
      from: format(t.common.from, { price: price(fromPrice(tab)) }),
      tint: TINTS[tab.tint],
      teaser,
      more: total - teaser.length,
      bookable: tab.bookable,
      content: (
        <div className="space-y-7">
          {tab.tables.map((tableId) => (
            <PriceTable key={tableId} tableId={tableId} showTitle={tab.tables.length > 1} {...ctx} />
          ))}
          {note && <p className="rounded-2xl bg-surface-2 px-4 py-3 text-sm leading-relaxed text-muted">{note}</p>}
        </div>
      ),
    };
  });
  return (
    <section id="menu">
      <SectionHeading eyebrow={t.menu.eyebrow} dot="bg-baby-strong" title={t.menu.title} intro={t.menu.intro} />
      <div className="mt-10">
        <MenuGrid cards={cards} labels={{ viewAll: t.menu.viewAll, more: t.menu.more, book: t.menu.book, close: t.menu.close }} />
      </div>
    </section>
  );
}

function PriceTable({ tableId, showTitle, t, price }: Ctx & { tableId: TableId; showTitle: boolean }) {
  const text = t.menu.tables[tableId];
  const names = text.items as Record<string, string>;
  const includes = (t.menu.includes as Partial<Record<string, Record<string, string[]>>>)[tableId];
  const rows = menuTables[tableId] as { id: string; prices: (Price | null)[] }[];
  const multi = text.columns.length > 1;
  return (
    <div>
      {showTitle && <h3 className="mb-2 text-xs font-bold tracking-wide text-muted uppercase">{text.title}</h3>}
      <table className="w-full text-sm">
        <thead className={cn(!multi && 'sr-only')}>
          <tr>
            <th scope="col" className="pb-2 text-left text-xs font-semibold text-muted">
              {t.menu.service}
            </th>
            {text.columns.map((column) => (
              <th key={column} scope="col" className="w-20 pb-2 text-right text-xs font-semibold text-muted sm:w-24">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr key={row.id}>
              <th scope="row" className="py-2.5 pr-4 text-left font-normal">
                <span className="block font-semibold">{names[row.id]}</span>
                {includes?.[row.id] && <span className="mt-0.5 block text-xs leading-relaxed text-muted">{includes[row.id].join(' · ')}</span>}
              </th>
              {row.prices.map((value, column) => (
                <td key={column} className="py-2.5 text-right align-top font-semibold whitespace-nowrap tabular-nums">
                  {value ? (
                    price(value)
                  ) : (
                    <span className="text-muted">
                      <span aria-hidden>–</span>
                      <span className="sr-only">{t.menu.notOffered}</span>
                    </span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─────────────────────────────── FAQ ─────────────────────────────── */

/** Questions as native <details> (keyboard and screen-reader friendly, no JavaScript). */
function Faq({ t }: Ctx) {
  const phone = salon.phones[0];
  return (
    <section id="faq" className={cn(GRID, 'lg:grid-cols-[1fr_1.6fr] lg:items-start')}>
      <div className={bento('baby', 'lg:sticky lg:top-24 lg:p-10')}>
        <Eyebrow dot="bg-baby-strong" className="bg-white/70 dark:bg-white/10">
          {t.faq.eyebrow}
        </Eyebrow>
        <h2 className="mt-5 text-4xl leading-[1.02] font-extrabold tracking-[-0.035em] text-balance sm:text-5xl">{t.faq.title}</h2>
        <p className="mt-4 leading-relaxed text-muted">{t.faq.intro}</p>
        <div className="mt-8 flex flex-wrap gap-2">
          <a href={salon.bookingUrl} target="_blank" rel="noopener noreferrer" className={pill('ink', 'md')}>
            {t.booking.open}
            <ArrowUpRight aria-hidden />
          </a>
          <a href={phone.href} className={pill('glass', 'md')}>
            <Phone aria-hidden />
            {phone.display}
          </a>
        </div>
      </div>
      <ul className="space-y-3">
        {t.faq.items.map((item, index) => (
          <li key={item.q}>
            <details open={index === 0} className="group rounded-3xl bg-surface transition-colors open:bg-mint">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-3xl px-6 py-5 font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:px-7 [&::-webkit-details-marker]:hidden">
                {item.q}
                <span
                  aria-hidden
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-white/80 text-[#263238] transition-transform duration-300 group-open:rotate-45 dark:bg-white/10 dark:text-fg"
                >
                  <Plus className="size-4" />
                </span>
              </summary>
              <p className="px-6 pb-6 text-sm leading-relaxed text-muted sm:px-7">{item.a}</p>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ─────────────────────────────── Visit bento ─────────────────────────────── */

function Visit({ t, locale }: Ctx) {
  const phone = salon.phones[0];
  return (
    <section id="visit">
      <div className={cn(GRID, 'lg:grid-cols-4')}>
        {/* Address & contact */}
        <div className={bento('mint', 'lg:col-span-2 lg:p-10')}>
          <Eyebrow dot="bg-mint-strong" className="bg-white/70 dark:bg-white/10">
            {t.visit.eyebrow}
          </Eyebrow>
          <h2 className="mt-5 text-4xl leading-[1.02] font-extrabold tracking-[-0.035em] text-balance sm:text-5xl">{t.visit.title}</h2>
          <p className="mt-3 max-w-md text-muted">{t.visit.text}</p>
          <dl className="mt-8 space-y-3 text-sm">
            <InfoRow icon={MapPin} label={t.visit.address}>
              {salon.addressLines.join(', ')}
            </InfoRow>
            <InfoRow icon={Phone} label={t.visit.phone}>
              {salon.phones.map((item, index) => (
                <span key={item.href}>
                  {index > 0 && <span className="text-muted"> {t.common.or} </span>}
                  <a href={item.href} className="font-semibold underline-offset-4 hover:underline">
                    {item.display}
                  </a>
                </span>
              ))}
            </InfoRow>
            <InfoRow icon={Globe} label={t.visit.website}>
              <a href={salon.website.href} className="underline-offset-4 hover:underline">
                {salon.website.display}
              </a>
            </InfoRow>
          </dl>
          <div className="mt-6">
            <p className="text-xs text-muted">{t.visit.follow}</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {salon.socials.map((social) => (
                <li key={social.id}>
                  <a
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex rounded-full bg-white/70 px-3.5 py-1.5 text-sm font-semibold transition-colors hover:bg-white dark:bg-white/10 dark:hover:bg-white/20"
                  >
                    {social.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-8 flex flex-wrap gap-2">
            <a href={salon.mapsHref} target="_blank" rel="noopener noreferrer" className={pill('ink', 'md')}>
              <Navigation aria-hidden />
              {t.common.directions}
            </a>
            <a href={phone.href} className={pill('glass', 'md')}>
              <Phone aria-hidden />
              {t.common.callNow}
            </a>
          </div>
        </div>

        {/* Google Maps (keyless embed; its origin is allowed in src/proxy.ts frameOrigins) */}
        <div className="relative isolate min-h-80 overflow-hidden rounded-3xl bg-baby lg:col-span-2">
          <iframe
            title={t.visit.mapTitle}
            src={`https://www.google.com/maps?q=${encodeURIComponent(salon.mapQuery)}&hl=${locale}&output=embed`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="absolute inset-0 -z-10 size-full border-0"
          />
          <a
            href={salon.mapsHref}
            target="_blank"
            rel="noopener noreferrer"
            className={pill('ink', 'sm', 'absolute bottom-4 left-4 shadow-lg')}
          >
            <MapPin aria-hidden />
            {t.visit.openMap}
          </a>
        </div>

        {/* Hours */}
        <div className={bento('baby')}>
          <h3 className="flex items-center gap-2 text-xl font-extrabold">
            <Clock aria-hidden className="size-5" />
            {t.visit.hours}
          </h3>
          <dl className="mt-5 space-y-3 text-sm">
            {salon.hours.map((row) => (
              <div key={row.id} className="rounded-2xl bg-white/70 px-4 py-3 dark:bg-white/10">
                <dt className="text-xs text-muted">{t.visit.days[row.id]}</dt>
                <dd className="mt-0.5 font-bold tabular-nums">{formatHours(locale, row.open, row.close)}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Photo */}
        <div className="relative min-h-72 overflow-hidden rounded-3xl">
          <Image src={spaCandle} alt={t.visit.imageAlt} placeholder="blur" fill sizes="(min-width: 1024px) 300px, 100vw" className="object-cover" />
        </div>

        {/* Gift certificates */}
        <div id="gift" className={bento('rose', 'grid gap-8 sm:grid-cols-[1fr_auto] sm:items-center lg:col-span-2')}>
          <div>
            <p className="text-xs font-bold tracking-wide text-muted uppercase">{t.gift.eyebrow}</p>
            <h3 className="mt-2 text-3xl font-extrabold tracking-[-0.03em]">{t.gift.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted">{t.gift.text}</p>
            <ul className="mt-4 space-y-1.5 text-sm">
              {t.gift.points.map((point) => (
                <li key={point} className="flex gap-2">
                  <Check aria-hidden className="mt-0.5 size-4 shrink-0" />
                  {point}
                </li>
              ))}
            </ul>
            <a href={phone.href} className={pill('ink', 'md', 'mt-6')}>
              <Phone aria-hidden />
              {t.gift.cta}
            </a>
            <p className="mt-4 text-xs text-muted">{t.gift.fineprint}</p>
          </div>
          <div
            aria-hidden
            className="mx-auto w-52 rotate-3 rounded-3xl bg-white p-5 text-[#263238] shadow-xl shadow-rose-strong/15 transition-transform duration-500 hover:rotate-0"
          >
            <div className="flex items-start justify-between">
              <p className="text-[0.65rem] leading-snug font-bold tracking-widest uppercase">{t.gift.card}</p>
              <Monogram id="gift-monogram" tone="gold" className="h-11 w-auto" />
            </div>
            <p className="mt-6 text-3xl font-extrabold">$ ___</p>
            <p className="mt-3 border-b border-[#263238]/20 pb-1 text-[0.65rem] text-[#546e7a]">{t.gift.cardFrom}</p>
            <p className="mt-2 border-b border-[#263238]/20 pb-1 text-[0.65rem] text-[#546e7a]">{t.gift.cardTo}</p>
          </div>
        </div>

        {/* Policy */}
        <div className={bento('lilac', 'lg:col-span-4')}>
          <p className="text-xs font-bold tracking-wide text-muted uppercase">{t.policy.eyebrow}</p>
          <h3 className="mt-2 text-3xl font-extrabold tracking-[-0.03em]">{t.policy.title}</h3>
          <details className="group mt-4">
            <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-sm font-semibold dark:bg-white/10 [&::-webkit-details-marker]:hidden">
              {t.visit.policy}
              <ArrowDown aria-hidden className="size-4 transition-transform group-open:rotate-180" />
            </summary>
            <ol className="mt-4 space-y-2 text-sm">
              {t.policy.items.map((item, index) => (
                <li key={item} className="flex gap-3">
                  <span className="font-mono text-xs leading-6 text-muted">{String(index + 1).padStart(2, '0')}</span>
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ol>
          </details>
          <p className="mt-5 text-sm font-semibold">{t.policy.thanks}</p>
        </div>
      </div>
    </section>
  );
}

function InfoRow({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-white/70 px-4 py-3 dark:bg-white/10">
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div>
        <dt className="text-xs text-muted">{label}</dt>
        <dd className="mt-0.5">{children}</dd>
      </div>
    </div>
  );
}
