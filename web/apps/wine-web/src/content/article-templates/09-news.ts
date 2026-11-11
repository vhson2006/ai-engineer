import { img, type ArticleTemplate } from './types';

export const news: ArticleTemplate = {
  id: 'tin-tuc',
  name: 'Tin tức & thông báo',
  description: 'Hộp “điểm chính” lên đầu, bảng thông tin sự kiện, ảnh trái phải, ba thẻ chi tiết và dải kêu gọi liên hệ.',
  bestFor: 'Ra mắt sản phẩm, sự kiện, chương trình hợp tác, thông báo lịch nghỉ, cảnh báo hàng giả.',
  blocks: ['Điểm chính', 'Bảng thông tin', 'Ảnh + chữ', 'Thẻ 3 cột', 'Dải liên hệ'],
  title: '[Tên hãng] [ra mắt / thông báo] [nội dung] từ [ngày]',
  excerpt: 'Tin ngắn gọn, đủ ý: điểm chính ngay đầu bài, chi tiết và cách liên hệ ở phía dưới.',
  cover: '16x9',
  readingMinutes: 4,
  html: `
<section class="tpl-summary">
<h3>Điểm chính</h3>
<ul class="tpl-check">
<li>[Điều gì xảy ra]</li>
<li>[Bắt đầu từ ngày nào, ở đâu]</li>
<li>[Ai được áp dụng / tham gia]</li>
<li>[Cần làm gì để tham gia / biết thêm]</li>
</ul>
</section>
<p class="tpl-lead">[Đoạn tin chính theo lối “ai – cái gì – khi nào – ở đâu – vì sao”, tối đa bốn câu.]</p>
<section class="tpl-facts">
<p><strong>Thời gian</strong> [Từ ngày … đến ngày …]</p>
<p><strong>Địa điểm</strong> [Địa chỉ]</p>
<p><strong>Đối tượng</strong> [Khách hàng / đại lý / nhà hàng — từ 18 tuổi]</p>
<p><strong>Liên hệ</strong> [Số điện thoại, Zalo]</p>
</section>
<figure class="tpl-wide">${img('16x9', '[Ảnh sự kiện hoặc sản phẩm]')}<figcaption>[Chú thích.]</figcaption></figure>
<h2>Bối cảnh</h2>
<p>[Vì sao hãng đưa ra thông báo / chương trình này lúc này: nhu cầu của khách, phản hồi của đại lý, một dịp đặc biệt.] Phần bối cảnh giúp tin không chỉ là thông báo khô khan mà trả lời được câu hỏi “vì sao”.</p>
<p>[Nếu đây là phần tiếp theo của một chương trình trước, nhắc lại ngắn gọn kết quả lần trước — chỉ dùng số liệu đã xác nhận.]</p>
<h2>Chi tiết</h2>
<section class="tpl-split">
<div class="tpl-media"><figure>${img('4x3', '[Ảnh chi tiết]')}</figure></div>
<div class="tpl-body">
<p>[Thông tin chi tiết thứ nhất: nội dung chương trình, sản phẩm, điều kiện.]</p>
<p>[Thông tin chi tiết thứ hai.]</p>
</div>
</section>
<section class="tpl-cards">
<div class="tpl-item"><h3>[Ý 1]</h3><p>[Mô tả ngắn.]</p></div>
<div class="tpl-item"><h3>[Ý 2]</h3><p>[Mô tả ngắn.]</p></div>
<div class="tpl-item"><h3>[Ý 3]</h3><p>[Mô tả ngắn.]</p></div>
</section>
<h2>Lịch trình</h2>
<ol class="tpl-steps">
<li><strong>[Ngày / giờ]</strong> — [Hoạt động thứ nhất: mở đăng ký, khai mạc, bắt đầu áp dụng.]</li>
<li><strong>[Ngày / giờ]</strong> — [Hoạt động thứ hai.]</li>
<li><strong>[Ngày / giờ]</strong> — [Hoạt động thứ ba.]</li>
<li><strong>[Ngày / giờ]</strong> — [Kết thúc, công bố kết quả hoặc ngày áp dụng chính thức.]</li>
</ol>
<section class="tpl-gallery">
<figure>${img('4x3', '[Ảnh minh hoạ 1]')}<figcaption>[Chú thích.]</figcaption></figure>
<figure>${img('4x3', '[Ảnh minh hoạ 2]')}<figcaption>[Chú thích.]</figcaption></figure>
</section>
<h2>Hỏi nhanh</h2>
<section class="tpl-faq">
<div class="tpl-item"><h3>[Ai được tham gia / áp dụng?]</h3><p>[Trả lời ngắn.]</p></div>
<div class="tpl-item"><h3>[Cần chuẩn bị gì?]</h3><p>[Trả lời ngắn.]</p></div>
<div class="tpl-item"><h3>[Liên hệ ở đâu nếu có thắc mắc?]</h3><p>[Trả lời ngắn.]</p></div>
</section>
<section class="tpl-callout tpl-warn">
<h3>Lưu ý</h3>
<p>[Điều kiện, giới hạn, hoặc cảnh báo — ví dụ cách nhận biết hàng chính hãng.]</p>
</section>
<p>[Trích lời người đại diện hãng, nếu có.]</p>
<section class="tpl-cta">
<h3>[Cần thêm thông tin?]</h3>
<p>[Gọi số … hoặc nhắn Zalo … — trong giờ làm việc.]</p>
</section>
`,
};
