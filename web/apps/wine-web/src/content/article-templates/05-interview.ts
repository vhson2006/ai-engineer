import { img, type ArticleTemplate } from './types';

const qa = (n: number) => `
<p class="tpl-q">[Câu hỏi ${n}?]</p>
<p class="tpl-a">[Câu trả lời ${n}. Giữ giọng nói thật của nhân vật, chỉ sửa lỗi chính tả và cắt những đoạn lặp. Một câu trả lời nên dài hai đến năm câu.]</p>`;

export const interview: ArticleTemplate = {
  id: 'phong-van',
  name: 'Phỏng vấn hỏi đáp',
  description: 'Thẻ giới thiệu nhân vật với ảnh chân dung, các cặp hỏi – đáp có ký hiệu, trích dẫn lớn chen giữa.',
  bestFor: 'Phỏng vấn nghệ nhân, chủ hãng, đối tác nhà hàng, khách hàng thân thiết.',
  blocks: ['Thẻ nhân vật', 'Ảnh chân dung', 'Hỏi – đáp', 'Trích dẫn lớn', 'Bộ ảnh đôi'],
  title: '[Tên nhân vật]: “[Một câu nói đáng nhớ trong buổi phỏng vấn]”',
  excerpt: 'Cuộc trò chuyện với [tên, vai trò] về [chủ đề] — những điều ít người biết sau [số] năm làm nghề.',
  cover: '3x2',
  readingMinutes: 7,
  html: `
<section class="tpl-split">
<div class="tpl-media"><figure class="tpl-portrait">${img('3x4', '[Ảnh chân dung nhân vật]')}</figure></div>
<div class="tpl-body">
<p class="tpl-kicker">Nhân vật</p>
<h2>[Họ tên nhân vật]</h2>
<p>[Vai trò hiện tại.] [Hai câu giới thiệu: bắt đầu làm nghề từ khi nào, điều gì làm nên tên tuổi.]</p>
<ul class="tpl-inline">
<li>[Vai trò]</li>
<li>[Số năm kinh nghiệm]</li>
<li>[Nơi làm việc]</li>
</ul>
</div>
</section>
<p class="tpl-lead">[Đoạn dẫn: buổi phỏng vấn diễn ra ở đâu, trong không khí thế nào, vì sao chọn nói chuyện với nhân vật lúc này.]</p>
<h2>Về những ngày đầu</h2>
<section class="tpl-qa">${qa(1)}${qa(2)}${qa(3)}
</section>
<blockquote class="tpl-pull">[Câu trả lời đắt giá nhất, trích nguyên văn.]</blockquote>
<h2>Về nghề hôm nay</h2>
<section class="tpl-qa">${qa(4)}${qa(5)}
</section>
<section class="tpl-gallery">
<figure>${img('4x3', '[Ảnh nhân vật đang làm việc]')}<figcaption>[Chú thích.]</figcaption></figure>
<figure>${img('4x3', '[Ảnh chi tiết đôi tay, dụng cụ]')}<figcaption>[Chú thích.]</figcaption></figure>
</section>
<section class="tpl-qa">${qa(6)}${qa(7)}
</section>
<h2>Về những năm tới</h2>
<section class="tpl-qa">${qa(8)}
<p class="tpl-q">[Câu hỏi cuối: lời nhắn gửi đến người đọc?]</p>
<p class="tpl-a">[Câu trả lời cuối — để nhân vật nói lời kết.]</p>
</section>
<p class="tpl-byline">Phỏng vấn: [Tên phóng viên] · Ảnh: [Tên người chụp] · Nội dung đã được nhân vật đọc duyệt.</p>
`,
};
