import { img, type ArticleTemplate } from './types';

const faq = (n: number) => `
<div class="tpl-item">
<h3>[Câu hỏi thường gặp ${n}?]</h3>
<p>[Trả lời ngắn gọn, đi thẳng vào ý, hai đến ba câu.]</p>
</div>`;

export const handbook: ArticleTemplate = {
  id: 'cam-nang',
  name: 'Cẩm nang có mục lục',
  description: 'Mục lục nhảy đến từng phần, các phần có ảnh + chữ, thẻ 3 cột, ghi chú – mẹo – lưu ý và khối hỏi đáp FAQ ở cuối.',
  bestFor: 'Cẩm nang đầy đủ về một chủ đề: bảo quản, chọn mua, hiểu nhãn, đặt hàng cho nhà hàng.',
  blocks: ['Mục lục', 'Ảnh + chữ', 'Thẻ 3 cột', 'Ghi chú / Mẹo / Lưu ý', 'Hai cột', 'Hỏi đáp FAQ'],
  title: 'Cẩm nang [chủ đề]: mọi điều cần biết',
  excerpt: 'Một bài đọc đủ cho cả người mới lẫn người đã quen — chia phần rõ ràng, có mục lục và phần hỏi đáp.',
  cover: '4x3',
  readingMinutes: 10,
  html: `
<p class="tpl-lead">[Đoạn dẫn: cẩm nang này trả lời câu hỏi gì, dành cho ai.]</p>
<section class="tpl-toc">
<p class="tpl-label">Mục lục</p>
<ol>
<li><a href="#phan-1">[Phần 1: hiểu đúng về …]</a></li>
<li><a href="#phan-2">[Phần 2: cách chọn …]</a></li>
<li><a href="#phan-3">[Phần 3: cách dùng / bảo quản …]</a></li>
<li><a href="#phan-4">[Phần 4: những lưu ý]</a></li>
<li><a href="#hoi-dap">Hỏi đáp</a></li>
</ol>
</section>
<h2 id="phan-1">[Phần 1: hiểu đúng về …]</h2>
<section class="tpl-split">
<div class="tpl-media"><figure class="tpl-framed">${img('4x3', '[Ảnh minh hoạ phần 1]')}</figure></div>
<div class="tpl-body">
<p>[Giải thích khái niệm chính bằng ngôn ngữ đời thường.]</p>
<p>[Một ví dụ cụ thể giúp người đọc hình dung.]</p>
</div>
</section>
<section class="tpl-callout tpl-note">
<p><strong>Ghi chú:</strong> [Một thông tin bổ sung, ví dụ cách đọc một thuật ngữ trên nhãn.]</p>
</section>
<h2 id="phan-2">[Phần 2: cách chọn …]</h2>
<p>[Đoạn mở phần 2.] Chia lựa chọn thành nhóm giúp người đọc quyết định nhanh hơn.</p>
<section class="tpl-cards">
<div class="tpl-item">${img('4x3', '[Ảnh nhóm 1]')}<h3>[Nhóm 1]</h3><p>[Hợp với ai, dịp nào.]</p></div>
<div class="tpl-item">${img('4x3', '[Ảnh nhóm 2]')}<h3>[Nhóm 2]</h3><p>[Hợp với ai, dịp nào.]</p></div>
<div class="tpl-item">${img('4x3', '[Ảnh nhóm 3]')}<h3>[Nhóm 3]</h3><p>[Hợp với ai, dịp nào.]</p></div>
</section>
<section class="tpl-callout tpl-tip">
<p><strong>Mẹo:</strong> [Một mẹo chọn mua — ví dụ kiểm tra tem, nắp, hạn dùng.]</p>
</section>
<h2 id="phan-3">[Phần 3: cách dùng / bảo quản …]</h2>
<ol class="tpl-steps">
<li><strong>[Việc 1]</strong> — [mô tả ngắn].</li>
<li><strong>[Việc 2]</strong> — [mô tả ngắn].</li>
<li><strong>[Việc 3]</strong> — [mô tả ngắn].</li>
<li><strong>[Việc 4]</strong> — [mô tả ngắn].</li>
</ol>
<figure class="tpl-wide">${img('21x9', '[Ảnh minh hoạ phần 3]')}<figcaption>[Chú thích.]</figcaption></figure>
<h2 id="phan-4">[Phần 4: những lưu ý]</h2>
<section class="tpl-cols">
<div>
<h3>Nên</h3>
<ul class="tpl-pros">
<li>[Điều nên làm 1]</li>
<li>[Điều nên làm 2]</li>
<li>[Điều nên làm 3]</li>
</ul>
</div>
<div>
<h3>Không nên</h3>
<ul class="tpl-cons">
<li>[Điều không nên 1]</li>
<li>[Điều không nên 2]</li>
<li>Uống rượu khi lái xe, khi đang mang thai, hoặc mời người dưới 18 tuổi.</li>
</ul>
</div>
</section>
<section class="tpl-callout tpl-warn">
<p><strong>Lưu ý quan trọng:</strong> [Cảnh báo cần thiết nhất của chủ đề.]</p>
</section>
<h2 id="hoi-dap">Hỏi đáp</h2>
<section class="tpl-faq">${[1, 2, 3, 4, 5].map(faq).join('')}
</section>
<p>[Câu kết và gợi ý bài viết liên quan.]</p>
`,
};
