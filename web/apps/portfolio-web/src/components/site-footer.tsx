import { ArrowUpRight } from 'lucide-react';
import { Container } from '@web/ui';
import { profile } from '@/content/profile';
import { inkLink } from '@/features/editorial/section-heading';
import { getMessages } from '@/i18n/messages';

/**
 * The contact block (id="contact", the header's Contact button scrolls here) and the bottom line,
 * on every page: contact is never a section only one page has.
 */
export async function SiteFooter() {
  const t = await getMessages();
  const c = t.contact;
  return (
    <footer id="contact" className="scroll-mt-16 border-t border-fg">
      <Container className="py-20 sm:py-24">
        <p className="font-mono text-xs tracking-widest text-subtle uppercase">{c.eyebrow}</p>
        <h2 className="mt-6 max-w-4xl font-display text-4xl leading-[1.05] font-medium tracking-tight text-balance sm:text-6xl">
          {c.title} <em className="font-normal text-brand">{c.titleAccent}</em>
        </h2>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">{c.text}</p>
        <a
          href={`mailto:${profile.contact.email}`}
          className="group mt-10 inline-flex max-w-full items-center gap-4 font-display text-3xl font-medium tracking-tight break-all underline decoration-border decoration-2 underline-offset-8 transition-colors hover:decoration-brand focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand sm:text-5xl"
        >
          {profile.contact.email}
          <ArrowUpRight aria-hidden className="size-8 shrink-0 text-brand transition-transform group-hover:-translate-y-1 group-hover:translate-x-1 sm:size-10" />
        </a>
        <ul className="mt-10 flex flex-wrap gap-x-10 gap-y-3 font-mono text-sm">
          <li>
            <a href={profile.contact.phoneHref} className={inkLink}>
              {c.call} · {profile.contact.phone}
            </a>
          </li>
          <li>
            <a href={profile.contact.zaloHref} target="_blank" rel="noopener noreferrer" className={inkLink}>
              {c.zalo}
            </a>
          </li>
          {profile.contact.links.map((link) => (
            <li key={link.href}>
              <a href={link.href} target="_blank" rel="noopener noreferrer" className={inkLink}>
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </Container>
      <Container className="border-t border-border py-6 font-mono text-xs tracking-wide text-subtle">
        <p>
          © {profile.name} · {t.profile.role}
        </p>
      </Container>
    </footer>
  );
}
