import { img, type ArticleTemplate } from './types';

const item = (rank: number) => `
<div class="tpl-item">
<div class="tpl-media"><figure>${img('1x1', `[Ảnh mục ${rank}]`)}</figure></div>
<div class="tpl-body">
<p class="tpl-rank">${String(rank).padStart(2, '0')}</p>
<h3>[Tên mục ${rank}]</h3>
<p>[Hai đến ba câu giới thiệu mục ${rank}: nó là gì, điểm khác biệt, hợp với ai.]</p>
<ul class="tpl-inline">
<li>[Nhãn 1]</li>
<li>[Nhãn 2]</li>
<li>[Nhãn 3]</li>
</ul>
</div>
</div>`;

export const ranked: ArticleTemplate = {
  id: 'danh-sach-top',
  name: 'Danh sách nổi bật',
  description: 'Các mục đánh số lớn, ảnh vuông xen kẽ trái phải, mỗi mục có nhãn phân loại; mở đầu bằng thẻ tổng quan.',
  bestFor: 'Top sản phẩm, gợi ý quà Tết, những điểm đến, những món ăn nên kết hợp.',
  blocks: ['Thẻ tổng quan', 'Mục đánh số', 'Ảnh xen kẽ', 'Nhãn', 'Hộp tối kết luận'],
  title: '[Số] gợi ý [chủ đề] cho [dịp]',
  excerpt: 'Danh sách được chọn lọc, mỗi gợi ý có ảnh, mô tả ngắn và nhãn để người đọc chọn nhanh.',
  cover: '3x2',
  readingMinutes: 5,
  html: `
<p class="tpl-lead">[Đoạn dẫn: danh sách này dành cho ai, được chọn theo tiêu chí gì.] Nói rõ tiêu chí giúp người đọc tin danh sách hơn.</p>
<section class="tpl-cards">
<div class="tpl-item">${img('4x3', '[Ảnh nhóm 1]')}<h3>[Nhóm 1]</h3><p>[Mô tả nhóm và các mục thuộc nhóm.]</p></div>
<div class="tpl-item">${img('4x3', '[Ảnh nhóm 2]')}<h3>[Nhóm 2]</h3><p>[Mô tả nhóm 2.]</p></div>
<div class="tpl-item">${img('4x3', '[Ảnh nhóm 3]')}<h3>[Nhóm 3]</h3><p>[Mô tả nhóm 3.]</p></div>
</section>
<h2>Danh sách chi tiết</h2>
<section class="tpl-ranked">${[1, 2, 3, 4, 5, 6].map(item).join('')}
</section>
<section class="tpl-dark">
<h3>Chọn thế nào cho đúng?</h3>
<p>[Một đoạn kết luận: nếu người đọc chỉ nhớ một điều, đó là gì.]</p>
<ul>
<li>[Nếu bạn cần ..., hãy chọn mục số ...]</li>
<li>[Nếu bạn cần ..., hãy chọn mục số ...]</li>
<li>[Nếu bạn cần ..., hãy chọn mục số ...]</li>
</ul>
</section>
<p>[Câu kết: hỏi ý kiến người đọc hoặc mời liên hệ để được tư vấn.]</p>
`,
};
