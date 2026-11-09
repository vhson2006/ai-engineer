import { format } from '@web/core/i18n/format';
import { Container } from '@web/ui';
import { couple } from '@/content/wedding';
import { getMessages } from '@/i18n/messages';
import { Monogram } from './monogram';

export async function SiteFooter() {
  const t = await getMessages();
  return (
    <footer className="bg-deep text-white/70">
      <Container className="flex flex-col items-center gap-3 py-10 text-center">
        <Monogram tone="light" className="size-14 text-2xl" />
        <p className="font-script text-3xl text-gold-light">
          {couple.groom.short} &amp; {couple.bride.short}
        </p>
        <p className="text-sm tracking-[0.2em] text-white/60">{couple.hashtag}</p>
        <p className="text-xs text-white/40">{format(t.footer.rights, { year: '2026', names: `${couple.groom.full} & ${couple.bride.full}` })}</p>
      </Container>
    </footer>
  );
}
