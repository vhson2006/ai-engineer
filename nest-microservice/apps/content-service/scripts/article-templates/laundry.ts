/**
 * The sample article of laundry-web (Giặt sấy SFaster), in Vietnamese and English: a guide for the
 * people who write the site's articles. Each part is one layout block of ADR 0033, in the order of
 * the admin editor's "Insert block" menu, and explains when to use it and how to add it. Its
 * images are the site's own SVG drawings (`web/apps/laundry-web/public/images/guide/`).
 */

export type Locale = 'vi' | 'en';
/** Picks the text of the language being built: L('Xin chào', 'Hello'). */
export type L = (vi: string, en: string) => string;

export interface ArticleTemplateSeed {
  /** Stable key: the seed finds the article again by its Vietnamese slug. */
  key: string;
  categoryKey: 'tips' | 'services' | 'shop';
  title: (l: L) => string;
  slug: Record<Locale, string>;
  /** Vietnamese slugs this template had before: the seed still finds (and renames) its article. */
  formerSlugs?: string[];
  excerpt: (l: L) => string;
  body: (l: L) => string;
}

const guideImage = (file: string, alt: string, width: number, height: number) =>
  `<img src="/images/guide/${file}" alt="${alt}" width="${width}" height="${height}" loading="lazy" />`;

/** One block of the guide: what it is for, then the block itself. */
const item = (title: string, text: string) =>
  `<div class="tpl-item"><h3>${title}</h3><p>${text}</p></div>`;

