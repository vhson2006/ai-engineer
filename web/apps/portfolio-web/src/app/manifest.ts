import type { MetadataRoute } from 'next';
import { profile } from '@/content/profile';
import { DEFAULT_LOCALE } from '@/i18n/locales';
import { loadMessages } from '@/i18n/dictionaries';

/**
 * /manifest.webmanifest: name, colors and icons when the site is installed or pinned
 * (icons: npm run icons → public/icons). In the default language.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const t = await loadMessages(DEFAULT_LOCALE);
  return {
    name: `${profile.name} · ${t.profile.role}`,
    short_name: profile.name,
    description: t.profile.tagline,
    start_url: '/',
    display: 'browser',
    background_color: '#f8fafc',
    theme_color: '#4f46e5',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
