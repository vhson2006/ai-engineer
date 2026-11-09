import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, ArrowUpRight, MessageCircle } from 'lucide-react';
import { format } from '@web/core/i18n/format';
import { Container, buttonVariants, cn } from '@web/ui';
import { Reveal } from '@web/ui/reveal';
import { profile } from '@/content/profile';
import { findProject, projects, sourceUrl } from '@/content/projects';
import { inkLink, SectionHeading } from '@/features/editorial/section-heading';
import { BrowserFrame, PhoneFrame } from '@/features/projects/device-frames';
import { href } from '@/i18n/locales';
import { getLocale, getMessages } from '@/i18n/messages';
import { publicPageMetadata } from '@/seo';

/** One case study per sample site, prerendered for every language. */
export function generateStaticParams() {
  return projects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({ params }: PageProps<'/[lang]/projects/[slug]'>): Promise<Metadata> {
  const [{ slug }, t, locale] = await Promise.all([params, getMessages(), getLocale()]);
  const project = findProject(slug);
  if (!project) return {};
  const text = t.projects.items[project.slug];
  return publicPageMetadata({ t, locale, path: `/projects/${project.slug}`, title: text.name, description: text.summary });
}

export default async function ProjectPage({ params }: PageProps<'/[lang]/projects/[slug]'>) {
  const [{ slug }, t, locale] = await Promise.all([params, getMessages(), getLocale()]);
  const project = findProject(slug);
  if (!project) notFound();
  const text = t.projects.items[project.slug];
  const next = projects[(projects.indexOf(project) + 1) % projects.length];

  return (
    <>
      <Container className="pt-10 pb-16 sm:pt-14">
        <Link href={`${href(locale, '/')}#samples`} className={`${inkLink} text-sm`}>
          <ArrowLeft aria-hidden className="size-4 transition-transform group-hover:-translate-x-1" />
          {t.projects.back}
        </Link>

        <SectionHeading as="h1" className="mt-10" eyebrow={`${t.projects.eyebrow} · ${text.category}`} title={text.name} />
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-3xl">
            <p className="font-mono text-xs tracking-wide text-subtle">{text.kind}</p>
            <p className="mt-4 text-xl leading-relaxed text-pretty text-muted">{text.summary}</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            {project.demoUrl && (
              <a href={project.demoUrl} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants(), 'rounded-full')}>
                {t.projects.liveDemo}
                <ArrowUpRight aria-hidden />
              </a>
            )}
            <a href={sourceUrl(project)} target="_blank" rel="noopener noreferrer" className={inkLink}>
              {t.projects.viewCode}
              <ArrowUpRight aria-hidden className="size-4" />
            </a>
          </div>
        </div>
        <p className="mt-6 font-mono text-[11px] tracking-widest text-subtle uppercase">{t.projects.sample}</p>

        <div className="relative mt-12">
          <BrowserFrame
            image={project.desktop}
            alt={format(t.projects.desktopAlt, { name: text.name })}
            url={project.demoUrl?.replace(/^https?:\/\//, '') ?? project.source}
            sizes="(min-width: 1152px) 1100px, 94vw"
            priority
            className="lg:mr-28"
          />
          <PhoneFrame
            image={project.mobile}
            alt={format(t.projects.mobileAlt, { name: text.name })}
            sizes="240px"
            className="absolute right-0 -bottom-8 hidden w-56 lg:block"
          />
        </div>
      </Container>

      <Container className="grid gap-16 py-16 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-16">
          <Reveal>
            <section>
              <h2 className="border-t border-fg pt-5 font-display text-3xl font-medium tracking-tight">{t.projects.brief}</h2>
              <p className="mt-5 text-lg leading-relaxed text-muted">{text.brief}</p>
            </section>
          </Reveal>
          <Reveal>
            <section>
              <h2 className="border-t border-fg pt-5 font-display text-3xl font-medium tracking-tight">{t.projects.built}</h2>
              <ol className="mt-6">
                {text.features.map((feature, index) => (
                  <li key={feature} className="flex gap-4 border-t border-border py-4 first:border-t-0">
                    <span className="font-mono text-xs text-brand">{String(index + 1).padStart(2, '0')}</span>
                    <span className="leading-relaxed">{feature}</span>
                  </li>
                ))}
              </ol>
            </section>
          </Reveal>
          <Reveal>
            <section>
              <h2 className="border-t border-fg pt-5 font-display text-3xl font-medium tracking-tight">{t.projects.decisions}</h2>
              <ul className="mt-6 space-y-4">
                {text.decisions.map((decision) => (
                  <li key={decision} className="border-l-2 border-brand pl-4 leading-relaxed text-muted">
                    {decision}
                  </li>
                ))}
              </ul>
            </section>
          </Reveal>
        </div>

        <aside className="space-y-10 lg:sticky lg:top-24 lg:self-start">
          <section className="border-t border-fg pt-5">
            <h2 className="font-mono text-xs tracking-widest text-subtle uppercase">{t.projects.stack}</h2>
            <p className="mt-4 font-display text-xl leading-relaxed tracking-tight">{project.stack.join(' / ')}</p>
            <p className="mt-3 font-mono text-xs text-subtle">{project.source}</p>
          </section>
          <section className="lg:hidden">
            <h2 className="font-mono text-xs tracking-widest text-subtle uppercase">{t.projects.screens}</h2>
            <PhoneFrame image={project.mobile} alt={format(t.projects.mobileAlt, { name: text.name })} sizes="240px" className="mt-4 w-52" />
          </section>
          <section className="bg-fg p-7 text-bg">
            <h2 className="font-display text-2xl leading-snug font-medium">{t.projects.ctaTitle}</h2>
            <p className="mt-3 text-sm leading-relaxed opacity-75">{t.projects.ctaText}</p>
            <a
              href={profile.contact.zaloHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-bg px-5 py-2.5 text-sm font-semibold text-fg transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
            >
              <MessageCircle aria-hidden className="size-4" />
              {t.services.cta}
            </a>
          </section>
          <Link
            href={href(locale, `/projects/${next.slug}`)}
            className="group block border-t border-fg pt-5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
          >
            <span className="block font-mono text-xs tracking-widest text-subtle uppercase">{t.projects.next}</span>
            <span className="mt-3 flex items-center justify-between gap-4 font-display text-3xl font-medium tracking-tight transition-colors group-hover:text-brand">
              {t.projects.items[next.slug].name}
              <ArrowRight aria-hidden className="size-6 shrink-0 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        </aside>
      </Container>
    </>
  );
}
