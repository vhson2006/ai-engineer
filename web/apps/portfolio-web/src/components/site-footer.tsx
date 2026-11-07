import { Container } from '@web/ui';
import { profile } from '@/content/profile';
import { getMessages } from '@/i18n/messages';

export async function SiteFooter() {
  const t = await getMessages();
  return (
    <footer className="border-t border-border py-10">
      <Container className="flex flex-col gap-4 text-sm text-subtle sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {profile.name} · {t.profile.role}
        </p>
        <ul className="flex flex-wrap gap-x-6 gap-y-2">
          <li>
            <a className="transition-colors hover:text-fg" href={`mailto:${profile.contact.email}`}>
              {profile.contact.email}
            </a>
          </li>
          {profile.contact.links.map((link) => (
            <li key={link.href}>
              <a className="transition-colors hover:text-fg" href={link.href} target="_blank" rel="noreferrer">
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </Container>
    </footer>
  );
}
