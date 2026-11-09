import Link from 'next/link';
import { Container, buttonClass } from '@web/ui';
import { href } from '@/i18n/locales';
import { getLocale, getMessages } from '@/i18n/messages';

export default async function NotFound() {
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  return (
    <Container className="py-28 text-center">
      <p className="font-display text-8xl font-bold text-brand-strong italic">404</p>
      <h1 className="mt-4 font-display text-3xl font-bold text-balance">{t.notFound.title}</h1>
      <p className="mt-3 text-muted">{t.notFound.text}</p>
      <Link href={href(locale, '/')} className={`${buttonClass.primary} mt-8 rounded-full`}>
        {t.notFound.back}
      </Link>
    </Container>
  );
}
