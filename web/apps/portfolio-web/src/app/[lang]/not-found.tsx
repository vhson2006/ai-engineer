import Link from 'next/link';
import { Container, buttonClass } from '@web/ui';
import { href } from '@/i18n/locales';
import { getLocale, getMessages } from '@/i18n/messages';

/** 404 inside the site (header, footer, current language). Unknown paths land here via [...rest]. */
export default async function NotFound() {
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  return (
    <Container className="relative py-28 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-64 max-w-xl bg-[radial-gradient(ellipse_at_center,var(--brand-soft),transparent_70%)]"
      />
      <p className="font-mono text-7xl font-bold tracking-tighter text-brand/80 sm:text-8xl">404</p>
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-balance">{t.notFound.title}</h1>
      <p className="mt-3 text-pretty text-muted">{t.notFound.text}</p>
      <Link href={href(locale, '/')} className={`${buttonClass.primary} mt-8`}>
        {t.notFound.back}
      </Link>
    </Container>
  );
}
