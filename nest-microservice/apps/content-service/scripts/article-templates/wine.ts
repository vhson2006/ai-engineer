/**
 * The sample article of wine-web (Khang Hưng Tửu): the writers' guide (`guide.ts`) with the
 * winery's own lines (alcohol rules: no health claims, nothing aimed at minors), and the five
 * topics of its articles. Its drawings (the laundry ones, recoloured in the winery's red and
 * gold): `web/apps/wine-web/public/images/guide/`.
 */
import { guideTemplate, type ArticleTemplateSeed, type CategorySeed } from './guide';

/** The articles' topics (keys used by wine-web for each topic's fallback cover). */
export const WINE_CATEGORIES: CategorySeed[] = [
  {
    key: 'brand',
    position: 0,
    name: { vi: 'Thương hiệu', en: 'Brand' },
    slug: { vi: 'thuong-hieu', en: 'brand' },
  },
  {
    key: 'craft',
    position: 1,
    name: { vi: 'Sản xuất', en: 'Craft' },
    slug: { vi: 'san-xuat', en: 'craft' },
  },
  {
    key: 'serving',
    position: 2,
    name: { vi: 'Cách thưởng thức', en: 'How to serve' },
    slug: { vi: 'thuong-thuc', en: 'how-to-serve' },
  },
  {
    key: 'guide',
    position: 3,
    name: { vi: 'Cẩm nang', en: 'Guides' },
    slug: { vi: 'cam-nang', en: 'guides' },
  },
  {
    key: 'partners',
    position: 4,
    name: { vi: 'Hợp tác', en: 'Partners' },
    slug: { vi: 'hop-tac', en: 'partners' },
  },
];

export const WINE_TEMPLATES: ArticleTemplateSeed[] = [
  guideTemplate(
    {
      business: (l) => l('hãng', 'the winery'),
      colours: (l) => l('màu đỏ và vàng của hãng', 'the winery’s red and gold'),
      facts: (l) =>
        l(
          'Ghi đúng tên sản phẩm, giá và số điện thoại như trên nhãn và tài liệu của hãng.',
          'Product names, prices and phone numbers exactly as on the labels and the winery’s materials.',
        ),
      promises: (l) =>
        l(
          'Viết về công dụng chữa bệnh, “bổ”, “tráng dương”, hay nhắm tới người dưới 18 tuổi (pháp luật cấm).',
          'Claim health benefits or cures, or address people under 18 (the law forbids it).',
        ),
      compare: (l) =>
        l('rượu hấp nóng / rượu cần, chai / can', 'warm wine / jar wine, bottle / can'),
      introduce: (l) =>
        l('một sản phẩm, phòng ngâm tẩm, showroom', 'a product, the infusion room, the showroom'),
      reach: (l) =>
        l(
          'gọi đặt hàng, nhắn Zalo hay ghé showroom',
          'call to order, message on Zalo or visit the showroom',
        ),
      byline: 'Khang Hưng Tửu',
    },
    'guide',
  ),
];
