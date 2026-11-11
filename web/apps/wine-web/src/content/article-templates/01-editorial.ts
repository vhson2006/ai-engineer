import { img, type ArticleTemplate } from './types';

export const editorial: ArticleTemplate = {
  id: 'tap-chi',
  name: 'Tạp chí cổ điển',
  description: 'Mở bài in đậm với chữ cái lớn, ảnh tràn rộng, trích dẫn nổi bật và ảnh xen kẽ hai bên chữ.',
  bestFor: 'Câu chuyện thương hiệu, bài chân dung, bài viết dài cần cảm giác sang trọng.',
  blocks: ['Mở bài lớn', 'Chữ cái đầu', 'Ảnh tràn rộng', 'Ảnh trái/phải', 'Trích dẫn nổi bật', 'Hộp tối'],
  title: '[Tiêu đề câu chuyện]: hành trình giữ lửa một nghề truyền thống',
  excerpt: 'Một bài viết dài theo phong cách tạp chí: mở đầu bằng không khí, dẫn dắt bằng hình ảnh và khép lại bằng một thông điệp đáng nhớ.',
  cover: '21x9',
  readingMinutes: 8,
  html: `
<p class="tpl-lead tpl-dropcap">Có những nghề không học được trong một mùa. [Mở bài: tả một khoảnh khắc cụ thể — buổi sáng ở xưởng, mùi men, tiếng nước sôi — để người đọc bước ngay vào câu chuyện. Hai đến ba câu, giàu hình ảnh, chưa vội nói đến sản phẩm.]</p>
<p>Đoạn thứ hai mở rộng bối cảnh: câu chuyện này diễn ra ở đâu, ai là người giữ nghề, và vì sao điều đó đáng để kể hôm nay. Hãy viết như đang trò chuyện với một người bạn lần đầu ghé thăm — chậm rãi, cụ thể, tránh những tính từ chung chung như “tuyệt hảo”, “hàng đầu”. Một chi tiết thật luôn thuyết phục hơn mười lời khen.</p>
<figure class="tpl-wide">${img('21x9', '[Mô tả ảnh: toàn cảnh xưởng hoặc vùng nguyên liệu]')}<figcaption>[Chú thích ảnh: nơi chụp, thời điểm, ai trong ảnh.]</figcaption></figure>
<h2>Một nghề bắt đầu từ [địa danh]</h2>
<p>[Kể nguồn gốc: người đầu tiên, năm bắt đầu (chỉ ghi khi có giấy tờ), lý do chọn nghề.] Phần này nên dùng mốc thời gian và tên người thật đã được xác nhận. Nếu chưa chắc, hãy để trống thay vì phỏng đoán — một bài viết thương hiệu mất uy tín rất nhanh vì một con số sai.</p>
<figure class="tpl-right">${img('3x4', '[Ảnh chân dung người giữ nghề]')}<figcaption>[Tên, vai trò, năm gắn bó với nghề.]</figcaption></figure>
<p>Đặt ảnh chân dung bên cạnh đoạn kể về con người giúp bài viết có nhịp: mắt người đọc đi từ chữ sang khuôn mặt rồi quay lại chữ. Đoạn văn cạnh ảnh nên dài vừa đủ để chữ ôm quanh ảnh — khoảng sáu đến tám dòng.</p>
<p>[Kể một kỷ niệm, một thất bại hay một bước ngoặt. Ví dụ: lần đầu mẻ rượu hỏng, lần đổi công thức, lần đầu có khách từ xa tìm đến.] Những chi tiết đời thường khiến thương hiệu trở thành con người.</p>
<p>Kết đoạn bằng một câu nối sang phần sau, để người đọc muốn đọc tiếp: điều gì đã thay đổi kể từ đó?</p>
<blockquote class="tpl-pull">[Một câu nói thật của nhân vật — ngắn, có hình ảnh, nói về giá trị chứ không phải quảng cáo.]</blockquote>
<h2>Từ hạt gạo đến [sản phẩm]</h2>
<p>[Mô tả quy trình ở mức người đọc phổ thông hiểu được: nguyên liệu, công đoạn chính, thời gian.] Chỉ nêu những gì hãng công khai được; công thức riêng không cần kể. Nếu có chứng nhận hay kiểm định, ghi rõ tên và năm.</p>
<figure class="tpl-left">${img('4x3', '[Ảnh công đoạn sản xuất]')}<figcaption>[Công đoạn trong ảnh.]</figcaption></figure>
<p>Ảnh đặt bên trái tạo nhịp đối xứng với ảnh chân dung bên phải ở phần trước. Hãy chọn ảnh có bàn tay người làm, hơi nước, ánh sáng tự nhiên — những thứ máy ảnh điện thoại cũng chụp đẹp được.</p>
<p>[Giải thích một công đoạn đặc biệt và vì sao nó tạo nên khác biệt về hương vị hoặc trải nghiệm. Tránh mọi tuyên bố về sức khoẻ.]</p>
<p>[Thêm một đoạn về con người trong xưởng: bao nhiêu người, họ làm gì mỗi ngày.]</p>
<hr class="tpl-ornament" />
<section class="tpl-dark">
<h3>Điều [tên thương hiệu] luôn giữ</h3>
<p>[Ba giá trị cốt lõi, mỗi giá trị một câu. Ví dụ: nguyên liệu rõ nguồn gốc, quy trình có kiểm soát, minh bạch thông tin cho khách.]</p>
<ul>
<li>[Giá trị thứ nhất]</li>
<li>[Giá trị thứ hai]</li>
<li>[Giá trị thứ ba]</li>
</ul>
</section>
<h2>Hôm nay và những năm tới</h2>
<p>[Kể hiện tại: sản phẩm đang có, nơi khách có thể tìm thấy.] Sau đó nói về một kế hoạch cụ thể đã được quyết định — một dòng sản phẩm mới, một xưởng mở rộng, một đối tác — thay vì những lời hứa chung chung.</p>
<figure class="tpl-wide tpl-framed">${img('16x9', '[Ảnh không gian trưng bày hoặc sản phẩm]')}<figcaption>[Chú thích.]</figcaption></figure>
<p>Đoạn kết nên quay lại hình ảnh ở mở bài — buổi sáng ở xưởng, mùi men, tiếng nước sôi — để bài viết khép thành một vòng tròn. [Câu kết: một lời mời ghé thăm, tìm hiểu thêm hoặc liên hệ.]</p>
<p class="tpl-byline">Bài: [Tên tác giả] · Ảnh: [Tên người chụp]</p>
`,
};
