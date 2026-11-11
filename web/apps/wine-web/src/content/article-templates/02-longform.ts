import { img, type ArticleTemplate } from './types';

export const longform: ArticleTemplate = {
  id: 'phong-su-chuong',
  name: 'Phóng sự nhiều chương',
  description: 'Bài dài chia thành các chương có tiêu đề lớn ở giữa, mỗi chương mở bằng một ảnh toàn màn hình.',
  bestFor: 'Phóng sự, ký sự chuyến đi vùng nguyên liệu, câu chuyện một năm làm nghề.',
  blocks: ['Chương đánh số', 'Ảnh toàn màn hình', 'Mở bài lớn', 'Trích dẫn giữa trang', 'Đường kẻ trang trí'],
  title: '[Một năm ở xưởng]: bốn mùa của một mẻ rượu',
  excerpt: 'Phóng sự dài chia bốn chương. Mỗi chương là một mùa, một công đoạn, một nhóm người — đọc như một cuốn sách nhỏ.',
  cover: '16x9',
  readingMinutes: 12,
  html: `
<p class="tpl-lead">[Đoạn dẫn của cả bài: phóng sự này theo chân ai, trong bao lâu, để trả lời câu hỏi gì.] Người đọc nên biết ngay từ đầu bài viết dài bao nhiêu chương và mỗi chương nói về điều gì.</p>
<section class="tpl-toc">
<p class="tpl-label">Trong bài này</p>
<ol>
<li><a href="#chuong-1">Chương 1 · [Tên chương]</a></li>
<li><a href="#chuong-2">Chương 2 · [Tên chương]</a></li>
<li><a href="#chuong-3">Chương 3 · [Tên chương]</a></li>
<li><a href="#chuong-4">Chương 4 · [Tên chương]</a></li>
</ol>
</section>
<section class="tpl-chapter">
<p class="tpl-kicker">Chương 1</p>
<h2 class="tpl-chapter-title" id="chuong-1">[Mùa nguyên liệu]</h2>
<p class="tpl-lead">[Một câu tóm tắt chương, in nghiêng và nhỏ hơn tiêu đề.]</p>
</section>
<figure class="tpl-full">${img('21x9', '[Ảnh toàn cảnh mở chương 1]')}<figcaption>[Chú thích ảnh mở chương.]</figcaption></figure>
<p>Mỗi chương bắt đầu bằng một cảnh cụ thể: ngày, giờ, thời tiết, người đang làm gì. [Viết cảnh mở chương 1.] Người đọc phóng sự dài cần được dẫn đường bằng cảnh, không phải bằng định nghĩa.</p>
<p>[Thông tin chính của chương: nguyên liệu lấy từ đâu, được chọn thế nào, ai chọn.] Xen kẽ lời kể với câu nói trực tiếp của nhân vật giúp chương sống động.</p>
<p>[Một chi tiết bất ngờ — điều người ngoài nghề ít biết.] Đây thường là đoạn được chia sẻ nhiều nhất.</p>
<p>[Kết chương bằng một câu chuyển: công việc tiếp theo là gì.]</p>
<hr class="tpl-ornament" />
<section class="tpl-chapter">
<p class="tpl-kicker">Chương 2</p>
<h2 class="tpl-chapter-title" id="chuong-2">[Mùa ủ men]</h2>
<p class="tpl-lead">[Câu tóm tắt chương 2.]</p>
</section>
<figure class="tpl-full">${img('21x9', '[Ảnh mở chương 2]')}<figcaption>[Chú thích.]</figcaption></figure>
<p>[Cảnh mở chương 2.] Chương giữa của một phóng sự thường là nơi kể về sự chờ đợi và kiên nhẫn — hãy để nhịp văn chậm lại, câu dài hơn, nhiều chi tiết giác quan hơn.</p>
<p>[Thông tin chính: công đoạn, thời gian, điều kiện cần giữ.] Nếu có số liệu, chỉ dùng số đã được xác nhận.</p>
<blockquote class="tpl-pull">[Câu nói đáng nhớ nhất của chương — điều nhân vật nói khi được hỏi vì sao vẫn làm theo cách cũ.]</blockquote>
<p>[Đoạn sau trích dẫn: giải thích bối cảnh câu nói, hoặc phản hồi của một người khác.]</p>
<figure class="tpl-wide">${img('16x9', '[Ảnh chi tiết trong chương 2]')}<figcaption>[Chú thích.]</figcaption></figure>
<p>[Kết chương 2.]</p>
<hr class="tpl-ornament" />
<section class="tpl-chapter">
<p class="tpl-kicker">Chương 3</p>
<h2 class="tpl-chapter-title" id="chuong-3">[Mùa chưng cất]</h2>
<p class="tpl-lead">[Câu tóm tắt chương 3.]</p>
</section>
<figure class="tpl-full">${img('21x9', '[Ảnh mở chương 3]')}<figcaption>[Chú thích.]</figcaption></figure>
<p>[Cảnh mở chương 3 — thường là cao trào: lửa, hơi nước, tiếng máy, nhiều người cùng làm.] Câu ngắn hơn, động từ mạnh hơn.</p>
<p>[Thông tin chính của chương 3.]</p>
<section class="tpl-gallery">
<figure>${img('4x3', '[Ảnh 1 trong chương 3]')}<figcaption>[Chú thích.]</figcaption></figure>
<figure>${img('4x3', '[Ảnh 2 trong chương 3]')}<figcaption>[Chú thích.]</figcaption></figure>
</section>
<p>[Một sự cố hay một khó khăn trong mùa này và cách mọi người vượt qua.]</p>
<p>[Kết chương 3.]</p>
<hr class="tpl-ornament" />
<section class="tpl-chapter">
<p class="tpl-kicker">Chương 4</p>
<h2 class="tpl-chapter-title" id="chuong-4">[Mùa đến tay khách]</h2>
<p class="tpl-lead">[Câu tóm tắt chương 4.]</p>
</section>
<figure class="tpl-full">${img('21x9', '[Ảnh mở chương 4]')}<figcaption>[Chú thích.]</figcaption></figure>
<p>[Cảnh mở chương cuối: kiểm tra, đóng chai, vận chuyển, cửa hàng.]</p>
<p>[Thông tin chính: sản phẩm được kiểm tra thế nào trước khi bán, khách tìm mua ở đâu.]</p>
<p>[Đoạn kết cả bài: quay lại câu hỏi ở đoạn dẫn và trả lời nó.] Một phóng sự hay khép lại bằng cảm xúc, không phải bằng khẩu hiệu.</p>
<p class="tpl-byline">Thực hiện: [Tên tác giả] · Ảnh: [Tên người chụp] · [Tháng, năm]</p>
`,
};
