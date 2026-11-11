import { img, type ArticleTemplate } from './types';

const milestone = (n: number, withImage: boolean) => `
<div class="tpl-item">
<h3 class="tpl-year">[Năm ${n}]</h3>
<p><strong>[Sự kiện ${n}]</strong> — [Hai câu kể chuyện gì đã xảy ra, ai tham gia, kết quả ra sao. Chỉ ghi mốc có giấy tờ hoặc người xác nhận.]</p>${
  withImage ? `\n<figure>${img('16x9', `[Ảnh tư liệu mốc ${n}]`)}<figcaption>[Nguồn ảnh tư liệu.]</figcaption></figure>` : ''
}
</div>`;

export const timeline: ArticleTemplate = {
  id: 'dong-thoi-gian',
  name: 'Dòng thời gian',
  description: 'Các mốc năm lớn nối bằng đường kẻ vàng, xen ảnh tư liệu, mở đầu bằng dải con số và khép lại bằng hộp tối.',
  bestFor: 'Lịch sử thương hiệu, kỷ niệm năm thành lập, chặng đường một sản phẩm.',
  blocks: ['Dải con số', 'Mốc thời gian', 'Ảnh tư liệu', 'Trích dẫn', 'Hộp tối'],
  title: '[Số] năm [tên thương hiệu]: những mốc đáng nhớ',
  excerpt: 'Nhìn lại chặng đường qua từng mốc — mỗi mốc một câu chuyện, một bức ảnh tư liệu.',
  cover: '21x9',
  readingMinutes: 7,
  html: `
<p class="tpl-lead">[Đoạn dẫn: vì sao nhìn lại lúc này — một dịp kỷ niệm, một cột mốc mới.]</p>
<section class="tpl-stats">
<p><strong>[Số]</strong> [năm hoạt động]</p>
<p><strong>[Số]</strong> [dòng sản phẩm]</p>
<p><strong>[Số]</strong> [đối tác / đại lý]</p>
<p><strong>[Số]</strong> [người trong đội ngũ]</p>
</section>
<p class="tpl-small">Các con số chỉ ghi khi đã được xác nhận; xoá ô nào chưa có số liệu.</p>
<h2>Chặng đường</h2>
<section class="tpl-timeline">${milestone(1, true)}${milestone(2, false)}${milestone(3, true)}${milestone(4, false)}${milestone(5, false)}${milestone(6, true)}
</section>
<blockquote class="tpl-pull">[Một câu của người sáng lập hoặc người giữ nghề lâu năm nhất, nói về chặng đường.]</blockquote>
<h2>Những người làm nên chặng đường</h2>
<section class="tpl-gallery-3">
<figure>${img('3x4', '[Ảnh người 1]')}<figcaption>[Tên, vai trò]</figcaption></figure>
<figure>${img('3x4', '[Ảnh người 2]')}<figcaption>[Tên, vai trò]</figcaption></figure>
<figure>${img('3x4', '[Ảnh người 3]')}<figcaption>[Tên, vai trò]</figcaption></figure>
</section>
<p>[Một đoạn tri ân: khách hàng, đối tác, nhân viên.]</p>
<section class="tpl-dark">
<h3>Mốc tiếp theo</h3>
<p>[Kế hoạch đã được quyết định cho thời gian tới — chỉ ghi điều chắc chắn sẽ làm.]</p>
</section>
`,
};
