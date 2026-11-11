import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Award,
  CalendarDays,
  Flame,
  FlaskConical,
  Globe,
  Handshake,
  type LucideIcon,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  ShieldAlert,
  ShieldCheck,
  Wine,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { format } from '@web/core/i18n/format';
import { Container, buttonVariants, cn, richText } from '@web/ui';
import { Reveal } from '@web/ui/reveal';
import { LegalNotice } from '@/components/legal-notice';
import { Seal } from '@/components/logo';
import { Eyebrow, SectionHeading } from '@/components/section-heading';
import { ArticleGrid } from '@/features/articles/article-card';
import { articlePaths, listArticles } from '@/features/articles/data';
import { bottled, featured, jars, ruouCan, signatureBrands, winery } from '@/content/winery';
import { href, type Locale } from '@/i18n/locales';
import { getLocale, getMessages, type Messages } from '@/i18n/messages';
import { formatVnd } from '@/lib/format';
import cabinet from '../../../public/images/cabinet.jpg';
import displayJars from '../../../public/images/display-jars.jpg';
import factory from '../../../public/images/factory.jpg';
import ruouCanImage from '../../../public/images/ruou-can.jpg';
import showroom from '../../../public/images/showroom.jpg';
import storefront from '../../../public/images/storefront.jpg';
import towerRack from '../../../public/images/tower-rack.jpg';

const TRUST_ICONS: Record<keyof Messages['trust']['items'], LucideIcon> = {
  since: CalendarDays,
  trademark: Award,
  quality: FlaskConical,
  partners: Handshake,
};

const pill = (variant: 'primary' | 'secondary' = 'primary') => cn(buttonVariants({ variant, size: 'lg' }), 'rounded-full px-7');
const goldPill = cn(
  buttonVariants({ size: 'lg' }),
  'rounded-full bg-gradient-to-r from-[#e0a92e] via-[#ffe28a] to-[#d39a22] px-7 text-[#3f0a0d] shadow-lg shadow-black/25 hover:brightness-105',
);

type Ctx = { t: Messages; locale: Locale };

/** One landing page, prerendered per language. Facts: src/content/winery.ts. */
export default async function HomePage() {
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  const ctx: Ctx = { t, locale };
  return (
    <>
      <Hero {...ctx} />
      <TrustStrip {...ctx} />
      <Reveal>
        <Featured {...ctx} />
      </Reveal>
      <Reveal>
        <Jars {...ctx} />
      </Reveal>
      <Reveal>
        <Range {...ctx} />
      </Reveal>
      <Reveal>
        <Serving {...ctx} />
      </Reveal>
      <Reveal>
        <Counterfeit {...ctx} />
      </Reveal>
      <Reveal>
        <Partners {...ctx} />
      </Reveal>
      <Reveal>
        <About {...ctx} />
      </Reveal>
      <Reveal>
        <LatestArticles {...ctx} />
      </Reveal>
      <Reveal>
        <Contact {...ctx} />
      </Reveal>
    </>
  );
}

/* ─────────────────────────────── Hero ─────────────────────────────── */

