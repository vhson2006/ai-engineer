/**
 * The sample article of laundry-web (Giặt sấy SFaster): the writers' guide (`guide.ts`) with the
 * shop's own lines. Its drawings: `web/apps/laundry-web/public/images/guide/`.
 */
import { guideTemplate, type ArticleTemplateSeed, type CategorySeed } from './guide';

/** The shop's topics already exist (created in the admin site): the seed only checks them. */
export const LAUNDRY_CATEGORIES: CategorySeed[] = [];

export const LAUNDRY_TEMPLATES: ArticleTemplateSeed[] = [
  guideTemplate(
    {
      business: (l) => l('tiệm', 'the shop'),
      colours: (l) => l('màu sắc của tiệm', 'the shop’s colours'),
      facts: (l) =>
        l(
          'Ghi đúng giá và giờ như bảng giá, bảng giờ của tiệm.',
          'Prices and hours exactly as on the shop’s boards.',
        ),
      promises: (l) =>
        l(
          'Hứa điều tiệm chưa xác nhận (giao nhận, thời gian trả đồ).',
          'Promise what the shop hasn’t confirmed (delivery, turnaround).',
        ),
      compare: (l) => l('giặt máy / giặt hấp', 'machine wash / dry cleaning'),
      introduce: (l) => l('một người, một máy, một dịch vụ', 'a person, a machine, a service'),
      reach: (l) => l('gọi điện, nhắn Zalo hay ghé tiệm', 'call, message on Zalo or drop by'),
      byline: 'SFaster',
    },
    'shop',
    // The article the owner built block by block in the admin site, renamed for this purpose.
    ['gia-giat-say-duoc-tinh-the-nao'],
  ),
];
