import type { StaticImageData } from 'next/image';
import type { Messages } from '@/i18n/messages';
import laundryDesktop from '../../public/projects/laundry-desktop.jpg';
import laundryMobile from '../../public/projects/laundry-mobile.jpg';
import nailsDesktop from '../../public/projects/nails-desktop.jpg';
import nailsMobile from '../../public/projects/nails-mobile.jpg';
import weddingDesktop from '../../public/projects/wedding-desktop.jpg';
import weddingMobile from '../../public/projects/wedding-mobile.jpg';
import wineDesktop from '../../public/projects/wine-desktop.jpg';
import wineMobile from '../../public/projects/wine-mobile.jpg';

/**
 * The sample websites (web/apps/*-web in this repository). Words are in the dictionaries under
 * "projects.items.<slug>"; here: images, stack, where the code lives and where the live demo is.
 *
 * Demo URLs come from the environment (DEMO_URL_NAILS…, see .env.example), read at build time:
 * unset = no "live demo" button (the case study and the code are still there).
 */
export type ProjectSlug = keyof Messages['projects']['items'];

export interface Project {
  slug: ProjectSlug;
  desktop: StaticImageData;
  mobile: StaticImageData;
  /** Brand colour of the site (card accent). */
  accent: string;
  stack: string[];
  /** Path of the app in the repository. */
  source: string;
  demoUrl: string | undefined;
}

const SHARED_STACK = ['Next.js 16', 'React 19', 'TypeScript', 'Tailwind CSS 4', 'Radix UI'];

export const projects: Project[] = [
  {
    slug: 'nails',
    desktop: nailsDesktop,
    mobile: nailsMobile,
    accent: '#22502f',
    stack: [...SHARED_STACK, 'i18n EN/VI', 'Vitest'],
    source: 'web/apps/nails-web',
    demoUrl: process.env.DEMO_URL_NAILS || undefined,
  },
  {
    slug: 'laundry',
    desktop: laundryDesktop,
    mobile: laundryMobile,
    accent: '#13883a',
    stack: [...SHARED_STACK, 'i18n VI/EN', 'Vitest'],
    source: 'web/apps/laundry-web',
    demoUrl: process.env.DEMO_URL_LAUNDRY || undefined,
  },
  {
    slug: 'wine',
    desktop: wineDesktop,
    mobile: wineMobile,
    accent: '#b3141c',
    stack: [...SHARED_STACK, 'i18n VI/EN', 'Vitest'],
    source: 'web/apps/wine-web',
    demoUrl: process.env.DEMO_URL_WINE || undefined,
  },
  {
    slug: 'wedding',
    desktop: weddingDesktop,
    mobile: weddingMobile,
    accent: '#8f6b3e',
    stack: [...SHARED_STACK, 'Intl (lunar calendar)', 'iCalendar (.ics)', 'Vitest'],
    source: 'web/apps/wedding-web',
    demoUrl: process.env.DEMO_URL_WEDDING || undefined,
  },
];

export function findProject(slug: string): Project | undefined {
  return projects.find((project) => project.slug === slug);
}

/** The public repository of this whole system (the sample sites live in web/apps/). */
export const REPOSITORY_URL = 'https://github.com/vhson2006/ai-engineer';

export function sourceUrl(project: Project): string {
  return `${REPOSITORY_URL}/tree/main/${project.source}`;
}