function Hero({ t }: Ctx) {
  return (
    <section className="relative isolate overflow-hidden bg-deep text-white">
      <Image src={showroom} alt={t.hero.imageAlt} priority placeholder="blur" sizes="100vw" className="absolute inset-0 -z-20 size-full object-cover" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-deep via-deep/90 to-deep/30" />
      <Container className="py-20 sm:py-28 lg:py-32">
        <div className="max-w-2xl">
          <Eyebrow tone="light" align="left">
            {t.hero.eyebrow}
          </Eyebrow>
          <h1 className="mt-6 font-display leading-none font-extrabold tracking-tight">
            <span className="text-gold-foil block text-6xl uppercase italic sm:text-7xl lg:text-8xl">{t.hero.title}</span>
            <span className="mt-4 block text-3xl font-semibold text-balance text-white sm:text-4xl">{t.hero.titleAccent}</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-pretty text-white/80">{t.hero.text}</p>

          <ul className="mt-8 flex flex-wrap gap-3 text-sm font-semibold">
            <li className="inline-flex items-center gap-2 rounded-full border border-gold/60 bg-black/20 px-4 py-2 text-gold-light backdrop-blur">
              <Award aria-hidden className="size-4" />
              {t.brand.trademark}
            </li>
            <li className="inline-flex items-center gap-2 rounded-full border border-gold/60 bg-black/20 px-4 py-2 text-gold-light backdrop-blur">
              <ShieldCheck aria-hidden className="size-4" />
              {t.brand.premium}
            </li>
          </ul>

          <div className="mt-9 flex flex-wrap gap-3">
            <a href={winery.orderPhone.href} className={goldPill}>
              <Phone aria-hidden />
              {format(t.common.call, { phone: winery.orderPhone.display })}
            </a>
            <a href="#products" className={cn(pill('secondary'), 'border-white/30 bg-white/5 text-white backdrop-blur hover:bg-white/15')}>
              <Wine aria-hidden />
              {t.common.viewProducts}
            </a>
          </div>
          <LegalNotice tone="light" className="mt-8" />
        </div>
      </Container>
      <div className="absolute right-8 bottom-8 hidden flex-col items-center gap-2 lg:flex" aria-hidden>
        <Seal className="size-24 rotate-[-6deg] drop-shadow-2xl" />
        <span className="font-display text-sm font-bold tracking-[0.3em] text-gold-light uppercase italic">Since {winery.since}</span>
      </div>
    </section>
  );
}

/* ─────────────────────────────── Trust ─────────────────────────────── */

