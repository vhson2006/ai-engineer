import { site } from '@/site';

/**
 * Fully static, also for a slug that wasn't prerendered: the request waits for the complete
 * page, so an unknown slug answers a real 404 (notFound()) instead of a 200 app shell.
 */
export const ensureStatic = 'navigation';
export const generateStaticParams = site.routes.article.staticParams;
export const generateMetadata = site.routes.article.metadata;
export default site.routes.article.Page;
