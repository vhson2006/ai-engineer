import type { Locale } from '@web/site-kit/locales';
import { mergeMessages, type Dictionary } from '@web/site-kit/messages';
import type en from './messages/en.json';

/** This site's own words (English is the reference, every other language must match it). */
export type SiteMessages = typeof en;
/** The whole dictionary: the kit's strings (@web/site-kit/messages) and the site's own (its legal texts replace the kit's). */
export type Messages = Dictionary<SiteMessages>;

/**
 * One loader per language, on the server only (client components get strings as props).
 * messages.test.ts refuses missing, extra or empty keys.
 */
const dictionaries: Record<Locale, () => Promise<Messages>> = {
  en: async () => mergeMessages((await import('@web/site-kit/messages/en.json')).default, (await import('./messages/en.json')).default),
  vi: async () => mergeMessages((await import('@web/site-kit/messages/vi.json')).default, (await import('./messages/vi.json')).default),
};

export function loadMessages(locale: Locale): Promise<Messages> {
  return dictionaries[locale]();
}
