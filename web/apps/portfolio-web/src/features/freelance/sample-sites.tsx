import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { format } from '@web/core/i18n/format';
import { Container } from '@web/ui';
import { projects } from '@/content/projects';
import { SectionHeading } from '@/features/editorial/section-heading';
import { href, type Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages';

/**
 * Freelancer page: the sample websites as a grid of cards, each labelled with its industry.
 * Its own band (id="samples") so it reads apart from the offer above it. Server-rendered only.
 */
export function SampleSites({ t, locale }: { t: Messages; locale: Locale }) {
  const w = t.home.work;
  return (
    <section id="samples" className="scroll-mt-16 bg-surface-2">
      <Container className="py-16 sm:py-20">
        <SectionHeading
          eyebrow={w.sitesEyebrow}
          title={w.sitesTitle}
          aside={<p className="max-w-sm text-sm leading-relaxed text-muted">{w.sitesIntro}</p>}
        />
        <ul className="mt-12 grid gap-x-8 gap-y-14 md:grid-cols-2">
          {projects.map((project) => {
            const text = t.projects.items[project.slug];
            const caseStudy = href(locale, `/projects/${project.slug}`);
            return (
              <li key={project.slug}>
                <article className="group relative">
                  <div className="relative aspect-[16/10] overflow-hidden rounded-sm bg-bg shadow-sm ring-1 ring-border">
                    <Image
                      src={project.desktop}
                      alt={format(t.projects.desktopAlt, { name: text.name })}
                      sizes="(min-width: 768px) 560px, 92vw"
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
                      <h3 className="font-display text-3xl font-medium tracking-tight">
                        {/* The whole card is clickable through this link (stretched). */}
                        <Link
                          href={caseStudy}
                          className="after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
                        >
                          {text.name}
                        </Link>
                      </h3>
                      <p className="mt-1 text-sm text-subtle">
                        {text.kind}
                        <span className="ml-2 font-mono text-[10px] tracking-widest uppercase">{w.sample}</span>
                      </p>
                    </div>
                    <ArrowUpRight
                      aria-hidden
                      className="mt-2 size-6 shrink-0 text-subtle transition-[color,translate] duration-300 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-brand"
                    />
                  </div>
                  <p className="mt-3 max-w-lg leading-relaxed text-muted">{text.summary}</p>
                </article>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
