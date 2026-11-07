import type { Metadata } from 'next';
import { Avatar, Card, Chip, Container } from '@web/ui';
import { Reveal } from '@web/ui/reveal';
import { format } from '@web/core/i18n/format';
import { profile } from '@/content/profile';
import { getLocale, getMessages } from '@/i18n/messages';
import { JsonLd } from '@/components/json-ld';
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

/** Fully static: prerendered at build time per language. Text: messages/<lang>.json "profile". */
export default async function AboutPage() {
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  const p = t.profile;
  return (
    <Container className="py-16 sm:py-20">
      <JsonLd data={structuredData(t, locale, { path: '/about', profilePage: { name: t.about.title, modified: BUILT_AT } })} />
      <div className="grid gap-10 lg:grid-cols-[20rem_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card>
            <div className="flex flex-col items-center text-center">
              <Avatar initials={profile.initials} size="lg" />
              <h1 className="mt-4 text-xl font-bold">{profile.name}</h1>
              <p className="text-muted">{p.role}</p>
            </div>

            <dl className="mt-6 divide-y divide-border border-t border-border text-sm">
              {p.personal.map((item) => (
                <div key={item.label} className="flex justify-between gap-4 py-3">
                  <dt className="text-subtle">{item.label}</dt>
                  <dd className="text-right font-medium">{item.value}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-subtle">{t.about.email}</dt>
                <dd className="text-right font-medium">
                  <a className="text-brand hover:underline" href={`mailto:${profile.contact.email}`}>
                    {profile.contact.email}
                  </a>
                </dd>
              </div>
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-subtle">{t.about.phone}</dt>
                <dd className="text-right font-medium">{profile.contact.phone}</dd>
              </div>
            </dl>

            <ul className="mt-4 flex flex-wrap justify-center gap-2">
              {profile.contact.links.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-surface-2"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </Card>
        </aside>

        <div className="space-y-14">
          <section>
            <p className="text-sm font-semibold uppercase tracking-wider text-brand">{t.about.eyebrow}</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-balance">{format(t.about.hello, { name: profile.name })}</h2>
            <div className="mt-6 space-y-4 text-lg leading-relaxed text-muted">
              {p.bio.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </section>

          {p.experience.length > 0 && (
            <Reveal>
              <section>
                <h2 className="text-2xl font-bold tracking-tight">{t.about.experience}</h2>
                <ol className="mt-6 space-y-8 border-l border-border pl-6">
                  {p.experience.map((job) => (
                    <li key={`${job.period}-${job.company}`} className="relative">
                      <span
                        aria-hidden
                        className="absolute -left-[1.85rem] top-1.5 size-3 rounded-full border-2 border-bg bg-brand"
                      />
                      <p className="text-sm text-subtle">{job.period}</p>
                      <h3 className="mt-1 font-semibold">
                        {job.title} · <span className="text-muted">{job.company}</span>
                      </h3>
                      <p className="mt-2 leading-relaxed text-muted">{job.text}</p>
                    </li>
                  ))}
                </ol>
              </section>
            </Reveal>
          )}

          {p.education.length > 0 && (
            <Reveal>
              <section>
                <h2 className="text-2xl font-bold tracking-tight">{t.about.education}</h2>
                <ul className="mt-6 grid gap-4 sm:grid-cols-2">
                  {p.education.map((item) => (
                    <li key={item.title}>
                      <Card>
                        <p className="text-sm text-subtle">{item.period}</p>
                        <h3 className="mt-1 font-semibold">{item.title}</h3>
                        <p className="text-muted">{item.school}</p>
                      </Card>
                    </li>
                  ))}
                </ul>
              </section>
            </Reveal>
          )}

          {p.interests.length > 0 && (
            <Reveal>
              <section>
                <h2 className="text-2xl font-bold tracking-tight">{t.about.interests}</h2>
                <ul className="mt-6 flex flex-wrap gap-2">
                  {p.interests.map((interest) => (
                    <li key={interest}>
                      <Chip>{interest}</Chip>
                    </li>
                  ))}
                </ul>
              </section>
            </Reveal>
          )}
        </div>
      </div>
    </Container>
  );
}
