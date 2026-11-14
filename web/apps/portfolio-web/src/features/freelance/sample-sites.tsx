import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { format } from '@web/core/i18n/format';
import { Container } from '@web/ui';
import { projects, type Project, type ProjectGroup } from '@/content/projects';
import { SectionHeading } from '@/features/editorial/section-heading';
import { href, type Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages';

/**
 * Freelancer page: the sample websites in two groups, the sites built from real businesses and the
 * industry templates on the same kit, in the same grid. Each card opens its case study. Its own band (id="samples") so it reads apart from the offer above it. Server-rendered.
 */
export function SampleSites({ t, locale }: { t: Messages; locale: Locale }) {
  const w = t.home.work;
  const group = (name: ProjectGroup) => projects.filter((p) => p.group === name);
  return (
    <section id="samples" className="scroll-mt-16 bg-surface-2">
      <Container className="py-16 sm:py-20">
        <SectionHeading
          eyebrow={w.sitesEyebrow}
          title={w.sitesTitle}
          aside={<p className="max-w-sm text-sm leading-relaxed text-muted">{w.sitesIntro}</p>}
        />

        <Group title={w.realTitle} intro={w.realIntro}>
          <Grid projects={group('business')} t={t} locale={locale} label={w.sample} />
        </Group>

        <Group title={w.templatesTitle} intro={w.templatesIntro}>
          <Grid projects={group('template')} t={t} locale={locale} label={w.template} />
        </Group>
      </Container>
    </section>
  );
}

function Group({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return (
    <div className="mt-12">
      <div className="mb-8 flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 border-t border-fg pt-5">
        <h3 className="font-display text-2xl font-medium tracking-tight">{title}</h3>
        <p className="max-w-xl text-sm leading-relaxed text-muted">{intro}</p>
      </div>
      {children}
    </div>
  );
}

function Grid({ projects: list, t, locale, label }: { projects: Project[]; t: Messages; locale: Locale; label: string }) {
  return (
    <ul className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
      {list.map((p) => (
        <li key={p.slug}>
          <Card project={p} t={t} locale={locale} label={label} />
        </li>
      ))}
    </ul>
  );
}

function Card({ project, t, locale, label }: { project: Project; t: Messages; locale: Locale; label: string }) {
  const text = t.projects.items[project.slug];
  return (
    <article className="group relative">
      <div className="relative aspect-[16/10] overflow-hidden rounded-sm bg-bg shadow-sm ring-1 ring-border">
        <Image
          src={project.desktop}
          alt={format(t.projects.desktopAlt, { name: text.name })}
          sizes="(min-width: 1024px) 370px, (min-width: 640px) 46vw, 92vw"
          className="size-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-[1.04]"
        />
        <span className="absolute top-4 left-4 inline-flex items-center gap-2 rounded-full bg-bg/90 px-3 py-1.5 font-mono text-[11px] tracking-widest text-fg uppercase shadow-sm backdrop-blur">
          {/* The site's own brand colour (content data), as a swatch. */}
          <span aria-hidden className="size-2 rounded-full" style={{ background: project.accent }} />
          {text.category}
        </span>
      </div>
      <div className="mt-5 flex items-start justify-between gap-4">
        <div>
          <h4 className="font-display text-2xl font-medium tracking-tight">
            {/* The whole card is clickable through this link (stretched). */}
            <Link
              href={href(locale, `/projects/${project.slug}`)}
              className="after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
            >
              {text.name}
            </Link>
          </h4>
          <p className="mt-1 text-sm text-subtle">
            {text.kind}
            <span className="ml-2 font-mono text-[10px] tracking-widest uppercase">{label}</span>
          </p>
        </div>
        <ArrowUpRight
          aria-hidden
          className="mt-2 size-6 shrink-0 text-subtle transition-[color,translate] duration-300 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-brand"
        />
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted">{text.summary}</p>
    </article>
  );
}
