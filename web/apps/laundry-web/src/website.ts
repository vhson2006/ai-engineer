import { defineWebsite } from '@web/site-kit/website';
import { business } from '@/content/business';

/**
 * Vietnamese first (ADR 0038), the kit's URLs (/bai-viet, the three legal pages). The legal texts
 * are the shop's own (src/i18n/messages, `legal`): their date. Client-safe: the proxy uses it.
 */
export const website = defineWebsite(business, { legalUpdated: '2026-11-12' });
