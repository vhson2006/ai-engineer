import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Container } from '@web/ui';
import { inkLink } from '@/features/editorial/section-heading';
import { href } from '@/i18n/locales';
import { getLocale, getMessages } from '@/i18n/messages';

/** 404 inside the site (header, footer, current language). Unknown paths land here via [...rest]. */
export default async function NotFound() {
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  return (
    <Container className="py-20 sm:py-28">
      <p aria-hidden className="font-display text-[8rem] leading-none text-brand italic sm:text-[12rem]">
        404
      </p>
      <h1 className="mt-8 max-w-2xl border-t border-fg pt-6 font-display text-4xl font-medium tracking-tight text-balance sm:text-5xl">
        {t.notFound.title}
      </h1>
      <p className="mt-4 max-w-xl text-lg text-pretty text-muted">{t.notFound.text}</p>
      <Link href={href(locale, '/')} className={`${inkLink} mt-10`}>
        {t.notFound.back}
        <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-1" />
      </Link>
    </Container>
  );
}
