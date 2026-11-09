import type { Metadata } from 'next';
import { Container } from '@web/ui';
import { Reveal } from '@web/ui/reveal';
import { format } from '@web/core/i18n/format';
import { profile } from '@/content/profile';
import { getLocale, getMessages } from '@/i18n/messages';
import { JsonLd } from '@/components/json-ld';
import { inkLink, SectionHeading } from '@/features/editorial/section-heading';
import { SelectedWork } from '@/features/resume/selected-work';
import { publicPageMetadata, structuredData } from '@/seo';
import { BUILT_AT } from '@/site';

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  return publicPageMetadata({
    t,
    locale,
    path: '/about',
    title: t.about.title,
    description: format(t.about.description, { name: profile.name, role: t.profile.role }),
    type: 'profile',
  });
}

/** The Resume page (menu: Resume): bio, selected work, experience, skills, education. Fully static per language. */
export default async function AboutPage() {
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  const p = t.profile;
  return (
    <Container className="pt-12 pb-24 sm:pt-20">
      <JsonLd data={structuredData(t, locale, { path: '/about', profilePage: { name: t.about.title, modified: BUILT_AT } })} />

      <SectionHeading as="h1" eyebrow={t.about.eyebrow} title={format(t.about.hello, { name: profile.name })} />

      <div className="mt-14 grid gap-14 lg:grid-cols-[1fr_18rem]">
        <div className="space-y-6 text-lg leading-relaxed text-pretty text-muted">
          {p.bio.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>

        <aside className="self-start lg:sticky lg:top-24">
          <dl className="divide-y divide-border border-y border-fg text-sm">
            {p.personal.map((item) => (
              <div key={item.label} className="py-3">
                <dt className="font-mono text-[11px] tracking-widest text-subtle uppercase">{item.label}</dt>
                <dd className="mt-1 font-medium">{item.value}</dd>
              </div>
            ))}
            <div className="py-3">
              <dt className="font-mono text-[11px] tracking-widest text-subtle uppercase">{t.about.contact}</dt>
              <dd className="mt-2 flex flex-col items-start gap-2">
                <a className={inkLink} href={`mailto:${profile.contact.email}`}>
                  {profile.contact.email}
                </a>
                <a className={inkLink} href={profile.contact.phoneHref}>
                  {profile.contact.phone}
                </a>
                {profile.contact.links.map((link) => (
                  <a key={link.href} className={inkLink} href={link.href} target="_blank" rel="noopener noreferrer">
                    {link.label}
                  </a>
                ))}
              </dd>
            </div>
          </dl>
        </aside>
      </div>

      <Reveal>
        <div className="mt-24">
          <SelectedWork t={t} locale={locale} index={1} />
        </div>
      </Reveal>

      {p.experience.length > 0 && (
        <Reveal>
          <section className="mt-24">
            <SectionHeading index={2} title={t.about.experience} />
            <ol className="mt-12">
              {p.experience.map((job) => (
                <li key={`${job.period}-${job.company}`} className="grid gap-x-10 gap-y-3 border-t border-border py-8 lg:grid-cols-[14rem_1fr]">
                  <div>
                    <p className="font-mono text-xs text-subtle">{job.period}</p>
                    <h3 className="mt-2 font-display text-2xl font-medium tracking-tight">{job.company}</h3>
                    <p className="text-sm text-muted">{job.title}</p>
                  </div>
                  <div>
                    <p className="leading-relaxed">{job.text}</p>
                    {job.achievements.length > 0 && (
                      <div className="mt-4">
                        <h4 className="sr-only">{t.about.achievements}</h4>
                        <ul className="space-y-2">
                          {job.achievements.map((item) => (
                            <li key={item} className="flex gap-3 text-sm leading-relaxed text-muted">
                              <span aria-hidden className="mt-2.5 h-px w-4 shrink-0 bg-brand" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {job.stack.length > 0 && (
                      <p className="mt-4 font-mono text-xs text-subtle">
                        <span className="sr-only">{t.about.stack}: </span>
                        {job.stack.join(' · ')}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </Reveal>
      )}

      <Reveal>
        <section id="skills" className="mt-24 scroll-mt-20">
          <SectionHeading index={3} title={t.about.skills} />
          <dl className="mt-12">
            {p.skills.map((group) => (
              <div key={group.group} className="grid gap-x-10 gap-y-2 border-t border-border py-6 lg:grid-cols-[14rem_1fr]">
                <dt className="font-mono text-xs tracking-widest text-subtle uppercase">{group.group}</dt>
                <dd className="font-display text-xl leading-relaxed tracking-tight">{group.items.join(' / ')}</dd>
              </div>
            ))}
          </dl>
        </section>
      </Reveal>

      {p.education.length > 0 && (
        <Reveal>
          <section className="mt-24">
            <SectionHeading index={4} title={t.about.education} />
            <ul className="mt-12">
              {p.education.map((item) => (
                <li key={item.title} className="border-t border-border py-6">
                  <h3 className="font-display text-2xl font-medium tracking-tight">{item.title}</h3>
                  <p className="mt-1 text-muted">{item.school}</p>
                </li>
              ))}
            </ul>
          </section>
        </Reveal>
      )}

      {p.interests.length > 0 && (
        <Reveal>
          <section className="mt-24">
            <SectionHeading index={5} title={t.about.interests} />
            <p className="mt-12 font-display text-2xl">{p.interests.join(' / ')}</p>
          </section>
        </Reveal>
      )}
    </Container>
  );
}
