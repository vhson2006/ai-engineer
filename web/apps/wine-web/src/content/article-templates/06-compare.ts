import { img, type ArticleTemplate } from './types';

export const compare: ArticleTemplate = {
  id: 'so-sanh',
  name: 'So sánh hai lựa chọn',
  description: 'Hai thẻ đối đầu có ảnh, bảng đặc điểm, ưu – nhược điểm hai cột và hộp kết luận nổi bật.',
  bestFor: 'So sánh hai dòng sản phẩm, hai cách thưởng thức, hai loại quà, hai gói hợp tác.',
  blocks: ['Thẻ đối đầu', 'Bảng đặc điểm', 'Ưu / nhược', 'Hai cột', 'Kết luận'],
  title: '[Lựa chọn A] hay [Lựa chọn B]: chọn loại nào cho [dịp]?',
  excerpt: 'Đặt hai lựa chọn cạnh nhau theo cùng tiêu chí, để người đọc tự quyết định trong vài phút.',
  cover: '16x9',
  readingMinutes: 6,
  html: `
<p class="tpl-lead">[Đoạn dẫn: vì sao nhiều người phân vân giữa hai lựa chọn này.] So sánh công bằng nghĩa là dùng cùng tiêu chí cho cả hai và nói thẳng điểm yếu của mỗi bên.</p>
<section class="tpl-compare">
<div class="tpl-item">
<figure>${img('4x3', '[Ảnh lựa chọn A]')}</figure>
<p class="tpl-label">Lựa chọn A</p>
<h3>[Tên lựa chọn A]</h3>
<p>[Một câu mô tả A.]</p>
</div>
<div class="tpl-item">
<figure>${img('4x3', '[Ảnh lựa chọn B]')}</figure>
<p class="tpl-label">Lựa chọn B</p>
<h3>[Tên lựa chọn B]</h3>
<p>[Một câu mô tả B.]</p>
</div>
</section>
<h2>Đặc điểm chính</h2>
<section class="tpl-facts">
<p><strong>Tiêu chí 1</strong> A: [giá trị] · B: [giá trị]</p>
<p><strong>Tiêu chí 2</strong> A: [giá trị] · B: [giá trị]</p>
<p><strong>Tiêu chí 3</strong> A: [giá trị] · B: [giá trị]</p>
<p><strong>Tiêu chí 4</strong> A: [giá trị] · B: [giá trị]</p>
<p><strong>Giá tham khảo</strong> Theo bảng giá hiện hành của hãng.</p>
</section>
<h2>Điểm mạnh và điểm cần cân nhắc</h2>
<section class="tpl-compare">
<div class="tpl-item">
<h3>[Lựa chọn A]</h3>
<ul class="tpl-pros">
<li>[Điểm mạnh 1]</li>
<li>[Điểm mạnh 2]</li>
<li>[Điểm mạnh 3]</li>
</ul>
<ul class="tpl-cons">
<li>[Điểm cần cân nhắc 1]</li>
<li>[Điểm cần cân nhắc 2]</li>
</ul>
</div>
<div class="tpl-item">
<h3>[Lựa chọn B]</h3>
<ul class="tpl-pros">
<li>[Điểm mạnh 1]</li>
<li>[Điểm mạnh 2]</li>
<li>[Điểm mạnh 3]</li>
</ul>
<ul class="tpl-cons">
<li>[Điểm cần cân nhắc 1]</li>
<li>[Điểm cần cân nhắc 2]</li>
</ul>
</div>
</section>
<h2>Theo từng tình huống</h2>
<section class="tpl-split">
<div class="tpl-media"><figure>${img('4x3', '[Ảnh tình huống 1]')}</figure></div>
<div class="tpl-body">
<h3>[Tình huống 1: ví dụ bữa cơm gia đình]</h3>
<p>[Lựa chọn nào hợp hơn và vì sao, trong ba câu.]</p>
</div>
</section>
<section class="tpl-split-reverse">
<div class="tpl-media"><figure>${img('4x3', '[Ảnh tình huống 2]')}</figure></div>
<div class="tpl-body">
<h3>[Tình huống 2: ví dụ quà biếu]</h3>
<p>[Lựa chọn nào hợp hơn và vì sao.]</p>
</div>
</section>
<section class="tpl-split">
<div class="tpl-media"><figure>${img('4x3', '[Ảnh tình huống 3]')}</figure></div>
<div class="tpl-body">
<h3>[Tình huống 3: ví dụ nhà hàng]</h3>
<p>[Lựa chọn nào hợp hơn và vì sao.]</p>
</div>
</section>
<section class="tpl-summary">
<h3>Kết luận</h3>
<p><strong>Chọn [A] nếu</strong> [điều kiện].</p>
<p><strong>Chọn [B] nếu</strong> [điều kiện].</p>
<p class="tpl-small">[Còn phân vân? Gợi ý cách liên hệ để được tư vấn.]</p>
</section>
`,
};
