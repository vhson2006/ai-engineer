import { site } from '@/site';

/**
 * Fully static, also for a topic segment that wasn't prerendered: the request waits for the complete
 * page, so an unknown topic segment answers a real 404 (notFound()) instead of a 200 app shell.
 */
export const ensureStatic = 'navigation';
export const generateStaticParams = site.routes.topic.staticParams;
export const generateMetadata = site.routes.topic.metadata;
export default site.routes.topic.Page;
