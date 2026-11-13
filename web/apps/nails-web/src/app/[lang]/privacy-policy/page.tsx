import type { Metadata } from 'next';
import { LegalDocument, legalMetadata } from '@/features/legal/legal-page';
import { getLocale, getMessages } from '@/i18n/messages';

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  return legalMetadata(t, locale, 'privacy');
}

/** Static, one page per language; the text is in the dictionaries (legal.privacy). */
export default async function PrivacyPage() {
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  return <LegalDocument page="privacy" t={t} locale={locale} />;
}
