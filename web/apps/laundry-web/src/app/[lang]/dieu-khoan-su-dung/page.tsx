import type { Metadata } from 'next';
import { LegalDocument, legalMetadata } from '@/features/legal/legal-page';
import { getLocale, getMessages } from '@/i18n/messages';

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  return legalMetadata(t, locale, 'terms');
}

/** Static, one page per language; the text is in the dictionaries (legal.terms). */
export default async function TermsPage() {
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  return <LegalDocument page="terms" t={t} locale={locale} />;
}
