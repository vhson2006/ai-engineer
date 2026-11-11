import { img, type ArticleTemplate } from './types';

export const photoEssay: ArticleTemplate = {
  id: 'phong-su-anh',
  name: 'Phóng sự ảnh',
  description: 'Ảnh là nhân vật chính: ảnh toàn màn hình, lưới ghép ảnh lớn nhỏ, bộ ba ảnh dọc, chữ ngắn làm nhịp nghỉ.',
  bestFor: 'Không gian showroom, một ngày ở xưởng, sự kiện ra mắt, mùa thu hoạch.',
  blocks: ['Ảnh toàn màn hình', 'Lưới ghép ảnh', 'Bộ 3 ảnh', 'Bộ 2 ảnh', 'Chữ ngắn'],
  title: '[Một ngày ở / Một mùa ở] [địa điểm] qua ống kính',
  excerpt: 'Câu chuyện kể bằng hình ảnh — chữ chỉ làm nhịp nghỉ giữa những khung hình.',
  cover: '3x2',
  readingMinutes: 4,
  html: `
<p class="tpl-lead">[Hai câu dẫn: ai chụp, chụp ở đâu, trong bao lâu.] Ở phóng sự ảnh, chữ càng ít càng tốt — mỗi đoạn không quá ba câu.</p>
<figure class="tpl-full">${img('21x9', '[Ảnh mở đầu toàn cảnh]')}<figcaption>[Giờ, nơi chụp.]</figcaption></figure>
<h2 class="tpl-center">[Buổi sáng]</h2>
<p>[Hai câu về khung giờ này.]</p>
<section class="tpl-mosaic">
<figure>${img('3x4', '[Ảnh lớn buổi sáng]')}</figure>
<figure>${img('4x3', '[Ảnh nhỏ 1]')}</figure>
<figure>${img('4x3', '[Ảnh nhỏ 2]')}</figure>
</section>
<p class="tpl-small">[Chú thích chung cho lưới ảnh.]</p>
<h2 class="tpl-center">[Buổi trưa]</h2>
<p>[Hai câu.]</p>
<figure class="tpl-wide">${img('16x9', '[Ảnh tràn rộng buổi trưa]')}<figcaption>[Chú thích.]</figcaption></figure>
<section class="tpl-gallery-3">
<figure>${img('1x1', '[Chi tiết 1]')}</figure>
<figure>${img('1x1', '[Chi tiết 2]')}</figure>
<figure>${img('1x1', '[Chi tiết 3]')}</figure>
</section>
<blockquote class="tpl-pull">[Một câu nói nghe được trong ngày.]</blockquote>
<h2 class="tpl-center">[Buổi chiều]</h2>
<p>[Hai câu.]</p>
<section class="tpl-gallery">
<figure>${img('3x4', '[Ảnh dọc 1]')}<figcaption>[Chú thích.]</figcaption></figure>
<figure>${img('3x4', '[Ảnh dọc 2]')}<figcaption>[Chú thích.]</figcaption></figure>
</section>
<figure class="tpl-full">${img('21x9', '[Ảnh kết: hoàng hôn, đóng cửa xưởng]')}<figcaption>[Chú thích ảnh kết.]</figcaption></figure>
<p>[Một câu kết.]</p>
<p class="tpl-byline">Ảnh và bài: [Tên người chụp] · [Ngày chụp]</p>
`,
};
