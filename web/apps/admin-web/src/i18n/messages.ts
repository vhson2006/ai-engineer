import { notFound } from 'next/navigation';
import { lang } from 'next/root-params';
import { loadMessages, type Messages } from './dictionaries';
import { isLocale, type Locale } from './locales';

export { loadMessages, type Messages };

/**
 * The current page's locale, from the [lang] root segment (next/root-params): no prop drilling.
 * Server Components only (not Client Components, Route Handlers or Server Actions).
 */
export async function getLocale(): Promise<Locale> {
  const value = await lang();
  if (!isLocale(value)) notFound();
  return value;
}

/** The current page's dictionary. */
export async function getMessages(): Promise<Messages> {
  return loadMessages(await getLocale());
}
