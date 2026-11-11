import { img, type ArticleTemplate } from './types';

export const steps: ArticleTemplate = {
  id: 'huong-dan-tung-buoc',
  name: 'Hướng dẫn từng bước',
  description: 'Hộp “bạn cần chuẩn bị”, các bước đánh số nối nhau bằng đường kẻ, mỗi bước có ảnh, mẹo và lưu ý.',
  bestFor: 'Cách thưởng thức, cách bảo quản, cách chọn quà, cách trưng bày tại nhà hàng.',
  blocks: ['Thông tin nhanh', 'Danh sách kiểm', 'Bước đánh số', 'Mẹo', 'Lưu ý', 'Tóm tắt'],
  title: 'Cách [làm việc gì đó] đúng chuẩn trong [số] bước',
  excerpt: 'Hướng dẫn rõ ràng, từng bước có ảnh minh hoạ, kèm mẹo nhỏ và những lỗi thường gặp cần tránh.',
  cover: '16x9',
  readingMinutes: 6,
  html: `
<p class="tpl-lead">[Một đoạn ngắn: hướng dẫn này giúp người đọc làm được gì và vì sao nên làm đúng cách.] Người đọc bài hướng dẫn muốn biết ngay mình cần bao lâu và cần gì.</p>
<section class="tpl-facts">
<p><strong>Thời gian</strong> [Ví dụ: 10 phút]</p>
<p><strong>Mức độ</strong> [Dễ / Trung bình]</p>
<p><strong>Dành cho</strong> [Ví dụ: tiệc gia đình 6–8 người]</p>
<p><strong>Lưu ý</strong> Chỉ dành cho người từ 18 tuổi trở lên.</p>
</section>
<section class="tpl-callout tpl-note">
<h3>Bạn cần chuẩn bị</h3>
<ul class="tpl-check">
<li>[Dụng cụ hoặc nguyên liệu thứ nhất]</li>
<li>[Dụng cụ thứ hai]</li>
<li>[Dụng cụ thứ ba]</li>
<li>[Dụng cụ thứ tư]</li>
</ul>
</section>
<h2>Các bước thực hiện</h2>
<section class="tpl-steps">
<div class="tpl-item">
<h3>[Bước 1: tên ngắn, bắt đầu bằng động từ]</h3>
<p>[Mô tả bước 1 trong hai, ba câu: làm gì, làm thế nào, dấu hiệu nào cho biết đã đúng.]</p>
<figure>${img('16x9', '[Ảnh minh hoạ bước 1]')}</figure>
</div>
<div class="tpl-item">
<h3>[Bước 2]</h3>
<p>[Mô tả bước 2.] Mỗi bước chỉ nên có một hành động chính; nếu phải dùng chữ “và” quá nhiều, hãy tách thành hai bước.</p>
<figure>${img('16x9', '[Ảnh minh hoạ bước 2]')}</figure>
</div>
<div class="tpl-item">
<h3>[Bước 3]</h3>
<p>[Mô tả bước 3.]</p>
<section class="tpl-callout tpl-tip">
<p><strong>Mẹo nhỏ:</strong> [Một mẹo giúp làm nhanh hơn hoặc đẹp hơn ở bước này.]</p>
</section>
</div>
<div class="tpl-item">
<h3>[Bước 4]</h3>
<p>[Mô tả bước 4.]</p>
<figure>${img('16x9', '[Ảnh minh hoạ bước 4]')}</figure>
</div>
<div class="tpl-item">
<h3>[Bước 5: hoàn tất]</h3>
<p>[Mô tả kết quả cuối cùng người đọc sẽ thấy.]</p>
</div>
</section>
<section class="tpl-callout tpl-warn">
<h3>Những lỗi thường gặp</h3>
<ul>
<li>[Lỗi thứ nhất và cách tránh.]</li>
<li>[Lỗi thứ hai và cách tránh.]</li>
<li>[Lỗi thứ ba và cách tránh.]</li>
</ul>
</section>
<h2>Gợi ý cho từng dịp</h2>
<section class="tpl-cols">
<div>
<h3>[Dịp thứ nhất]</h3>
<p>[Cách điều chỉnh hướng dẫn cho dịp này: số lượng, cách bày, thời điểm.]</p>
</div>
<div>
<h3>[Dịp thứ hai]</h3>
<p>[Cách điều chỉnh cho dịp thứ hai.]</p>
</div>
</section>
<section class="tpl-summary">
<h3>Tóm tắt nhanh</h3>
<ol>
<li>[Bước 1 trong một dòng]</li>
<li>[Bước 2 trong một dòng]</li>
<li>[Bước 3 trong một dòng]</li>
<li>[Bước 4 trong một dòng]</li>
<li>[Bước 5 trong một dòng]</li>
</ol>
</section>
<p>[Câu kết: mời người đọc thử, hoặc gợi ý bài viết liên quan.] Uống có trách nhiệm, không lái xe sau khi uống rượu.</p>
`,
};
