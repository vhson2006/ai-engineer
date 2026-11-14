import { site } from '@/site';

/** Static, one page per language; the text is this site's own (src/i18n/messages, legal.terms), the facts its business's. */
const page = site.routes.legal('terms');
export const generateMetadata = page.metadata;
export default page.Page;
