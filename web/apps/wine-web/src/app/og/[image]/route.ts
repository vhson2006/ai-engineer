import { site } from '@/site';

/**
 * The site's link preview card, one per language: /og/vi.png, /og/en.png (outside [lang], and
 * skipped by the proxy for its extension). Every page without its own image points to it.
 */
export const generateStaticParams = site.routes.ogImage.staticParams;
export const GET = site.routes.ogImage.GET;
