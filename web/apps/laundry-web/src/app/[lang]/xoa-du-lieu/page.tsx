import type { Metadata } from 'next';
import { LegalDocument, legalMetadata } from '@/features/legal/legal-page';
import { getLocale, getMessages } from '@/i18n/messages';

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  return legalMetadata(t, locale, 'dataDeletion');
}

/** Static, one page per language; the text is in the dictionaries (legal.dataDeletion). */
export default async function DataDeletionPage() {
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  return <LegalDocument page="dataDeletion" t={t} locale={locale} />;
}