const guide: ArticleTemplateSeed = {
  key: 'guide',
  categoryKey: 'shop',
  slug: { vi: 'mau-huong-dan-tao-bai-viet', en: 'template-how-to-build-an-article' },
  // The article the owner built block by block in the admin site, renamed for this purpose.
  formerSlugs: ['gia-giat-say-duoc-tinh-the-nao'],
  title: (l) =>
    l(
      '[Mẫu] Hướng dẫn tạo bài viết với các khối bố cục',
      '[Template] How to build an article with layout blocks',
    ),
  excerpt: (l) =>
    l(
      'Bài mẫu cho người viết: từng khối bố cục (hộp ghi chú, thẻ, hai cột, các bước, ảnh và chữ, hỏi đáp…) kèm hướng dẫn khi nào dùng và cách thêm trong trang quản trị.',
      'A sample for writers: every layout block (note box, cards, two columns, steps, image and text, questions…) with when to use it and how to add it in the admin site.',
    ),
  body: (l) => `
<p class="tpl-lead">${l(
    'Bài này là một bài mẫu. Mỗi phần bên dưới là một khối bố cục có sẵn trong trang quản trị, và chính nội dung của khối giải thích khi nào nên dùng nó và cách thêm nó. Hãy mở bài này trong trang quản trị để xem cấu trúc, rồi viết bài của bạn theo cùng cách.',
    'This is a sample article. Each part below is a layout block of the admin site, and its own text explains when to use it and how to add it. Open this article in the admin site to see how it is built, then write yours the same way.',
  )}</p>
<h2>${l('Bắt đầu một bài viết', 'Starting an article')}</h2>
<p>${l(
    'Trong trang quản trị, chọn site rồi vào Bài viết → Bài viết mới. Mỗi ngôn ngữ có một thẻ riêng (VI, EN): điền tiêu đề, đường dẫn (tự tạo từ tiêu đề), đoạn tóm tắt và nội dung. Cột bên phải có chủ đề, ảnh bìa và nút lưu. Bài nháp có thể thiếu ngôn ngữ; muốn xuất bản thì phải đủ mọi ngôn ngữ của site.',
    'In the admin site, pick the site, then Articles → New article. Each language has its own tab (VI, EN): fill in the title, the address (made from the title), the summary and the text. The side panel holds the topic, the cover image and the save button. A draft may miss a language; publishing needs every language of the site.',
  )}</p>
<figure class="tpl-wide">${guideImage('editor.svg', l('Sơ đồ trình soạn thảo bài viết: thẻ ngôn ngữ, thanh công cụ với nút Chèn khối, nội dung và cột ảnh bìa', 'Sketch of the article editor: language tabs, the toolbar with the Insert block button, the text and the cover panel'), 1600, 900)}<figcaption>${l('Nút "Chèn khối" trên thanh công cụ thêm mọi khối trong bài này. Nút ¶ / &lt;/&gt; chuyển giữa chế độ Soạn thảo và HTML.', 'The "Insert block" button of the toolbar adds every block of this article. The ¶ / &lt;/&gt; switch moves between the visual editor and HTML.')}</figcaption></figure>
<h2>${l('Các khối bố cục', 'The layout blocks')}</h2>
<p>${l(
    'Đặt con trỏ ở chỗ muốn thêm, bấm "Chèn khối" và chọn một khối: khối hiện ra với chữ mẫu để bạn thay. Trong trình soạn thảo, mỗi khối là một khung nét đứt có ghi tên; trên trang web nó hiện đúng màu sắc của tiệm.',
    'Put the cursor where the block should go, click "Insert block" and pick one: it appears with sample text for you to replace. In the editor each block is a dashed frame with its name; on the website it takes the shop’s colours.',
  )}</p>
<section class="tpl-callout tpl-note">
<h3>${l('Hộp ghi chú', 'Note box')}</h3>
<p>${l(
    'Dùng cho một thông tin bên lề mà người đọc nên biết: phạm vi áp dụng, điều kiện, nguồn của số liệu. Viết ngắn, một tiêu đề và một hai câu. Thêm bằng Chèn khối → Hộp ghi chú.',
    'For a side fact readers should know: what it applies to, a condition, where a figure comes from. Keep it short: a title and a sentence or two. Insert block → Note box.',
  )}</p>
</section>
<section class="tpl-cards">
<div class="tpl-item">${guideImage('card-when.svg', l('Trang bài viết với một khối được làm nổi bật bằng kính lúp', 'An article page with one block picked out by a magnifier'), 800, 600)}<h3>${l('Thẻ ba cột: khi nào dùng', 'Three cards: when')}</h3><p>${l('Khi có ba (hoặc sáu) mục ngang hàng: ba dịch vụ, ba lợi ích, ba bước nhỏ.', 'When you have three (or six) equal items: three services, three benefits, three small steps.')}</p></div>
<div class="tpl-item">${guideImage('card-insert.svg', l('Menu Chèn khối đang mở, một mục được chọn', 'The Insert block menu open, one entry chosen'), 800, 600)}<h3>${l('Cách thêm', 'How to add it')}</h3><p>${l('Chèn khối → Thẻ ba cột. Mỗi thẻ có một ảnh (tuỳ chọn), một tiêu đề và một đoạn ngắn.', 'Insert block → Three cards. Each card has an image (optional), a title and a short paragraph.')}</p></div>
<div class="tpl-item">${guideImage('card-tip.svg', l('Bóng đèn sáng: một mẹo nhỏ', 'A light bulb: a small tip'), 800, 600)}<h3>${l('Mẹo', 'Tip')}</h3><p>${l('Giữ các thẻ dài gần bằng nhau: tiêu đề vài chữ, nội dung một hai câu.', 'Keep cards about the same length: a few words of title, a sentence or two of text.')}</p></div>
</section>
<section class="tpl-cols">
<div>
<h3>${l('Nên', 'Do')}</h3>
<ul class="tpl-pros">
<li>${l('Một ý chính cho mỗi đoạn, câu ngắn.', 'One idea per paragraph, short sentences.')}</li>
<li>${l('Tiêu đề phần (H2) cho mỗi chủ đề lớn.', 'A section heading (H2) for each main topic.')}</li>
<li>${l('Ghi đúng giá và giờ như bảng giá, bảng giờ của tiệm.', 'Prices and hours exactly as on the shop’s boards.')}</li>
</ul>
</div>
<div>
<h3>${l('Không nên', 'Don’t')}</h3>
<ul class="tpl-cons">
<li>${l('Dán chữ từ trang khác kèm định dạng lạ.', 'Paste text from other sites with odd formatting.')}</li>
<li>${l('Hứa điều tiệm chưa xác nhận (giao nhận, thời gian trả đồ).', 'Promise what the shop hasn’t confirmed (delivery, turnaround).')}</li>
<li>${l('Chèn liên tiếp nhiều khối nặng, không có chữ xen giữa.', 'Stack heavy blocks with no text in between.')}</li>
</ul>
</div>
</section>
<p>${l(
    'Khối Hai cột ở trên (Chèn khối → Hai cột) hợp để so sánh: nên / không nên, trước / sau, giặt máy / giặt hấp.',
    'The Two columns block above (Insert block → Two columns) suits comparisons: do / don’t, before / after, machine wash / dry cleaning.',
  )}</p>
<section class="tpl-callout tpl-tip">
<h3>${l('Hộp mẹo', 'Tip box')}</h3>
<p>${l(
    'Một lời khuyên giúp người đọc làm tốt hơn. Trong trình soạn thảo: Enter sau một đoạn có kiểu (như đoạn dẫn) sẽ tạo đoạn thường; nút "Bỏ khung khối" giữ lại chữ nhưng bỏ khung, nút thùng rác xoá cả khối.',
    'Advice that helps readers do better. In the editor: Enter after a styled paragraph (such as the lead) starts a plain one; "Remove the block frame" keeps the text but drops the frame, the bin deletes the whole block.',
  )}</p>
</section>
<section class="tpl-callout tpl-warn">
<h3>${l('Hộp lưu ý', 'Warning box')}</h3>
<p>${l(
    'Cho điều người đọc dễ làm sai hoặc cần tránh. Lưu ý khi viết: khi lưu, máy chủ chỉ giữ các thẻ và khối được phép; ảnh phải là ảnh trong thư viện ảnh của site (hoặc ảnh có sẵn của site), ảnh dán từ trang khác sẽ bị bỏ.',
    'For what readers easily get wrong or must avoid. A writer’s warning too: on save the server keeps only the allowed tags and blocks; images must come from the site’s media library (or the site’s own files), images from other sites are removed.',
  )}</p>
</section>
<section class="tpl-summary">
<h3>${l('Điểm chính', 'Key points')}</h3>
<ul class="tpl-check">
<li>${l('Đặt ở đầu hoặc cuối bài: tóm tắt 3–5 ý quan trọng nhất.', 'At the start or the end: the 3–5 most important points.')}</li>
<li>${l('Mỗi dòng một ý, bắt đầu bằng động từ hoặc con số.', 'One point per line, starting with a verb or a number.')}</li>
<li>${l('Thêm bằng Chèn khối → Điểm chính.', 'Insert block → Key points.')}</li>
</ul>
</section>
<h2>${l('Các bước viết một bài', 'Writing an article, step by step')}</h2>
<section class="tpl-steps">
${item(l('Chọn chủ đề và tiêu đề', 'Pick the topic and the title'), l('Tiêu đề nói rõ người đọc nhận được gì. Đường dẫn tự tạo từ tiêu đề; sửa nếu quá dài.', 'The title says what readers get. The address is made from it; shorten it if it’s long.'))}
${item(l('Viết đoạn tóm tắt và đoạn dẫn', 'Write the summary and the lead'), l('Tóm tắt hiện ở danh sách bài; đoạn dẫn là đoạn đầu tiên của bài, chữ lớn hơn.', 'The summary shows in article lists; the lead is the first paragraph, in larger type.'))}
${item(l('Thêm nội dung và khối', 'Add the text and the blocks'), l('Chia bài bằng tiêu đề phần (H2), chèn khối khi cần làm nổi bật.', 'Split it with section headings (H2), and insert blocks where something should stand out.'))}
${item(l('Thêm ảnh', 'Add images'), l('Ảnh bìa ở cột phải; ảnh trong bài bằng nút "Chọn hoặc tải ảnh" của khung ảnh.', 'The cover in the side panel; images in the text with the "Choose or upload an image" button of an image frame.'))}
${item(l('Lưu, rồi xuất bản', 'Save, then publish'), l('Lưu nháp bất cứ lúc nào. Xuất bản ngay hoặc hẹn giờ khi đã đủ mọi ngôn ngữ.', 'Save drafts any time. Publish now or schedule it once every language is there.'))}
</section>
<section class="tpl-split">
<div class="tpl-media"><figure>${guideImage('media-library.svg', l('Thư viện ảnh: vùng kéo thả ảnh (tối ưu thành WebP 640, 1280, 1920) và lưới ảnh, một ảnh đang được chọn', 'The media library: a drop zone (optimized to WebP 640, 1280, 1920) and an image grid, one image chosen'), 1200, 900)}</figure></div>
<div class="tpl-body">
<h2>${l('Ảnh và chữ', 'Image and text')}</h2>
<p>${l('Khối này đặt một ảnh cạnh một đoạn chữ (Chèn khối → Ảnh và chữ). Hợp để giới thiệu một người, một máy, một dịch vụ.', 'This block puts an image next to some text (Insert block → Image and text). Good for introducing a person, a machine, a service.')}</p>
<ul>
<li>${l('Bấm "Chọn hoặc tải ảnh" trong khung ảnh để mở thư viện.', 'Click "Choose or upload an image" in the image frame to open the library.')}</li>
<li>${l('Ảnh tải lên được tối ưu ngay trên trình duyệt: WebP, 3 cỡ, xoá vị trí GPS.', 'Uploaded images are optimized in your browser: WebP, 3 sizes, GPS position removed.')}</li>
<li>${l('Luôn điền mô tả ảnh (alt) cho người dùng trình đọc màn hình.', 'Always fill in the image description (alt) for screen-reader users.')}</li>
</ul>
</div>
</section>
<figure class="tpl-wide">${guideImage('layout-map.svg', l('Sơ đồ một bài viết: đoạn dẫn và hộp ghi chú, thẻ, các bước, ảnh và chữ, lời kêu gọi', 'Map of an article: lead and note box, cards, steps, image and text, call to action'), 1600, 686)}<figcaption>${l('Ảnh rộng có chú thích (Chèn khối → Ảnh rộng có chú thích): rộng hơn cột chữ, dùng cho ảnh đẹp nhất hoặc một sơ đồ. Viết chú thích một câu.', 'Wide image with caption (Insert block → Wide image with caption): wider than the text column, for the best photo or a diagram. Write a one-sentence caption.')}</figcaption></figure>
<blockquote class="tpl-pull"><p>${l('“Trích dẫn nổi bật làm người đọc dừng lại: chọn một câu thật, ngắn, của khách hoặc của chủ tiệm.”', '“A pull quote makes readers stop: pick one real, short line from a customer or the owner.”')}</p></blockquote>
<h2>${l('Hỏi đáp', 'Questions')}</h2>
<section class="tpl-faq">
${item(l('Làm sao xoá hoặc bỏ một khối?', 'How do I remove a block?'), l('Đặt con trỏ trong khối: "Bỏ khung khối" giữ chữ, nút thùng rác xoá cả khối.', 'Put the cursor inside it: "Remove the block frame" keeps the text, the bin deletes the block.'))}
${item(l('Tôi có sửa HTML được không?', 'Can I edit the HTML?'), l('Có: nút &lt;/&gt; mở chế độ HTML. Máy chủ chỉ giữ thẻ và class được phép khi lưu.', 'Yes: the &lt;/&gt; switch opens the HTML mode. On save the server keeps only the allowed tags and classes.'))}
${item(l('Ảnh bìa đặt ở đâu?', 'Where does the cover go?'), l('Cột bên phải, mục "Ảnh bìa". Mô tả ảnh bìa nhập ở từng thẻ ngôn ngữ.', 'In the side panel, "Cover image". Its description is set in each language tab.'))}
</section>
<section class="tpl-cta">
<h3>${l('Sẵn sàng viết bài đầu tiên?', 'Ready for your first article?')}</h3>
<p>${l('Lời kêu gọi hành động (Chèn khối → Kêu gọi hành động) đặt cuối bài: một câu mời gọi, gọi điện, nhắn Zalo hay ghé tiệm.', 'The call to action (Insert block → Call to action) closes the article: one line inviting readers to call, message on Zalo or drop by.')}</p>
</section>
<h2>${l('Trước khi xuất bản', 'Before publishing')}</h2>
<ul>
<li>${l('Đọc lại tiêu đề và đoạn tóm tắt.', 'Reread the title and the summary.')}</li>
<li>${l('Kiểm tra giá, giờ, địa chỉ với tiệm.', 'Check prices, hours and the address with the shop.')}</li>
<li>${l('Mọi ảnh đều có mô tả (alt).', 'Every image has a description (alt).')}</li>
<li>${l('Mọi ngôn ngữ của site đều đã viết.', 'Every language of the site is written.')}</li>
<li>${l('Xem bài trên trang web sau khi xuất bản.', 'Look at the article on the website after publishing.')}</li>
</ul>
<p class="tpl-byline">${l('Bài mẫu của SFaster · Ảnh minh hoạ: SVG của site', 'SFaster sample article · Illustrations: the site’s SVG drawings')}</p>
`,
};

export const LAUNDRY_TEMPLATES: ArticleTemplateSeed[] = [guide];
