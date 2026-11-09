import Link from 'next/link';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { REPOSITORY_URL } from '@/content/projects';
import { inkLink, SectionHeading } from '@/features/editorial/section-heading';
import { href, type Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages';
import { ACCOUNT_ENABLED } from '@/site';

/** Resume page, before the experience: the platform behind this site (id="work"). */
export function SelectedWork({ t, locale, index }: { t: Messages; locale: Locale; index: number }) {
  const w = t.home.work;
  const p = t.profile.project;
  return (
    <section id="work" className="scroll-mt-20">
      <SectionHeading index={index} title={w.title} />

      <article className="mt-14 grid gap-10 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <p className="font-mono text-xs tracking-widest text-brand uppercase">{w.platformLabel}</p>
          <h3 className="mt-3 font-display text-3xl font-medium tracking-tight text-balance sm:text-4xl">{p.name}</h3>
          <p className="mt-5 leading-relaxed text-muted">{p.summary}</p>
          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
            <a href={REPOSITORY_URL} target="_blank" rel="noopener noreferrer" className={inkLink}>
              {w.viewCode}
              <ArrowUpRight aria-hidden className="size-4" />
            </a>
            {ACCOUNT_ENABLED && (
              <Link href={href(locale, '/dashboard')} className={inkLink}>
                {t.home.project.openDashboard}
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            )}
          </div>
        </div>
        <ol className="grid gap-x-10 sm:grid-cols-2">
          {p.points.map((point, i) => (
            <li key={point} className="flex gap-4 border-t border-border py-5">
              <span className="font-mono text-xs text-brand">{String(i + 1).padStart(2, '0')}</span>
              <span className="text-sm leading-relaxed">{point}</span>
            </li>
          ))}
        </ol>
      </article>

    </section>
  );
}
