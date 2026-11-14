import { site } from '@/site';

/** Static, one page per language; the text is this site's own (src/i18n/messages, legal.privacy), the facts its business's. */
const page = site.routes.legal('privacy');
export const generateMetadata = page.metadata;
export default page.Page;
