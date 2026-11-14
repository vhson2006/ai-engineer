import { site } from '@/site';

/** Static, one page per language; the text is the kit's (legal.privacy), the facts this business's. */
const page = site.routes.legal('privacy');
export const generateMetadata = page.metadata;
export default page.Page;
