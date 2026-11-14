import type { StaticImageData } from 'next/image';
import type { Messages } from '@/i18n/dictionaries';
import canChuoiHot from '../../public/images/p-can-chuoi-hot.jpg';
import canHapNong from '../../public/images/p-can-hap-nong.jpg';
import canNepGoDen from '../../public/images/p-can-nep-go-den.jpg';
import canNgocDuong from '../../public/images/p-can-ngoc-duong.jpg';
import khangDuocCanKhi from '../../public/images/p-khang-duoc-can-khi.jpg';
import samHanQuoc from '../../public/images/p-sam-han-quoc.jpg';
import tinhDuocNgocDuong from '../../public/images/p-tinh-duoc-ngoc-duong.jpg';

/**
 * Khang Hưng Tửu's products, from the brochure and the showroom (facts: business.ts). Product
 * names are brand names (kept as printed, in every language). Ingredient lists and prices other
 * than the ones printed are deliberately NOT here: confirm them with the owner (see CLAUDE.md).
 */

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
