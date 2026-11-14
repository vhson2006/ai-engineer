import { defineWebsite } from '@web/site-kit/website';
import { business } from '@/content/business';

/** The site's languages (Vietnamese first, ADR 0038) and the kit's default URLs (ADR 0042). Client-safe: the proxy uses it. */
export const website = defineWebsite(business);
