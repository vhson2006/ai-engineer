import { defineWebsite } from '@web/site-kit/website';
import { business } from '@/content/business';

/**
 * Vietnamese first (ADR 0038), the kit's article URLs; two legal pages (no data deletion: no
 * account, no form), with the winery's own texts (src/i18n/messages, `legal`) and their date.
 * Client-safe: the proxy uses it.
 */
export const website = defineWebsite(business, {
  paths: { legal: { privacy: '/chinh-sach-bao-mat', terms: '/dieu-khoan-su-dung' } },
  legalUpdated: '2026-11-12',
});
