import { site } from '@/site';

/** All published articles (content-service, cached): the featured one, then the rest. */
export const generateMetadata = site.routes.articlesIndex.metadata;
export default site.routes.articlesIndex.Page;
