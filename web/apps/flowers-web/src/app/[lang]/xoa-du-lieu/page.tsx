import { site } from '@/site';

/** Static, one page per language; the text is the kit's (legal.dataDeletion), the facts this business's. */
const page = site.routes.legal('dataDeletion');
export const generateMetadata = page.metadata;
export default page.Page;
