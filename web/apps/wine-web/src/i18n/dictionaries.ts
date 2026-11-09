import type en from './messages/en.json';
import type { Locale } from './locales';

/** The shape of a dictionary: English is the reference, every other language must match it. */
export type Messages = typeof en;

/**
 * One loader per language. `Promise<Messages>` makes TypeScript refuse a translation that lacks
 * a key; messages.test.ts also refuses extra or empty keys. Only the requested language is loaded,
 * on the server: dictionaries never reach the client bundle (client components get strings as props).
 */
const dictionaries: Record<Locale, () => Promise<Messages>> = {
  en: () => import('./messages/en.json').then((module) => module.default),
  vi: () => import('./messages/vi.json').then((module) => module.default),
};

/**
 * A dictionary by locale. Usable anywhere (Route Handlers, image routes, tests); pages use
 * getMessages() (messages.ts), which reads the locale from the route.
 */
export function loadMessages(locale: Locale): Promise<Messages> {
  return dictionaries[locale]();
}
