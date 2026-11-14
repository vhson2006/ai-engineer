import type { StaticImageData } from 'next/image';
import type { Messages } from '@/i18n/messages';
import autopartsDesktop from '../../public/projects/autoparts-desktop.jpg';
import autopartsMobile from '../../public/projects/autoparts-mobile.jpg';
import flowersDesktop from '../../public/projects/flowers-desktop.jpg';
import flowersMobile from '../../public/projects/flowers-mobile.jpg';
import hotelDesktop from '../../public/projects/hotel-desktop.jpg';
import hotelMobile from '../../public/projects/hotel-mobile.jpg';
import laundryDesktop from '../../public/projects/laundry-desktop.jpg';
import laundryMobile from '../../public/projects/laundry-mobile.jpg';
import nailsDesktop from '../../public/projects/nails-desktop.jpg';
import nailsMobile from '../../public/projects/nails-mobile.jpg';
import spaDesktop from '../../public/projects/spa-desktop.jpg';
import spaMobile from '../../public/projects/spa-mobile.jpg';
import sushiDesktop from '../../public/projects/sushi-desktop.jpg';
import sushiMobile from '../../public/projects/sushi-mobile.jpg';
import travelDesktop from '../../public/projects/travel-desktop.jpg';
import travelMobile from '../../public/projects/travel-mobile.jpg';
import wineDesktop from '../../public/projects/wine-desktop.jpg';
import wineMobile from '../../public/projects/wine-mobile.jpg';

/**
 * The sample websites (web/apps/<slug>-web, on @web/site-kit; listed for Kubernetes in
 * k8s/sites/sites.json). Words are in the dictionaries under "projects.items.<slug>"; here: images,
 * group, stack and where the code lives. The live demo is /demo/<slug> (app/demo/[slug]/route.ts):
 * it redirects to the site's URL of this environment (<SLUG>_URL: urls.env in Kubernetes, .env.local
 * in dev), so no address is written here.
 */
export type ProjectSlug = keyof Messages['projects']['items'];

/** `business`: built from a real business's menu, signage and photos; `template`: a fictional one. */
export type ProjectGroup = 'business' | 'template';

export interface Project {
  slug: ProjectSlug;
  group: ProjectGroup;
  desktop: StaticImageData;
  mobile: StaticImageData;
  /** Brand colour of the site (card accent). */
  accent: string;
  stack: string[];
  /** Path of the app in the repository. */
  source: string;
}

const SHARED_STACK = ['Next.js 16', 'React 19', 'TypeScript', 'Tailwind CSS 4', '@web/site-kit'];

const project = (slug: ProjectSlug, group: ProjectGroup, desktop: StaticImageData, mobile: StaticImageData, accent: string, extra: string[]): Project => ({
  slug,
  group,
  desktop,
  mobile,
  accent,
  stack: [...SHARED_STACK, ...extra],
  source: `web/apps/${slug}-web`,
});

export const projects: Project[] = [
  project('nails', 'business', nailsDesktop, nailsMobile, '#22502f', ['i18n EN/VI', 'Vitest']),
  project('laundry', 'business', laundryDesktop, laundryMobile, '#13883a', ['i18n VI/EN', 'Vitest']),
  project('wine', 'business', wineDesktop, wineMobile, '#b3141c', ['i18n VI/EN', 'Vitest']),
  project('sushi', 'template', sushiDesktop, sushiMobile, '#b8322a', ['i18n VI/EN']),
  project('travel', 'template', travelDesktop, travelMobile, '#0b6e83', ['i18n VI/EN']),
  project('flowers', 'template', flowersDesktop, flowersMobile, '#c2456b', ['i18n VI/EN']),
  project('autoparts', 'template', autopartsDesktop, autopartsMobile, '#f26a1b', ['i18n VI/EN', 'Vitest']),
  project('hotel', 'template', hotelDesktop, hotelMobile, '#24365c', ['i18n VI/EN']),
  project('spa', 'template', spaDesktop, spaMobile, '#4f7a6a', ['i18n VI/EN']),
];

export function findProject(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}

/** The live demo: a redirect to the site in this environment (app/demo/[slug]/route.ts). */
export const demoPath = (p: Project) => `/demo/${p.slug}`;

/** The public repository of this whole system (the sample sites live in web/apps/). */
export const REPOSITORY_URL = 'https://github.com/vhson2006/ai-engineer';

export function sourceUrl(p: Project): string {
  return `${REPOSITORY_URL}/tree/main/${p.source}`;
}
