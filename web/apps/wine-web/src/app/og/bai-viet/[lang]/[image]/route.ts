import { site } from '@/site';

/**
 * An article's link preview when it has no cover of its own: its topic and title on the brand
 * card, /og/bai-viet/<lang>/<slug>.png. Prerendered for the articles published at build time; a
 * newer one is drawn on its first request.
 */
export const generateStaticParams = site.routes.articleOgImage.staticParams;
export const GET = site.routes.articleOgImage.GET;
