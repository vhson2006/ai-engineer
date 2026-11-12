import type { StaticImageData } from 'next/image';
import type { Messages } from '@/i18n/messages';
import canChuoiHot from '../../public/images/p-can-chuoi-hot.jpg';
import canHapNong from '../../public/images/p-can-hap-nong.jpg';
import canNepGoDen from '../../public/images/p-can-nep-go-den.jpg';
import canNgocDuong from '../../public/images/p-can-ngoc-duong.jpg';
import khangDuocCanKhi from '../../public/images/p-khang-duoc-can-khi.jpg';
import samHanQuoc from '../../public/images/p-sam-han-quoc.jpg';
import tinhDuocNgocDuong from '../../public/images/p-tinh-duoc-ngoc-duong.jpg';

/**
 * Hãng rượu Khang Hưng Tửu (Long An): facts from the company's banner, brochure and showroom
 * photos, hard-coded until the API exists. Product names are brand names (kept as printed, in
 * every language); every other visible word is in src/i18n/messages/<lang>.json.
 * Ingredient lists and prices other than the ones printed are deliberately NOT here: confirm
 * them with the owner before adding (see CLAUDE.md).
 */

export const winery = {
  name: 'Khang Hưng Tửu',
  fullName: 'Hãng rượu Khang Hưng Tửu Long An',
  since: 1991,
  /** The one ordering number printed on every can (anti-counterfeit). */
  orderPhone: { display: '0908 660 777', href: 'tel:+84908660777' },
  phones: [
    { id: 'order', display: '0908 660 777', href: 'tel:+84908660777' },
    { id: 'owner', display: '0272 3870 911', href: 'tel:+842723870911' },
    { id: 'hotline', display: '0272 3641 777', href: 'tel:+842723641777' },
    { id: 'care', display: '098 3870 911', href: 'tel:+84983870911' },
  ] as const satisfies readonly { id: keyof Messages['contact']['phones']; display: string; href: string }[],
  zalo: { display: '0939 7777 97', href: 'https://zalo.me/0939777797' },
  website: { display: 'www.ruoukhanghung.com', href: 'https://www.ruoukhanghung.com' },
  addressLines: ['Quốc lộ 1A, Ấp Long Bình (Gò Đen)', 'Xã Long Hiệp, Huyện Bến Lức, Long An'],
} as const;

/**
 * What Google Maps searches for: the winery's own Google listing, under the address after the 2025
 * merger (Long An → Tây Ninh, Long Hiệp → Mỹ Yên: same place on QL1A, 10.6347, 106.5210). The
 * site still SHOWS the address printed on the banner (`addressLines`) until the owner updates it.
 */
const mapQuery = 'Hãng Rượu Khang Hưng Tửu, 109 QL1A, Mỹ Yên, Tây Ninh';

/** Google Maps search for the winery (opens the app on phones). */
export const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;

/** The keyless Google Maps embed (www.google.com, allowed in src/proxy.ts frameOrigins). */
export const mapEmbedSrc = (locale: string) => `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&hl=${locale}&z=15&output=embed`;

/** "Tinh dược" line: product photos from the brochure. */
export const featured: { id: keyof Messages['featured']['items']; name: string; image: StaticImageData; kind: 'bottle' | 'can' }[] = [
  { id: 'khangDuoc', name: 'Khang Dược Cần Khí', image: khangDuocCanKhi, kind: 'bottle' },
  { id: 'ngocDuong', name: 'Tinh Dược Ngọc Dương', image: tinhDuocNgocDuong, kind: 'bottle' },
  { id: 'samHanQuoc', name: 'Tinh Dược Sâm Hàn Quốc', image: samHanQuoc, kind: 'bottle' },
  { id: 'chuoiHot', name: 'Chuối Hột', image: canChuoiHot, kind: 'can' },
  { id: 'canNgocDuong', name: 'Ngọc Dương', image: canNgocDuong, kind: 'can' },
  { id: 'nepGoDen', name: 'Nếp Gò Đen', image: canNepGoDen, kind: 'can' },
  { id: 'hapNong', name: 'Hấp Nóng', image: canHapNong, kind: 'can' },
];

/** Showroom jars with the company price printed on the label (VND per "xị"). */
export const jars: { id: keyof Messages['jars']['items']; name: string; pricePerXi: number }[] = [
  { id: 'soaiDuong', name: 'Soái Dương Tửu', pricePerXi: 100_000 },
  { id: 'minhLang', name: 'Minh Lăng Tửu', pricePerXi: 100_000 },
  { id: 'xuanTrungThao', name: 'Xuân Trùng Thảo', pricePerXi: 100_000 },
];

/** "The most valuable brands list" (brochure). */
export const signatureBrands = [
  'Khang Dược Cần Khí',
  'Xuyên Dương Đại Đế',
  'Điếu Mã Kê Trung Sơn',
  'Sơn Cáp Mã Triều',
  'Hoàng Cúc Tửu',
  'Rượu Sâm Cúc',
  'Mai Quế Lộ',
  'Rượu Ngọc Dương',
  'Rượu Chuối Hột',
];

/** Bottled range shown on the brochure's display page. */
export const bottled = ['Ngọc Dương', 'Nếp Gò Đen', 'Sâm Cúc', 'Rắn Hổ', 'Chuối Hột', 'Sâm Hàn Quốc', 'Nhung Nai'];

/** Rượu cần Tây Nguyên: one jar style per ethnic group (proper nouns). */
export const ruouCan = ['Stiêng', 'Mường', 'Bana', 'Êđê'];
