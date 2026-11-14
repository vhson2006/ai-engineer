import type { Business } from '@web/site-kit/business';
import type { Messages } from '@/i18n/dictionaries';

/**
 * Hãng rượu Khang Hưng Tửu (Long An): facts from the company's banner, brochure and showroom
 * photos, hard-coded until the API exists (products: products.ts). Every visible word is in
 * src/i18n/messages/<lang>.json. No opening hours: orders by phone only.
 */
export const business = {
  siteId: 'wine',
  name: 'Khang Hưng Tửu',
  fullName: 'Hãng rượu Khang Hưng Tửu Long An',
  siteName: 'Khang Hưng Tửu',
  sample: false,
  /** The one ordering number printed on every can (anti-counterfeit). */
  phone: { display: '0908 660 777', href: 'tel:+84908660777' },
  zaloHref: 'https://zalo.me/0939777797',
  /** As printed on the banner (the site shows it until the owner updates it). */
  address: { street: 'Quốc lộ 1A, Ấp Long Bình (Gò Đen)', ward: 'Xã Long Hiệp', city: 'Huyện Bến Lức, Long An', region: 'Long An', locality: 'Bến Lức' },
  /**
   * The winery's own Google listing, under the address after the 2025 merger (Long An → Tây Ninh,
   * Long Hiệp → Mỹ Yên: same place on QL1A, 10.6347, 106.5210).
   */
  mapQuery: 'Hãng Rượu Khang Hưng Tửu, 109 QL1A, Mỹ Yên, Tây Ninh',
  mapZoom: 15,
  hours: [],
  schema: { type: 'Winery', extra: { alternateName: 'Khang Hưng Tửu', foundingDate: '1991' } },
  cookieName: 'wine_locale',
} satisfies Business;

/** What the winery shows beyond the kit's facts: every number, Zalo, its website, the banner's address lines. */
export const winery = {
  since: 1991,
  phones: [
    { id: 'order', display: '0908 660 777', href: 'tel:+84908660777' },
    { id: 'owner', display: '0272 3870 911', href: 'tel:+842723870911' },
    { id: 'hotline', display: '0272 3641 777', href: 'tel:+842723641777' },
    { id: 'care', display: '098 3870 911', href: 'tel:+84983870911' },
  ] as const satisfies readonly { id: keyof Messages['contact']['phones']; display: string; href: string }[],
  zalo: { display: '0939 7777 97', href: business.zaloHref },
  website: { display: 'www.ruoukhanghung.com', href: 'https://www.ruoukhanghung.com' },
  addressLines: ['Quốc lộ 1A, Ấp Long Bình (Gò Đen)', 'Xã Long Hiệp, Huyện Bến Lức, Long An'],
};