function TrustStrip({ t }: Ctx) {
  const items = Object.entries(t.trust.items) as [keyof Messages['trust']['items'], { title: string; text: string }][];
  return (
    <div className="bg-yellow text-[#3f0a0d]">
      <Container>
        <ul aria-label={t.trust.label} className="grid sm:grid-cols-2 lg:grid-cols-4">
          {items.map(([id, item]) => {
            const Icon = TRUST_ICONS[id];
            return (
              <li key={id} className="flex gap-4 px-2 py-8 sm:px-5">
                <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-[#b3141c] text-[#ffe500] shadow-md">
                  <Icon aria-hidden className="size-5" />
                </span>
                <div>
                  <h2 className="font-display text-xl font-bold text-[#a3121a]">{item.title}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-[#5a2a1c]">{item.text}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </Container>
    </div>
  );
}

/* ─────────────────────────────── Featured products ─────────────────────────────── */

function Featured({ t }: Ctx) {
  const groups = [
    { id: 'bottles', title: t.featured.bottles, items: featured.filter((item) => item.kind === 'bottle'), cols: 'sm:grid-cols-3' },
    { id: 'cans', title: t.featured.cans, items: featured.filter((item) => item.kind === 'can'), cols: 'grid-cols-2 lg:grid-cols-4' },
  ];
  return (
    <section id="products" className="py-20 sm:py-28">
      <Container>
        <SectionHeading eyebrow={t.featured.eyebrow} title={t.featured.title} intro={t.featured.intro} />
        <div className="mt-14 space-y-12">
          {groups.map((group) => (
            <div key={group.id}>
              <h3 className="flex items-center gap-4 font-display text-2xl font-bold text-brand-strong">
                {group.title}
                <span aria-hidden className="h-px flex-1 bg-border" />
              </h3>
              <ul className={cn('mt-6 grid gap-5', group.cols)}>
                {group.items.map((product) => (
                  <li key={product.id} className="group flex flex-col overflow-hidden rounded-[1.75rem] border border-border bg-surface transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-brand/10">
                    <div className="flex h-64 items-end justify-center bg-yellow px-6 pt-6">
                      <Image
                        src={product.image}
                        alt={product.name}
                        placeholder="blur"
                        sizes="240px"
                        className="h-full w-auto object-contain transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <div className="flex-1 border-t-4 border-brand p-5">
                      <p className="font-display text-xl font-bold text-brand-strong">{product.name}</p>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted">{t.featured.items[product.id]}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* ─────────────────────────────── Showroom jars ─────────────────────────────── */

function Jars({ t, locale }: Ctx) {
  return (
    <section className="bg-surface-2 py-20 sm:py-28">
      <Container className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div className="relative mx-auto w-full max-w-md">
          <div aria-hidden className="absolute -inset-3 rotate-3 rounded-[2rem] bg-brand" />
          <Image src={displayJars} alt={t.jars.imageAlt} placeholder="blur" sizes="(min-width: 1024px) 440px, 90vw" className="relative aspect-[3/4] w-full rounded-[2rem] object-cover shadow-2xl" />
        </div>
        <div>
          <SectionHeading align="left" eyebrow={t.jars.eyebrow} title={t.jars.title} intro={t.jars.intro} />
          <ul className="mt-10 space-y-4">
            {jars.map((jar) => (
              <li key={jar.id} className="frame-ornate flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-surface px-6 py-5">
                <div>
                  <p className="font-display text-2xl font-bold text-brand-strong">{jar.name}</p>
                  <p className="mt-0.5 text-sm text-muted">{t.jars.items[jar.id]}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold tracking-[0.18em] text-gold-text uppercase">{t.jars.price}</p>
                  <p className="font-display text-2xl font-bold whitespace-nowrap text-brand-strong">
                    {formatVnd(locale, jar.pricePerXi)} <span className="text-base font-semibold text-muted">{t.common.perXi}</span>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}

/* ─────────────────────────────── Range ─────────────────────────────── */

function Range({ t }: Ctx) {
  return (
    <section id="range" className="py-20 sm:py-28">
      <Container>
        <SectionHeading eyebrow={t.range.eyebrow} title={t.range.title} intro={t.range.intro} />
        <div className="mt-14 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-[2rem] border border-border bg-surface p-7 sm:p-9">
            <h3 className="font-display text-2xl font-bold text-brand-strong">{t.range.signatureTitle}</h3>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {signatureBrands.map((name) => (
                <li key={name} className="frame-ornate rounded-xl bg-surface px-4 py-3 text-center font-display text-lg font-semibold text-brand-strong">
                  {name}
                </li>
              ))}
            </ul>
          </div>
          <div className="lattice flex flex-col rounded-[2rem] bg-brand p-7 text-white sm:p-9">
            <h3 className="font-display text-2xl font-bold text-yellow">{t.range.bottledTitle}</h3>
            <ul className="mt-6 flex flex-wrap gap-2.5">
              {bottled.map((name) => (
                <li key={name} className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold ring-1 ring-white/25">
                  {name}
                </li>
              ))}
            </ul>
            <p className="mt-auto pt-8 text-sm leading-relaxed text-white/80">{t.range.ingredientsNote}</p>
          </div>
        </div>
      </Container>
    </section>
  );
}

/* ─────────────────────────────── Serving ─────────────────────────────── */

function Serving({ t }: Ctx) {
  return (
    <section className="bg-surface-2 py-20 sm:py-28">
      <Container>
        <SectionHeading eyebrow={t.serving.eyebrow} title={`${t.serving.hapNong.title} · ${t.serving.ruouCan.title}`} />
        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          <article className="rounded-[2rem] border border-border bg-surface p-7 sm:p-9">
            <span className="inline-flex size-14 items-center justify-center rounded-full bg-brand text-yellow">
              <Flame aria-hidden className="size-6" />
            </span>
            <h3 className="mt-5 font-display text-3xl font-bold text-brand-strong">{t.serving.hapNong.title}</h3>
            <p className="mt-2 text-muted">{t.serving.hapNong.text}</p>
            <ol className="mt-6 space-y-4">
              {t.serving.hapNong.steps.map((step, index) => (
                <li key={step} className="flex gap-4">
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-brand font-display font-bold text-brand-strong">
                    {index + 1}
                  </span>
                  <span className="pt-1.5 leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </article>
          <article className="flex flex-col overflow-hidden rounded-[2rem] border border-border bg-surface">
            <div className="bg-[#f3dccb] px-4 pt-4">
              <Image src={ruouCanImage} alt={t.serving.ruouCan.imageAlt} placeholder="blur" sizes="(min-width: 1024px) 560px, 100vw" className="w-full" />
            </div>
            <div className="p-7 sm:p-9">
              <h3 className="font-display text-3xl font-bold text-brand-strong">{t.serving.ruouCan.title}</h3>
              <p className="mt-2 leading-relaxed text-muted">{t.serving.ruouCan.text}</p>
              <p className="mt-6 text-xs font-bold tracking-[0.18em] text-gold-text uppercase">{t.serving.ruouCan.styles}</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {ruouCan.map((style) => (
                  <li key={style} className="rounded-full bg-brand-soft px-4 py-1.5 text-sm font-semibold text-brand-soft-fg">
                    {style}
                  </li>
                ))}
              </ul>
            </div>
          </article>
        </div>
      </Container>
    </section>
  );
}

/* ─────────────────────────────── Anti-counterfeit ─────────────────────────────── */

function Counterfeit({ t }: Ctx) {
  return (
    <section className="py-12">
      <Container>
        <div className="flex flex-col items-start gap-6 rounded-[2rem] border-2 border-dashed border-brand bg-brand-soft p-7 sm:flex-row sm:items-center sm:p-9">
          <span className="inline-flex size-16 shrink-0 items-center justify-center rounded-2xl bg-brand text-yellow">
            <ShieldAlert aria-hidden className="size-8" />
          </span>
          <div className="flex-1">
            <h2 className="font-display text-3xl font-bold text-brand-strong">{t.counterfeit.title}</h2>
            <p className="mt-2 leading-relaxed text-fg">
              {richText(t.counterfeit.text, {
                phone: (
                  <a href={winery.orderPhone.href} className="font-bold whitespace-nowrap text-brand-strong underline underline-offset-4">
                    {winery.orderPhone.display}
                  </a>
                ),
              })}
            </p>
          </div>
          <a href={winery.orderPhone.href} className={pill()}>
            <Phone aria-hidden />
            {winery.orderPhone.display}
          </a>
        </div>
      </Container>
    </section>
  );
}

/* ─────────────────────────────── Partners ─────────────────────────────── */

function Partners({ t }: Ctx) {
  const items = [
    { id: 'tower' as const, image: towerRack },
    { id: 'cabinet' as const, image: cabinet },
  ];
  return (
    <section id="partners" className="lattice bg-deep py-20 text-white sm:py-28">
      <Container className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <div>
          <SectionHeading align="left" tone="light" eyebrow={t.partners.eyebrow} title={t.partners.title} intro={t.partners.intro} />
          <a href={winery.phones[1].href} className={cn(goldPill, 'mt-9')}>
            <Phone aria-hidden />
            {t.partners.cta}
          </a>
        </div>
        <ul className="grid grid-cols-2 gap-5">
          {items.map((item) => {
            const text = t.partners.items[item.id];
            return (
              <li key={item.id} className="overflow-hidden rounded-[1.75rem] bg-white/5 ring-1 ring-white/15">
                <div className="flex h-56 items-center justify-center bg-[#f3dccb] p-4">
                  <Image src={item.image} alt={text.imageAlt} placeholder="blur" sizes="200px" className="h-full w-auto object-contain" />
                </div>
                <div className="p-5">
                  <p className="font-display text-xl font-bold text-gold-light">{text.title}</p>
                  <p className="mt-1 text-sm text-white/75">{text.text}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}

/* ─────────────────────────────── About ─────────────────────────────── */

function About({ t }: Ctx) {
  return (
    <section id="about" className="py-20 sm:py-28">
      <Container>
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <SectionHeading align="left" eyebrow={t.about.eyebrow} title={t.about.title} intro={t.about.text} />
          <ul className="grid gap-3">
            {t.about.departments.map((department) => (
              <li key={department} className="frame-ornate flex items-center gap-3 rounded-2xl bg-surface px-5 py-4 font-semibold text-brand-strong">
                <FlaskConical aria-hidden className="size-5 shrink-0 text-gold-text" />
                {department}
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-12 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
          <Image src={storefront} alt={t.about.storefrontAlt} placeholder="blur" sizes="(min-width: 1024px) 700px, 100vw" className="h-56 w-full rounded-[1.75rem] object-cover sm:h-72" />
          <Image src={factory} alt={t.about.factoryAlt} placeholder="blur" sizes="(min-width: 1024px) 450px, 100vw" className="h-56 w-full rounded-[1.75rem] object-cover sm:h-72" />
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
    <section id="articles" className="bg-surface-2 py-20 sm:py-28">
      <Container>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading align="left" eyebrow={t.articles.eyebrow} title={t.articles.latest} intro={t.articles.latestIntro} />
          <Link href={href(locale, articlePaths.index)} className={cn(pill('secondary'), 'shrink-0 self-start sm:self-auto')}>
            {t.articles.viewAll}
            <ArrowRight aria-hidden />
          </Link>
        </div>
        <div className="mt-14">
          <ArticleGrid articles={articles} locale={locale} t={t} />
        </div>
      </Container>
    </section>
  );
}

/* ─────────────────────────────── Contact ─────────────────────────────── */

function Contact({ t }: Ctx) {
  return (
    <section id="contact" className="pb-20 sm:pb-28">
      <Container>
        <div className="grid overflow-hidden rounded-[2.5rem] border border-border bg-surface lg:grid-cols-[1.1fr_1fr]">
          <div className="p-8 sm:p-12">
            <SectionHeading align="left" eyebrow={t.contact.eyebrow} title={t.contact.title} intro={t.contact.text} />
            <dl className="mt-10 space-y-6">
              <InfoRow icon={MapPin} label={t.contact.address}>
                {winery.addressLines.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </InfoRow>
              <InfoRow icon={Globe} label={t.contact.online}>
                <a href={winery.website.href} className="block hover:text-brand-strong hover:underline">
                  {winery.website.display}
                </a>
                <a href={winery.zalo.href} target="_blank" rel="noopener noreferrer" className="block hover:text-brand-strong hover:underline">
                  Zalo {winery.zalo.display}
                </a>
              </InfoRow>
            </dl>
            <div className="mt-10 flex flex-wrap gap-3">
              <a href={winery.zalo.href} target="_blank" rel="noopener noreferrer" className={pill('secondary')}>
                <MessageCircle aria-hidden />
                {t.common.zalo}
              </a>
              <a href={winery.mapsHref} target="_blank" rel="noopener noreferrer" className={pill('secondary')}>
                <Navigation aria-hidden />
                {t.common.directions}
              </a>
            </div>
          </div>

          <div className="lattice flex flex-col bg-brand p-8 text-white sm:p-12">
            <h3 className="flex items-center gap-2 font-display text-3xl font-bold text-yellow">
              <Phone aria-hidden className="size-6" />
              {t.contact.phone}
            </h3>
            <dl className="mt-6 divide-y divide-white/15">
              {winery.phones.map((phone) => (
                <div key={phone.id} className="flex flex-wrap items-center justify-between gap-2 py-4">
                  <dt className="text-sm text-white/80">{t.contact.phones[phone.id]}</dt>
                  <dd>
                    <a href={phone.href} className={cn('font-display text-2xl font-bold hover:underline', phone.id === 'order' ? 'text-yellow' : 'text-white')}>
                      {phone.display}
                    </a>
                  </dd>
                </div>
              ))}
            </dl>
            <LegalNotice tone="light" className="mt-auto pt-8" />
          </div>
        </div>
      </Container>
    </section>
  );
}

function InfoRow({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-4">
      <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-strong">
        <Icon aria-hidden className="size-5" />
      </span>
      <div>
        <dt className="text-xs font-bold tracking-[0.18em] text-gold-text uppercase">{label}</dt>
        <dd className="mt-1 leading-relaxed">{children}</dd>
      </div>
    </div>
  );
}
