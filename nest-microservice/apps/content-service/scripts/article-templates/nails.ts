/**
 * The sample article of nails-web (Envy Nails Spa of Wendell): the writers' guide (`guide.ts`)
 * with the salon's own lines, and the blog's three topics. Its drawings (the laundry ones,
 * recoloured in the salon's pastels): `web/apps/nails-web/public/images/guide/`.
 */
import { guideTemplate, type ArticleTemplateSeed, type CategorySeed } from './guide';

/** The blog's topics (keys used by nails-web for each topic's pastel and fallback cover). */
export const NAILS_CATEGORIES: CategorySeed[] = [
  {
    key: 'care',
    position: 0,
    name: { en: 'Nail care', vi: 'Chăm sóc móng' },
    slug: { en: 'nail-care', vi: 'cham-soc-mong' },
  },
  {
    key: 'services',
    position: 1,
    name: { en: 'Services', vi: 'Dịch vụ' },
    slug: { en: 'services', vi: 'dich-vu' },
  },
  {
    key: 'salon',
    position: 2,
    name: { en: 'Salon notes', vi: 'Tin tiệm' },
    slug: { en: 'salon', vi: 'tin-tiem' },
  },
];

export const NAILS_TEMPLATES: ArticleTemplateSeed[] = [
  guideTemplate(
    {
      business: (l) => l('tiệm', 'the salon'),
      colours: (l) => l('màu pastel của tiệm', 'the salon’s pastel colours'),
      facts: (l) =>
        l(
          'Ghi đúng giá và giờ như bảng giá, giờ mở cửa của tiệm.',
          'Prices and hours exactly as on the salon’s menu and opening hours.',
        ),
      promises: (l) =>
        l(
          'Hứa điều tiệm chưa xác nhận (khuyến mãi, thời gian làm, tên thợ).',
          'Promise what the salon hasn’t confirmed (promotions, service times, staff names).',
        ),
      compare: (l) =>
        l('gel / acrylic, sơn thường / sơn gel', 'gel / acrylic, regular polish / gel polish'),
      introduce: (l) =>
        l('một dịch vụ, một mẫu nail, không gian tiệm', 'a service, a nail look, the salon itself'),
      reach: (l) => l('đặt lịch trực tuyến, gọi điện hay ghé tiệm', 'book online, call or drop by'),
      byline: 'Envy Nails Spa',
    },
    'salon',
  ),
];
