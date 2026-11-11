/**
 * The 10 article templates of laundry-web (Giặt sấy SFaster), in Vietnamese and English, built
 * with the layout vocabulary of ADR 0033. Facts come from the shop's sign, price board and posters
 * (web/apps/laundry-web/src/content/shop.ts); anything the shop hasn't confirmed stays in
 * [square brackets] for the admin to fill in. Never a turnaround time, delivery or discount beyond
 * "giặt 7 lần tặng 1" (laundry-web CLAUDE.md).
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
  excerpt: (l: L) => string;
  body: (l: L) => string;
}

const ph = (ratio: '21x9' | '16x9' | '3x2' | '4x3' | '1x1' | '3x4', alt: string) =>
  `<img src="/images/placeholder/${ratio}.svg" alt="${alt}" loading="lazy" />`;
const photo = (file: 'machines.jpg' | 'shelves.jpg' | 'signboard.jpg', alt: string) =>
  `<img src="/images/${file}" alt="${alt}" loading="lazy" />`;

const machinesAlt = (l: L) =>
  l(
    'Dãy máy giặt Electrolux, máy sấy đặt chồng phía trên',
    'A row of Electrolux washers with dryers stacked on top',
  );
const shelvesAlt = (l: L) =>
  l(
    'Kệ đồ đã giặt, mỗi túi dán phiếu tên riêng',
    'Shelves of clean laundry, every bag with its own name ticket',
  );
const signAlt = (l: L) =>
  l(
    'Biển hiệu Giặt sấy SFaster: mỗi người 1 máy, sạch – thơm – nhanh',
    'The SFaster sign: one customer, one machine, clean, fresh, fast',
  );

/* ─────────────────────────── 1. Magazine ─────────────────────────── */

const magazine: ArticleTemplateSeed = {
  key: 'magazine',
  categoryKey: 'shop',
  slug: { vi: 'mau-01-cau-chuyen-moi-nguoi-mot-may', en: 'template-01-one-customer-one-machine' },
  title: (l) =>
    l(
      '[Mẫu 1] Mỗi người một máy: câu chuyện của SFaster',
      '[Template 1] One customer, one machine: the SFaster story',
    ),
  excerpt: (l) =>
    l(
      'Mẫu tạp chí: mở bài lớn, ảnh tràn rộng, ảnh xen hai bên chữ và trích dẫn nổi bật, kể vì sao SFaster không bao giờ giặt chung.',
      'Magazine template: a big opening, wide photos, photos beside the text and a pull quote, telling why SFaster never mixes loads.',
    ),
  body: (l) => `
<p class="tpl-lead tpl-dropcap">${l(
    'Bảy giờ sáng, cửa tiệm vừa mở, những chiếc máy giặt Electrolux đã xếp hàng chờ mẻ đồ đầu tiên. Ở SFaster, mỗi mẻ là của một người: không ai phải lo đồ của mình bị giặt chung với đồ của người khác.',
    'Seven in the morning: the doors open and the Electrolux washers stand ready for the first load. At SFaster every load belongs to one customer: nobody has to worry about their clothes being washed with someone else’s.',
  )}</p>
<p>${l(
    '[Đoạn mở rộng bối cảnh: tiệm bắt đầu từ khi nào, ai đứng quầy, khách quen là ai.] Hãy viết như kể cho một người hàng xóm mới chuyển đến: cụ thể, gần gũi, tránh những lời khen chung chung.',
    '[Widen the scene: when the shop started, who runs the counter, who the regulars are.] Write as if telling a new neighbour: concrete and friendly, without vague praise.',
  )}</p>
<figure class="tpl-wide">${photo('machines.jpg', machinesAlt(l))}<figcaption>${l('Máy giặt và máy sấy Electrolux tại tiệm.', 'Electrolux washers and dryers at the shop.')}</figcaption></figure>
<h2>${l('Vì sao “mỗi người 1 máy”?', 'Why “one customer, one machine”?')}</h2>
<p>${l(
    'Giặt chung giúp tiết kiệm máy, nhưng khách phải đánh đổi: màu có thể lem, mùi có thể lẫn, đồ nhỏ có thể thất lạc. SFaster chọn cách ngược lại: đồ của bạn được giặt và sấy riêng, rồi đóng túi và dán phiếu tên.',
    'Mixing loads saves machines, but customers pay for it: colours can run, smells can mix, small items can go missing. SFaster does the opposite: your laundry is washed and dried on its own, then bagged and labelled with your name.',
  )}</p>
<figure class="tpl-right">${ph('3x4', l('[Ảnh chân dung người đứng quầy]', '[Portrait of the person at the counter]'))}<figcaption>${l('[Tên, vai trò ở tiệm.]', '[Name, role at the shop.]')}</figcaption></figure>
<p>${l(
    '[Kể về người đứng quầy: họ nhận đồ, cân đồ và ghi phiếu thế nào.] Ảnh chân dung đặt cạnh đoạn văn giúp bài có nhịp: mắt người đọc đi từ chữ sang khuôn mặt rồi quay lại chữ.',
    '[Tell about the person at the counter: how they take, weigh and ticket each load.] A portrait beside the text gives the page a rhythm: the eye goes from words to a face and back.',
  )}</p>
<p>${l(
    '[Một kỷ niệm với khách quen: chiếc áo cưới, bộ vest đi phỏng vấn, chú gấu bông của bé.] Chi tiết đời thường khiến tiệm giặt trở thành một nơi có người, có chuyện.',
    '[A memory with a regular: a wedding dress, an interview suit, a child’s teddy bear.] Everyday details turn a laundry into a place with people and stories.',
  )}</p>
<blockquote class="tpl-pull">${l('[Một câu nói thật của người đứng quầy về nghề giặt — ngắn, có hình ảnh.]', '[A real line from the person at the counter about the job — short and vivid.]')}</blockquote>
<h2>${l('Từ quầy nhận đồ đến kệ chờ khách', 'From the counter to the pick-up shelf')}</h2>
<figure class="tpl-left">${photo('shelves.jpg', shelvesAlt(l))}<figcaption>${l('Đồ sạch đóng túi, dán phiếu.', 'Clean laundry, bagged and ticketed.')}</figcaption></figure>
<p>${l(
    'Đồ được cân khi bạn gửi, tiệm ghi phiếu kèm giá. Sau khi giặt và sấy riêng, đồ được đóng túi, dán phiếu và xếp lên kệ chờ bạn tới lấy.',
    'Your laundry is weighed when you drop it off and you get a ticket with the price. Washed and dried on its own, it is bagged, ticketed and shelved until you pick it up.',
  )}</p>
<p>${l(
    '[Thêm một chi tiết về khâu gấp, đóng túi hay kiểm tra trước khi giao.]',
    '[Add a detail about folding, bagging or the check before handing it back.]',
  )}</p>
<hr class="tpl-ornament" />
<section class="tpl-dark">
<h3>${l('Điều SFaster luôn giữ', 'What SFaster always keeps')}</h3>
<ul>
<li>${l('Mỗi người 1 máy: không bao giờ giặt chung.', 'One customer, one machine: never mixed.')}</li>
<li>${l('Sạch – Thơm – Nhanh, như trên biển hiệu.', 'Clean, fresh, fast, as the sign says.')}</li>
<li>${l('Giá rõ ràng: theo ký hoặc theo món, ghi trên phiếu.', 'Clear prices: by weight or per item, on your ticket.')}</li>
</ul>
</section>
<h2>${l('Hai chi nhánh, một cách làm', 'Two branches, one way of working')}</h2>
<p>${l(
    'SFaster có hai chi nhánh tại TP.HCM: 40 Cửu Long (Phường Hòa Hưng) và 68 Lê Hồng Phong (Phường Chợ Quán), mở cửa 7:00–20:00 hằng ngày, trừ Lễ, Tết.',
    'SFaster has two branches in Ho Chi Minh City: 40 Cửu Long (Hòa Hưng ward) and 68 Lê Hồng Phong (Chợ Quán ward), open 7:00–20:00 every day except public holidays.',
  )}</p>
<figure class="tpl-wide tpl-framed">${photo('signboard.jpg', signAlt(l))}</figure>
<p>${l(
    'Lần tới khi giỏ đồ đầy, hãy ghé chi nhánh gần bạn, hoặc gọi, nhắn Zalo 0984 763 100 trước.',
    'Next time the basket is full, drop by the nearest branch, or call or message 0984 763 100 on Zalo first.',
  )}</p>
<p class="tpl-byline">${l('Bài: [Tên tác giả] · Ảnh: SFaster', 'Words: [Author] · Photos: SFaster')}</p>
`,
};

/* ─────────────────────────── 2. Chapters ─────────────────────────── */

const chapter = (l: L, n: number, id: string, title: string, lead: string, img: string) => `
<section class="tpl-chapter">
<p class="tpl-kicker">${l('Chương', 'Chapter')} ${n}</p>
<h2 class="tpl-chapter-title" id="${id}">${title}</h2>
<p class="tpl-lead">${lead}</p>
</section>
<figure class="tpl-full">${img}</figure>`;

const chapters: ArticleTemplateSeed = {
  key: 'chapters',
  categoryKey: 'shop',
  slug: { vi: 'mau-02-mot-ngay-o-tiem-giat', en: 'template-02-a-day-at-the-laundry' },
  title: (l) =>
    l(
      '[Mẫu 2] Một ngày ở tiệm giặt: bốn chặng của một mẻ đồ',
      '[Template 2] A day at the laundry: the four stages of a load',
    ),
  excerpt: (l) =>
    l(
      'Mẫu phóng sự nhiều chương: mục lục, chương lớn ở giữa trang, mỗi chương mở bằng ảnh toàn màn hình.',
      'Long-read template: a table of contents and big centred chapters, each opening on a full-width photo.',
    ),
  body: (l) => `
<p class="tpl-lead">${l(
    'Theo chân một mẻ đồ từ lúc bạn đặt túi lên quầy đến lúc nhận lại túi đồ thơm tho. Bốn chương, bốn chặng.',
    'Follow one load from the moment your bag lands on the counter to the moment you take it home fresh. Four chapters, four stages.',
  )}</p>
<section class="tpl-toc">
<p class="tpl-label">${l('Trong bài này', 'In this article')}</p>
<ol>
<li><a href="#chuong-1">${l('Nhận đồ', 'Drop-off')}</a></li>
<li><a href="#chuong-2">${l('Cân và ghi phiếu', 'Weighing and ticket')}</a></li>
<li><a href="#chuong-3">${l('Giặt máy riêng', 'Its own machine')}</a></li>
<li><a href="#chuong-4">${l('Đóng túi, nhận đồ', 'Bagged and collected')}</a></li>
</ol>
</section>
${chapter(l, 1, 'chuong-1', l('Nhận đồ', 'Drop-off'), l('Mọi mẻ giặt bắt đầu ở quầy.', 'Every load starts at the counter.'), ph('21x9', l('[Ảnh quầy nhận đồ]', '[The drop-off counter]')))}
<p>${l(
    'Bạn mang đồ tới tiệm, hoặc gọi điện, nhắn Zalo trước cho tiệm. [Tả cảnh buổi sáng ở quầy: ai tới sớm nhất, mang theo gì.]',
    'You bring your laundry in, or call or message us on Zalo first. [Describe the morning at the counter: who comes first, what they bring.]',
  )}</p>
<p>${l(
    'Đây là lúc nên báo trước đồ dễ ra màu, đồ cần giặt riêng hoặc những vết bẩn khó như dầu mỡ, mực, son phấn.',
    'This is the moment to mention clothes that may bleed, items to keep apart, and tough stains such as grease, ink or make-up.',
  )}</p>
<hr class="tpl-ornament" />
${chapter(l, 2, 'chuong-2', l('Cân và ghi phiếu', 'Weighing and ticket'), l('Giá rõ ràng ngay từ đầu.', 'A clear price from the start.'), ph('21x9', l('[Ảnh cân đồ và phiếu]', '[Weighing the load and the ticket]')))}
<p>${l(
    'Tiệm cân đồ và ghi phiếu kèm giá cho bạn. Quần áo tính theo lần giặt theo cân nặng: dưới 2 kg 35.000 ₫, tới 75.000 ₫ cho 5–6 kg, từ 7 kg trở lên 12.000 ₫/kg.',
    'The shop weighs your load and writes a ticket with the price. Clothes are priced per load by weight: 35,000 ₫ under 2 kg, up to 75,000 ₫ for 5–6 kg, and 12,000 ₫/kg from 7 kg.',
  )}</p>
<blockquote class="tpl-pull">${l('Giữ phiếu cẩn thận: tiệm tìm đúng túi đồ của bạn nhờ tấm phiếu đó.', 'Keep your ticket: it is how the shop finds your bag.')}</blockquote>
<hr class="tpl-ornament" />
${chapter(l, 3, 'chuong-3', l('Giặt máy riêng', 'Its own machine'), l('Mỗi người 1 máy, không bao giờ giặt chung.', 'One customer, one machine, never mixed.'), photo('machines.jpg', machinesAlt(l)))}
<p>${l(
    'Đồ của bạn vào một máy giặt riêng, rồi một máy sấy riêng. [Tả âm thanh, mùi nước xả, nhịp làm việc của tiệm lúc đông khách.]',
    'Your laundry gets a washer of its own, then a dryer of its own. [Describe the sounds, the smell of softener, the pace of the shop at a busy hour.]',
  )}</p>
<section class="tpl-gallery">
<figure>${ph('4x3', l('[Ảnh bảng điều khiển máy giặt]', '[A washer’s control panel]'))}<figcaption>${l('[Chú thích.]', '[Caption.]')}</figcaption></figure>
<figure>${ph('4x3', l('[Ảnh máy sấy đang chạy]', '[A dryer at work]'))}<figcaption>${l('[Chú thích.]', '[Caption.]')}</figcaption></figure>
</section>
<hr class="tpl-ornament" />
${chapter(l, 4, 'chuong-4', l('Đóng túi, nhận đồ', 'Bagged and collected'), l('Túi đồ thơm tho chờ bạn trên kệ.', 'A fresh bag waits for you on the shelf.'), photo('shelves.jpg', shelvesAlt(l)))}
<p>${l(
    'Đồ sạch được đóng túi kèm phiếu, chờ bạn tới lấy. Muốn biết giờ có đồ, hãy gọi hoặc nhắn Zalo 0984 763 100: tiệm sẽ báo cho bạn.',
    'Clean laundry is bagged with its ticket and waits for you. To know when it is ready, call or message 0984 763 100 on Zalo: the shop will tell you.',
  )}</p>
<p class="tpl-byline">${l('Thực hiện: [Tên tác giả] · [Tháng, năm]', 'By [Author] · [Month, year]')}</p>
`,
};

/* ─────────────────────────── 3. Steps ─────────────────────────── */

const step = (l: L, title: string, text: string, extra = '') => `
<div class="tpl-item">
<h3>${title}</h3>
<p>${text}</p>${extra}
</div>`;

const steps: ArticleTemplateSeed = {
  key: 'steps',
  categoryKey: 'tips',
  slug: { vi: 'mau-03-chuan-bi-do-truoc-khi-gui-giat', en: 'template-03-getting-laundry-ready' },
  title: (l) =>
    l(
      '[Mẫu 3] Chuẩn bị đồ trước khi gửi giặt trong 5 bước',
      '[Template 3] Getting your laundry ready in 5 steps',
    ),
  excerpt: (l) =>
    l(
      'Mẫu hướng dẫn từng bước: bảng thông tin nhanh, danh sách cần chuẩn bị, các bước đánh số có ảnh, mẹo và lỗi thường gặp.',
      'Step-by-step template: a quick facts table, a checklist, numbered steps with photos, a tip and common mistakes.',
    ),
  body: (l) => `
<p class="tpl-lead">${l(
    'Vài phút chuẩn bị ở nhà giúp đồ giặt sạch đẹp hơn và không thất lạc món nào. Đây là năm việc nên làm trước khi mang đồ ra tiệm.',
    'A few minutes at home make your laundry come back cleaner and complete. Here are five things to do before you bring it in.',
  )}</p>
<section class="tpl-facts">
<p><strong>${l('Thời gian', 'Time')}</strong> ${l('Khoảng 10 phút', 'About 10 minutes')}</p>
<p><strong>${l('Mức độ', 'Difficulty')}</strong> ${l('Dễ', 'Easy')}</p>
<p><strong>${l('Gửi ở', 'Drop off at')}</strong> ${l('40 Cửu Long hoặc 68 Lê Hồng Phong', '40 Cửu Long or 68 Lê Hồng Phong')}</p>
<p><strong>${l('Giờ mở cửa', 'Opening hours')}</strong> ${l('7:00–20:00 hằng ngày, trừ Lễ, Tết', '7:00–20:00 daily, except public holidays')}</p>
</section>
<section class="tpl-callout tpl-note">
<h3>${l('Bạn cần chuẩn bị', 'You will need')}</h3>
<ul class="tpl-check">
<li>${l('Một túi hoặc giỏ đựng đồ', 'A bag or basket')}</li>
<li>${l('Vài phút để kiểm tra túi quần áo', 'A few minutes to check the pockets')}</li>
<li>${l('Danh sách đồ cần lưu ý (dễ ra màu, đồ len, lụa)', 'A list of items to mention (may bleed, wool, silk)')}</li>
</ul>
</section>
<h2>${l('Các bước', 'The steps')}</h2>
<section class="tpl-steps">${step(
    l,
    l('Lấy hết đồ trong túi quần áo', 'Empty every pocket'),
    l(
      'Tiền, giấy tờ, tai nghe, bật lửa: những món nhỏ này dễ hỏng và có thể làm hỏng cả mẻ đồ.',
      'Money, papers, earbuds, lighters: small things that break easily and can ruin a whole load.',
    ),
    `\n<figure>${ph('16x9', l('[Ảnh kiểm tra túi quần]', '[Checking trouser pockets]'))}</figure>`,
  )}${step(
    l,
    l('Tách đồ dễ ra màu', 'Set aside clothes that may bleed'),
    l(
      'Báo trước cho tiệm những món dễ ra màu hoặc cần giặt riêng.',
      'Tell the shop about items that may bleed or need washing apart.',
    ),
  )}${step(
    l,
    l('Để riêng đồ len, lụa, da, vest', 'Keep wool, silk, leather and suits apart'),
    l(
      'Những món này nên chọn dịch vụ giặt hấp để giữ form và chất liệu.',
      'These are better in the dry cleaning service, which keeps their shape and material.',
    ),
    `\n<section class="tpl-callout tpl-tip">\n<p><strong>${l('Mẹo:', 'Tip:')}</strong> ${l('Giặt hấp: vest 120.000 ₫/bộ, váy dài, đầm 100.000 ₫/cái, đồ len, lông, da, lụa 80.000 ₫/cái.', 'Dry cleaning: suits 120,000 ₫ a set, long dresses 100,000 ₫, wool, fur, leather and silk 80,000 ₫ an item.')}</p>\n</section>`,
  )}${step(
    l,
    l('Chỉ cho nhân viên các vết bẩn khó', 'Point out the tough stains'),
    l(
      'Dầu mỡ, mực, son phấn: nói khi gửi để tiệm biết mà xử lý.',
      'Grease, ink, make-up: mention them when you drop off so the shop knows.',
    ),
    `\n<figure>${ph('16x9', l('[Ảnh chỉ vết bẩn trên áo]', '[Pointing at a stain]'))}</figure>`,
  )}${step(
    l,
    l('Giữ phiếu cẩn thận', 'Keep your ticket'),
    l(
      'Tiệm tìm đúng túi đồ của bạn nhờ phiếu. Giữ phiếu đến khi nhận đồ.',
      'The shop finds your bag by its ticket. Keep it until you pick up.',
    ),
  )}
</section>
<section class="tpl-callout tpl-warn">
<h3>${l('Những lỗi thường gặp', 'Common mistakes')}</h3>
<ul>
<li>${l('Quên đồ trong túi quần áo.', 'Leaving things in pockets.')}</li>
<li>${l('Gửi chung đồ mới mua dễ ra màu mà không báo.', 'Sending new clothes that may bleed without saying so.')}</li>
<li>${l('Làm mất phiếu nhận đồ.', 'Losing the ticket.')}</li>
</ul>
</section>
<section class="tpl-summary">
<h3>${l('Tóm tắt nhanh', 'In short')}</h3>
<ol>
<li>${l('Lấy hết đồ trong túi.', 'Empty the pockets.')}</li>
<li>${l('Tách đồ dễ ra màu.', 'Set aside what may bleed.')}</li>
<li>${l('Đồ len, lụa, da, vest: giặt hấp.', 'Wool, silk, leather, suits: dry cleaning.')}</li>
<li>${l('Chỉ vết bẩn khó.', 'Point out tough stains.')}</li>
<li>${l('Giữ phiếu.', 'Keep the ticket.')}</li>
</ol>
</section>
`,
};

/* ─────────────────────────── 4. Ranked list ─────────────────────────── */

const rankedItem = (l: L, rank: number, name: string, text: string, price: string, img: string) => `
<div class="tpl-item">
<div class="tpl-media"><figure>${img}</figure></div>
<div class="tpl-body">
<p class="tpl-rank">${String(rank).padStart(2, '0')}</p>
<h3>${name}</h3>
<p>${text}</p>
<ul class="tpl-inline">
<li>${price}</li>
</ul>
</div>
</div>`;

const ranked: ArticleTemplateSeed = {
  key: 'ranked',
  categoryKey: 'services',
  slug: {
    vi: 'mau-04-sau-mon-nen-mang-ra-tiem-giat',
    en: 'template-04-six-things-to-bring-to-the-laundry',
  },
  title: (l) =>
    l(
      '[Mẫu 4] 6 món đồ nên mang ra tiệm giặt thay vì giặt ở nhà',
      '[Template 4] 6 things to bring to the laundry instead of washing at home',
    ),
  excerpt: (l) =>
    l(
      'Mẫu danh sách nổi bật: thẻ tổng quan, các mục đánh số lớn, ảnh vuông xen kẽ trái phải và giá từng món.',
      'Listicle template: overview cards, big numbered items, square photos alternating left and right, and each item’s price.',
    ),
  body: (l) => `
<p class="tpl-lead">${l(
    'Có những món giặt ở nhà vừa mất công vừa dễ hỏng. Đây là sáu món SFaster nhận giặt, kèm giá theo bảng giá của tiệm.',
    'Some things are hard work at home and easy to damage. Here are six items SFaster cleans, with prices from the shop’s price board.',
  )}</p>
<section class="tpl-cards">
<div class="tpl-item">${ph('4x3', l('[Ảnh đồ cồng kềnh]', '[Bulky items]'))}<h3>${l('Đồ cồng kềnh', 'Bulky items')}</h3><p>${l('Mền, màn cửa, drap, topper: máy ở nhà khó giặt vừa.', 'Duvets, curtains, sheets, toppers: hard to fit a home machine.')}</p></div>
<div class="tpl-item">${ph('4x3', l('[Ảnh đồ cần chăm sóc]', '[Delicate items]'))}<h3>${l('Đồ cần chăm sóc', 'Delicate items')}</h3><p>${l('Vest, đầm, đồ len, lụa: nên giặt hấp.', 'Suits, dresses, wool, silk: better dry cleaned.')}</p></div>
<div class="tpl-item">${ph('4x3', l('[Ảnh đồ khó vệ sinh]', '[Hard-to-clean items]'))}<h3>${l('Đồ khó vệ sinh', 'Hard to clean')}</h3><p>${l('Giày, mũ bảo hiểm, gấu bông.', 'Shoes, helmets, plush toys.')}</p></div>
</section>
<h2>${l('Danh sách chi tiết', 'The list')}</h2>
<section class="tpl-ranked">${rankedItem(l, 1, l('Mền, màn cửa, drap nệm', 'Duvets, curtains and sheets'), l('Giặt sấy theo ký: dưới 1 kg 35.000 ₫ một lần, từ 1 kg trở lên 25.000 ₫/kg.', 'Washed and dried by weight: 35,000 ₫ a load under 1 kg, 25,000 ₫/kg from 1 kg.'), l('Từ 25.000 ₫/kg', 'From 25,000 ₫/kg'), ph('1x1', l('[Ảnh mền gấp gọn]', '[A folded duvet]')))}${rankedItem(l, 2, l('Topper nệm', 'Mattress toppers'), l('Topper được giặt sấy, tính theo ký.', 'Toppers are washed and dried, priced by weight.'), '35.000 ₫/kg', ph('1x1', l('[Ảnh topper]', '[A topper]')))}${rankedItem(l, 3, l('Giày', 'Shoes'), l('Vệ sinh giày thể thao và giày đi hằng ngày, tính theo đôi.', 'Sneakers and everyday shoes, cleaned and priced per pair.'), l('75.000 ₫/đôi', '75,000 ₫ a pair'), ph('1x1', l('[Ảnh đôi giày sạch]', '[A clean pair of shoes]')))}${rankedItem(l, 4, l('Gấu bông', 'Plush toys'), l('Gấu bông, thú nhồi bông của bé, tính theo 500 g.', 'Teddy bears and stuffed toys, priced per 500 g.'), l('25.000 ₫/500 g', '25,000 ₫ per 500 g'), ph('1x1', l('[Ảnh gấu bông]', '[A teddy bear]')))}${rankedItem(l, 5, l('Mũ bảo hiểm', 'Helmets'), l('Vệ sinh mũ bảo hiểm, tính theo cái.', 'Helmet cleaning, priced per helmet.'), l('35.000 ₫/cái', '35,000 ₫ each'), ph('1x1', l('[Ảnh mũ bảo hiểm]', '[A helmet]')))}${rankedItem(l, 6, l('Vest, đầm, đồ len, lụa', 'Suits, dresses, wool and silk'), l('Giặt hấp giữ form và chất liệu: vest 120.000 ₫/bộ, váy dài, đầm 100.000 ₫/cái.', 'Dry cleaning keeps shape and fabric: suits 120,000 ₫ a set, long dresses 100,000 ₫.'), l('Từ 50.000 ₫/cái', 'From 50,000 ₫ an item'), ph('1x1', l('[Ảnh vest treo]', '[A suit on a hanger]')))}
</section>
<section class="tpl-dark">
<h3>${l('Chọn thế nào cho đúng?', 'How to choose?')}</h3>
<ul>
<li>${l('Đồ to, nặng: mang ra tiệm cho đỡ công.', 'Big and heavy: bring it in and save the effort.')}</li>
<li>${l('Đồ cần giữ form: chọn giặt hấp.', 'Needs to keep its shape: choose dry cleaning.')}</li>
<li>${l('Còn phân vân: gọi hoặc nhắn Zalo 0984 763 100.', 'Not sure: call or message 0984 763 100 on Zalo.')}</li>
</ul>
</section>
`,
};

/* ─────────────────────────── 5. Interview ─────────────────────────── */

const qa = (q: string, a: string) => `
<p class="tpl-q">${q}</p>
<p class="tpl-a">${a}</p>`;

const interview: ArticleTemplateSeed = {
  key: 'interview',
  categoryKey: 'shop',
  slug: { vi: 'mau-05-tro-chuyen-o-quay-sfaster', en: 'template-05-at-the-sfaster-counter' },
  title: (l) =>
    l(
      '[Mẫu 5] [Tên nhân vật]: “Đồ của ai, máy của người đó”',
      '[Template 5] [Name]: “Your laundry, your machine”',
    ),
  excerpt: (l) =>
    l(
      'Mẫu phỏng vấn: thẻ nhân vật có ảnh chân dung, các cặp hỏi – đáp, trích dẫn lớn và bộ ảnh đôi.',
      'Interview template: a profile card with a portrait, question and answer pairs, a pull quote and a pair of photos.',
    ),
  body: (l) => `
<section class="tpl-split">
<div class="tpl-media"><figure class="tpl-portrait">${ph('3x4', l('[Ảnh chân dung nhân vật]', '[Portrait]'))}</figure></div>
<div class="tpl-body">
<p class="tpl-kicker">${l('Nhân vật', 'Profile')}</p>
<h2>[${l('Họ tên', 'Full name')}]</h2>
<p>${l('[Vai trò ở SFaster, chi nhánh, từ khi nào.]', '[Role at SFaster, branch, since when.]')}</p>
<ul class="tpl-inline">
<li>${l('[Chi nhánh]', '[Branch]')}</li>
<li>${l('[Số năm làm nghề]', '[Years in the trade]')}</li>
</ul>
</div>
</section>
<p class="tpl-lead">${l(
    '[Đoạn dẫn: buổi trò chuyện diễn ra ở đâu, lúc tiệm đông hay vắng, vì sao chọn nói chuyện với nhân vật.]',
    '[Intro: where the talk took place, busy or quiet hour, why this person.]',
  )}</p>
<h2>${l('Về cách làm của tiệm', 'How the shop works')}</h2>
<section class="tpl-qa">${qa(
    l(
      'Vì sao SFaster không giặt chung đồ của nhiều người?',
      'Why doesn’t SFaster mix customers’ laundry?',
    ),
    l(
      '[Trả lời bằng lời nhân vật. Gợi ý ý chính: mỗi người 1 máy để đồ không lẫn màu, lẫn mùi, không thất lạc.]',
      '[Answer in their words. Main idea: one machine per customer so nothing bleeds, mixes or goes missing.]',
    ),
  )}${qa(
    l('Giá được tính thế nào?', 'How is the price worked out?'),
    l(
      '[Trả lời. Ý chính: quần áo và mền màn tính theo cân nặng khi gửi; giặt hấp và dịch vụ khác tính theo món, đôi hoặc ký.]',
      '[Answer. Main idea: clothes and bedding by the weight at drop-off; dry cleaning and other services per item, pair or kilo.]',
    ),
  )}
</section>
<blockquote class="tpl-pull">${l('[Câu trả lời đắt giá nhất, trích nguyên văn.]', '[The best answer, word for word.]')}</blockquote>
<section class="tpl-gallery">
<figure>${photo('machines.jpg', machinesAlt(l))}<figcaption>${l('Máy giặt, máy sấy Electrolux tại tiệm.', 'Electrolux washers and dryers at the shop.')}</figcaption></figure>
<figure>${photo('shelves.jpg', shelvesAlt(l))}<figcaption>${l('Kệ đồ chờ khách tới lấy.', 'Bags waiting for their owners.')}</figcaption></figure>
</section>
<h2>${l('Về khách hàng', 'About the customers')}</h2>
<section class="tpl-qa">${qa(
    l('Khách nên chuẩn bị gì trước khi gửi đồ?', 'What should customers do before dropping off?'),
    l(
      '[Trả lời. Ý chính: lấy hết đồ trong túi, báo đồ dễ ra màu, chỉ vết bẩn khó, giữ phiếu.]',
      '[Answer. Main idea: empty pockets, mention items that may bleed, point out stains, keep the ticket.]',
    ),
  )}${qa(
    l('Ưu đãi “giặt 7 lần tặng 1” áp dụng thế nào?', 'How does “wash 7 times, get 1 free” work?'),
    l(
      '[Trả lời. Ý chính: sau 7 lần giặt, lần thứ tám tiệm tặng; hỏi quầy để biết chi tiết.]',
      '[Answer. Main idea: after 7 paid washes the eighth is free; ask at the counter for details.]',
    ),
  )}${qa(
    l('Lời nhắn gửi đến khách hàng?', 'A word for customers?'),
    l('[Để nhân vật nói lời kết.]', '[Let them have the last word.]'),
  )}
</section>
<p class="tpl-byline">${l('Phỏng vấn: [Tên người phỏng vấn] · Nội dung đã được nhân vật đọc duyệt.', 'Interview: [Interviewer] · Read and approved by the interviewee.')}</p>
`,
};

/* ─────────────────────────── 6. Compare ─────────────────────────── */

const compare: ArticleTemplateSeed = {
  key: 'compare',
  categoryKey: 'services',
  slug: { vi: 'mau-06-giat-may-hay-giat-hap', en: 'template-06-machine-wash-or-dry-cleaning' },
  title: (l) =>
    l(
      '[Mẫu 6] Giặt máy hay giặt hấp: chọn sao cho đúng?',
      '[Template 6] Machine wash or dry cleaning: which one?',
    ),
  excerpt: (l) =>
    l(
      'Mẫu so sánh: hai thẻ đặt cạnh nhau, bảng đặc điểm, ưu – nhược điểm, ảnh và chữ theo tình huống, hộp kết luận.',
      'Comparison template: two side-by-side cards, a facts table, pros and cons, photo-and-text by situation, a verdict box.',
    ),
  body: (l) => `
<p class="tpl-lead">${l(
    'Cùng là làm sạch quần áo, nhưng giặt máy và giặt hấp dành cho những món rất khác nhau. Đặt cạnh nhau để chọn trong một phút.',
    'Both get clothes clean, but a machine wash and dry cleaning suit very different things. Side by side, you can choose in a minute.',
  )}</p>
<section class="tpl-compare">
<div class="tpl-item">
<figure>${photo('machines.jpg', machinesAlt(l))}</figure>
<p class="tpl-label">${l('Lựa chọn A', 'Option A')}</p>
<h3>${l('Giặt sấy máy', 'Machine wash & dry')}</h3>
<p>${l('Quần áo hằng ngày, mền màn drap: giặt và sấy riêng trong một máy của bạn.', 'Everyday clothes and bedding, washed and dried in a machine of your own.')}</p>
</div>
<div class="tpl-item">
<figure>${ph('4x3', l('[Ảnh vest, đầm treo]', '[A suit and a dress on hangers]'))}</figure>
<p class="tpl-label">${l('Lựa chọn B', 'Option B')}</p>
<h3>${l('Giặt hấp', 'Dry cleaning')}</h3>
<p>${l('Vest, đầm, đồ len, lụa, da: chăm sóc kỹ để giữ form và chất liệu.', 'Suits, dresses, wool, silk, leather: careful cleaning that keeps shape and fabric.')}</p>
</div>
</section>
<h2>${l('Đặc điểm chính', 'At a glance')}</h2>
<section class="tpl-facts">
<p><strong>${l('Dành cho', 'For')}</strong> ${l('A: đồ hằng ngày, mền màn · B: đồ cần giữ form', 'A: everyday clothes, bedding · B: clothes that must keep their shape')}</p>
<p><strong>${l('Tính giá', 'Pricing')}</strong> ${l('A: theo cân nặng · B: theo món', 'A: by weight · B: per item')}</p>
<p><strong>${l('Giá tham khảo', 'Prices')}</strong> ${l('A: từ 35.000 ₫ một lần · B: từ 50.000 ₫/cái', 'A: from 35,000 ₫ a load · B: from 50,000 ₫ an item')}</p>
<p><strong>${l('Gửi ở', 'Where')}</strong> ${l('Cả hai chi nhánh', 'Both branches')}</p>
</section>
<h2>${l('Điểm mạnh và điểm cần cân nhắc', 'Strengths and trade-offs')}</h2>
<section class="tpl-compare">
<div class="tpl-item">
<h3>${l('Giặt sấy máy', 'Machine wash & dry')}</h3>
<ul class="tpl-pros">
<li>${l('Giá theo ký, tiết kiệm cho đồ nhiều.', 'Priced by weight: good value for big loads.')}</li>
<li>${l('Mỗi người 1 máy, không giặt chung.', 'One machine per customer, never mixed.')}</li>
</ul>
<ul class="tpl-cons">
<li>${l('Không hợp đồ len, lụa, da, vest.', 'Not for wool, silk, leather or suits.')}</li>
</ul>
</div>
<div class="tpl-item">
<h3>${l('Giặt hấp', 'Dry cleaning')}</h3>
<ul class="tpl-pros">
<li>${l('Giữ form và chất liệu.', 'Keeps shape and fabric.')}</li>
<li>${l('Hợp đồ mặc dịp quan trọng.', 'Right for special-occasion clothes.')}</li>
</ul>
<ul class="tpl-cons">
<li>${l('Tính theo món nên cao hơn giặt máy.', 'Priced per item, so more than a machine wash.')}</li>
</ul>
</div>
</section>
<h2>${l('Theo từng món', 'Item by item')}</h2>
<section class="tpl-split">
<div class="tpl-media"><figure>${ph('4x3', l('[Ảnh áo sơ mi, quần jean]', '[Shirts and jeans]'))}</figure></div>
<div class="tpl-body">
<h3>${l('Jean, thun, sơ mi', 'Jeans, T-shirts, shirts')}</h3>
<p>${l('Thường giặt máy là đủ. Muốn kỹ hơn, giặt hấp 50.000 ₫/cái.', 'A machine wash is usually enough. For extra care, dry cleaning is 50,000 ₫ an item.')}</p>
</div>
</section>
<section class="tpl-split-reverse">
<div class="tpl-media"><figure>${ph('4x3', l('[Ảnh bộ vest]', '[A suit]'))}</figure></div>
<div class="tpl-body">
<h3>${l('Bộ vest', 'Suits')}</h3>
<p>${l('Nên giặt hấp để giữ form: 120.000 ₫/bộ.', 'Dry clean to keep the shape: 120,000 ₫ a set.')}</p>
</div>
</section>
<section class="tpl-split">
<div class="tpl-media"><figure>${ph('4x3', l('[Ảnh áo len]', '[A wool sweater]'))}</figure></div>
<div class="tpl-body">
<h3>${l('Đồ len, lông, da, lụa', 'Wool, fur, leather, silk')}</h3>
<p>${l('Giặt hấp: 80.000 ₫/cái.', 'Dry cleaning: 80,000 ₫ an item.')}</p>
</div>
</section>
<section class="tpl-summary">
<h3>${l('Kết luận', 'Verdict')}</h3>
<p><strong>${l('Chọn giặt máy nếu', 'Machine wash if')}</strong> ${l('đó là đồ mặc hằng ngày hoặc mền màn.', 'it’s everyday wear or bedding.')}</p>
<p><strong>${l('Chọn giặt hấp nếu', 'Dry clean if')}</strong> ${l('món đồ cần giữ form hoặc làm từ len, lụa, da.', 'it must keep its shape or is wool, silk or leather.')}</p>
<p class="tpl-small">${l('Còn phân vân? Mang món đồ tới quầy, nhân viên sẽ tư vấn.', 'Not sure? Bring the item to the counter and ask.')}</p>
</section>
`,
};

/* ─────────────────────────── 7. Timeline ─────────────────────────── */

const milestone = (l: L, year: string, title: string, text: string, img = '') => `
<div class="tpl-item">
<h3 class="tpl-year">${year}</h3>
<p><strong>${title}</strong> — ${text}</p>${img ? `\n<figure>${img}</figure>` : ''}
</div>`;

const timeline: ArticleTemplateSeed = {
  key: 'timeline',
  categoryKey: 'shop',
  slug: { vi: 'mau-07-chang-duong-cua-sfaster', en: 'template-07-the-sfaster-journey' },
  title: (l) =>
    l(
      '[Mẫu 7] Chặng đường của SFaster qua từng mốc',
      '[Template 7] The SFaster journey, milestone by milestone',
    ),
  excerpt: (l) =>
    l(
      'Mẫu dòng thời gian: dải con số, các mốc năm nối bằng đường kẻ, ảnh tư liệu và hộp tối cho mốc tiếp theo.',
      'Timeline template: a row of figures, year milestones on a line, archive photos and a dark box for what’s next.',
    ),
  body: (l) => `
<p class="tpl-lead">${l(
    '[Đoạn dẫn: vì sao nhìn lại lúc này — một dịp kỷ niệm, chi nhánh mới.] Chỉ ghi những mốc có giấy tờ hoặc người xác nhận.',
    '[Intro: why look back now — an anniversary, a new branch.] Only list milestones someone can confirm.',
  )}</p>
<section class="tpl-stats">
<p><strong>2</strong> ${l('chi nhánh tại TP.HCM', 'branches in HCMC')}</p>
<p><strong>1</strong> ${l('máy cho mỗi khách', 'machine per customer')}</p>
<p><strong>13</strong> ${l('giờ mở cửa mỗi ngày', 'opening hours a day')}</p>
<p><strong>7+1</strong> ${l('giặt 7 lần tặng 1', 'wash 7, get 1 free')}</p>
</section>
<h2>${l('Các mốc', 'Milestones')}</h2>
<section class="tpl-timeline">${milestone(l, l('[Năm]', '[Year]'), l('Mở tiệm đầu tiên', 'The first shop'), l('[Ở đâu, ai mở, mấy máy.]', '[Where, who opened it, how many machines.]'), ph('16x9', l('[Ảnh tư liệu ngày mở tiệm]', '[Archive photo of the opening]')))}${milestone(l, l('[Năm]', '[Year]'), l('Mỗi người 1 máy', 'One customer, one machine'), l('[Khi nào tiệm chọn nguyên tắc không giặt chung, vì sao.]', '[When the shop chose never to mix loads, and why.]'))}${milestone(l, l('[Năm]', '[Year]'), l('Máy giặt, máy sấy Electrolux', 'Electrolux washers and dryers'), l('[Khi nào trang bị dàn máy hiện tại.]', '[When the current machines arrived.]'), photo('machines.jpg', machinesAlt(l)))}${milestone(l, l('[Năm]', '[Year]'), l('Thêm dịch vụ', 'More services'), l('Giặt hấp, vệ sinh giày, gấu bông, topper, mũ bảo hiểm. [Năm bắt đầu từng dịch vụ.]', 'Dry cleaning, shoes, plush toys, toppers, helmets. [When each started.]'))}${milestone(l, l('[Năm]', '[Year]'), l('Hai chi nhánh', 'Two branches'), l('40 Cửu Long (Phường Hòa Hưng) và 68 Lê Hồng Phong (Phường Chợ Quán).', '40 Cửu Long (Hòa Hưng ward) and 68 Lê Hồng Phong (Chợ Quán ward).'), photo('signboard.jpg', signAlt(l)))}
</section>
<blockquote class="tpl-pull">${l('[Một câu của chủ tiệm về chặng đường.]', '[A line from the owner about the journey.]')}</blockquote>
<section class="tpl-dark">
<h3>${l('Mốc tiếp theo', 'What’s next')}</h3>
<p>${l('[Kế hoạch đã quyết định — chỉ ghi điều chắc chắn sẽ làm.]', '[A plan already decided — only what will surely happen.]')}</p>
</section>
`,
};

/* ─────────────────────────── 8. Photo essay ─────────────────────────── */

const photoEssay: ArticleTemplateSeed = {
  key: 'photo-essay',
  categoryKey: 'shop',
  slug: { vi: 'mau-08-tiem-giat-qua-ong-kinh', en: 'template-08-the-laundry-in-pictures' },
  title: (l) => l('[Mẫu 8] Tiệm giặt qua ống kính', '[Template 8] The laundry in pictures'),
  excerpt: (l) =>
    l(
      'Mẫu phóng sự ảnh: ảnh toàn màn hình, lưới ghép ảnh, bộ ba ảnh vuông, chữ ngắn làm nhịp nghỉ.',
      'Photo essay template: full-width photos, a mosaic, a row of three squares, short text as pauses.',
    ),
  body: (l) => `
<p class="tpl-lead">${l('Một ngày ở SFaster, kể bằng hình. Chữ chỉ làm nhịp nghỉ giữa những khung ảnh.', 'A day at SFaster, told in pictures. The words are just pauses between frames.')}</p>
<figure class="tpl-full">${photo('signboard.jpg', signAlt(l))}<figcaption>${l('Biển hiệu SFaster.', 'The SFaster sign.')}</figcaption></figure>
<h2 class="tpl-center">${l('Buổi sáng', 'Morning')}</h2>
<p>${l('[Hai câu về lúc tiệm mở cửa, 7:00.]', '[Two lines about opening time, 7:00.]')}</p>
<section class="tpl-mosaic">
<figure>${photo('machines.jpg', machinesAlt(l))}</figure>
<figure>${ph('4x3', l('[Ảnh quầy nhận đồ]', '[The counter]'))}</figure>
<figure>${ph('4x3', l('[Ảnh cân đồ]', '[Weighing a load]'))}</figure>
</section>
<h2 class="tpl-center">${l('Buổi trưa', 'Midday')}</h2>
<p>${l('[Hai câu về lúc tiệm đông nhất.]', '[Two lines about the busiest hour.]')}</p>
<section class="tpl-gallery-3">
<figure>${ph('1x1', l('[Chi tiết: lồng giặt]', '[Detail: a drum]'))}</figure>
<figure>${ph('1x1', l('[Chi tiết: đồ đang gấp]', '[Detail: folding]'))}</figure>
<figure>${ph('1x1', l('[Chi tiết: phiếu tên]', '[Detail: a name ticket]'))}</figure>
</section>
<blockquote class="tpl-pull">${l('[Một câu nghe được ở quầy trong ngày.]', '[A line overheard at the counter.]')}</blockquote>
<h2 class="tpl-center">${l('Buổi tối', 'Evening')}</h2>
<p>${l('[Hai câu về lúc khách tan làm ghé lấy đồ, trước 20:00.]', '[Two lines about people picking up after work, before 20:00.]')}</p>
<figure class="tpl-wide">${photo('shelves.jpg', shelvesAlt(l))}<figcaption>${l('Túi đồ chờ chủ.', 'Bags waiting for their owners.')}</figcaption></figure>
<section class="tpl-gallery">
<figure>${ph('3x4', l('[Ảnh dọc 1]', '[Portrait photo 1]'))}<figcaption>${l('[Chú thích.]', '[Caption.]')}</figcaption></figure>
<figure>${ph('3x4', l('[Ảnh dọc 2]', '[Portrait photo 2]'))}<figcaption>${l('[Chú thích.]', '[Caption.]')}</figcaption></figure>
</section>
<p class="tpl-byline">${l('Ảnh: [Tên người chụp] · [Ngày chụp]', 'Photos: [Photographer] · [Date]')}</p>
`,
};

/* ─────────────────────────── 9. News ─────────────────────────── */

const news: ArticleTemplateSeed = {
  key: 'news',
  categoryKey: 'shop',
  slug: { vi: 'mau-09-sfaster-co-hai-chi-nhanh', en: 'template-09-sfaster-has-two-branches' },
  title: (l) =>
    l(
      '[Mẫu 9] SFaster có hai chi nhánh tại TP.HCM',
      '[Template 9] SFaster now has two branches in Ho Chi Minh City',
    ),
  excerpt: (l) =>
    l(
      'Mẫu tin tức: hộp điểm chính, bảng thông tin, ảnh và chữ, thẻ ba cột, hỏi nhanh và dải liên hệ.',
      'News template: key points box, a facts table, photo and text, three cards, quick questions and a contact band.',
    ),
  body: (l) => `
<section class="tpl-summary">
<h3>${l('Điểm chính', 'Key points')}</h3>
<ul class="tpl-check">
<li>${l('Hai chi nhánh: 40 Cửu Long và 68 Lê Hồng Phong.', 'Two branches: 40 Cửu Long and 68 Lê Hồng Phong.')}</li>
<li>${l('Mở cửa 7:00–20:00 hằng ngày, trừ Lễ, Tết.', 'Open 7:00–20:00 every day except public holidays.')}</li>
<li>${l('Cùng một bảng giá, cùng nguyên tắc mỗi người 1 máy.', 'Same prices, same one-customer-one-machine rule.')}</li>
<li>${l('Hotline và Zalo: 0984 763 100.', 'Hotline and Zalo: 0984 763 100.')}</li>
</ul>
</section>
<p class="tpl-lead">${l(
    'Giặt sấy SFaster phục vụ khách tại hai chi nhánh ở TP.HCM. [Thêm thời điểm và lý do mở chi nhánh, nếu muốn thông báo.]',
    'Giặt sấy SFaster serves customers at two branches in Ho Chi Minh City. [Add when and why the branch opened, if announcing it.]',
  )}</p>
<section class="tpl-facts">
<p><strong>${l('Chi nhánh 1', 'Branch 1')}</strong> ${l('40 Cửu Long, Phường Hòa Hưng, TP.HCM', '40 Cửu Long, Hòa Hưng ward, HCMC')}</p>
<p><strong>${l('Chi nhánh 2', 'Branch 2')}</strong> ${l('68 Lê Hồng Phong, Phường Chợ Quán, TP.HCM', '68 Lê Hồng Phong, Chợ Quán ward, HCMC')}</p>
<p><strong>${l('Giờ mở cửa', 'Hours')}</strong> ${l('7:00–20:00 hằng ngày, trừ Lễ, Tết', '7:00–20:00 daily, except public holidays')}</p>
<p><strong>${l('Liên hệ', 'Contact')}</strong> ${l('0984 763 100 (gọi hoặc Zalo)', '0984 763 100 (call or Zalo)')}</p>
</section>
<figure class="tpl-wide">${photo('signboard.jpg', signAlt(l))}</figure>
<h2>${l('Chi tiết', 'Details')}</h2>
<section class="tpl-split">
<div class="tpl-media"><figure>${photo('machines.jpg', machinesAlt(l))}</figure></div>
<div class="tpl-body">
<p>${l('Ở cả hai chi nhánh, đồ của bạn được giặt và sấy riêng trong máy Electrolux, rồi đóng túi và dán phiếu tên.', 'At both branches your laundry is washed and dried on its own in Electrolux machines, then bagged and labelled.')}</p>
<p>${l('[Thông tin riêng của chi nhánh, nếu có: chỗ để xe, cách tìm đường.]', '[Anything specific to a branch: parking, how to find it.]')}</p>
</div>
</section>
<section class="tpl-cards">
<div class="tpl-item"><h3>${l('Giặt sấy', 'Wash & dry')}</h3><p>${l('Quần áo, mền màn drap, tính theo ký.', 'Clothes and bedding, by weight.')}</p></div>
<div class="tpl-item"><h3>${l('Giặt hấp', 'Dry cleaning')}</h3><p>${l('Vest, đầm, len, lụa, da.', 'Suits, dresses, wool, silk, leather.')}</p></div>
<div class="tpl-item"><h3>${l('Dịch vụ khác', 'More')}</h3><p>${l('Giày, gấu bông, topper, mũ bảo hiểm.', 'Shoes, plush toys, toppers, helmets.')}</p></div>
</section>
<h2>${l('Hỏi nhanh', 'Quick questions')}</h2>
<section class="tpl-faq">
<div class="tpl-item"><h3>${l('Hai chi nhánh có cùng giá không?', 'Are prices the same at both branches?')}</h3><p>${l('[Xác nhận với tiệm trước khi đăng.]', '[Confirm with the shop before publishing.]')}</p></div>
<div class="tpl-item"><h3>${l('Ưu đãi giặt 7 lần tặng 1 có dùng chung không?', 'Does the 7 + 1 card work at both?')}</h3><p>${l('[Xác nhận với tiệm trước khi đăng.]', '[Confirm with the shop before publishing.]')}</p></div>
<div class="tpl-item"><h3>${l('Khi nào lấy được đồ?', 'When can I pick up?')}</h3><p>${l('Gọi hoặc nhắn Zalo 0984 763 100, tiệm sẽ báo giờ có đồ.', 'Call or message 0984 763 100 on Zalo and the shop will tell you.')}</p></div>
</section>
<section class="tpl-cta">
<h3>${l('Cần giặt đồ hôm nay?', 'Laundry day today?')}</h3>
<p>${l('Ghé chi nhánh gần bạn, hoặc gọi, nhắn Zalo 0984 763 100.', 'Drop by the nearest branch, or call or message 0984 763 100 on Zalo.')}</p>
</section>
`,
};

/* ─────────────────────────── 10. Handbook ─────────────────────────── */

const faq = (q: string, a: string) => `
<div class="tpl-item">
<h3>${q}</h3>
<p>${a}</p>
</div>`;

const handbook: ArticleTemplateSeed = {
  key: 'handbook',
  categoryKey: 'tips',
  slug: { vi: 'mau-10-cam-nang-gui-do-giat', en: 'template-10-laundry-handbook' },
  title: (l) =>
    l(
      '[Mẫu 10] Cẩm nang gửi đồ giặt ở SFaster: mọi điều cần biết',
      '[Template 10] The SFaster laundry handbook: everything to know',
    ),
  excerpt: (l) =>
    l(
      'Mẫu cẩm nang: mục lục, ảnh và chữ, thẻ ba cột, ghi chú – mẹo – lưu ý, hai cột nên/không nên và hỏi đáp.',
      'Handbook template: a table of contents, photo and text, three cards, note/tip/warning boxes, do and don’t columns and an FAQ.',
    ),
  body: (l) => `
<p class="tpl-lead">${l('Một bài đọc đủ cho cả khách lần đầu lẫn khách quen: giá, dịch vụ, cách gửi đồ và những câu hỏi hay gặp.', 'One read for first-timers and regulars alike: prices, services, how to drop off, and the usual questions.')}</p>
<section class="tpl-toc">
<p class="tpl-label">${l('Mục lục', 'Contents')}</p>
<ol>
<li><a href="#cach-tinh-gia">${l('Cách tính giá', 'How prices work')}</a></li>
<li><a href="#chon-dich-vu">${l('Chọn dịch vụ', 'Choosing a service')}</a></li>
<li><a href="#gui-va-nhan">${l('Gửi và nhận đồ', 'Drop-off and pick-up')}</a></li>
<li><a href="#luu-y">${l('Lưu ý', 'Good to know')}</a></li>
<li><a href="#hoi-dap">${l('Hỏi đáp', 'FAQ')}</a></li>
</ol>
</section>
<h2 id="cach-tinh-gia">${l('Cách tính giá', 'How prices work')}</h2>
<section class="tpl-split">
<div class="tpl-media"><figure class="tpl-framed">${photo('machines.jpg', machinesAlt(l))}</figure></div>
<div class="tpl-body">
<p>${l('Quần áo tính theo lần giặt, theo cân nặng khi gửi: dưới 2 kg 35.000 ₫, 2–3 kg 45.000 ₫, 3–4 kg 55.000 ₫, 4–5 kg 65.000 ₫, 5–6 kg 75.000 ₫; từ 7 kg trở lên 12.000 ₫/kg.', 'Clothes are priced per load by the weight at drop-off: 35,000 ₫ under 2 kg, 45,000 ₫ for 2–3 kg, 55,000 ₫ for 3–4 kg, 65,000 ₫ for 4–5 kg, 75,000 ₫ for 5–6 kg; 12,000 ₫/kg from 7 kg.')}</p>
<p>${l('Mền, màn cửa, drap: dưới 1 kg 35.000 ₫ một lần, từ 1 kg 25.000 ₫/kg.', 'Duvets, curtains, sheets: 35,000 ₫ a load under 1 kg, 25,000 ₫/kg from 1 kg.')}</p>
</div>
</section>
<section class="tpl-callout tpl-note">
<p><strong>${l('Ghi chú:', 'Note:')}</strong> ${l('Từ 6 đến 7 kg chưa có trong bảng giá, vui lòng hỏi tiệm.', '6–7 kg isn’t on the price board: please ask the shop.')}</p>
</section>
<h2 id="chon-dich-vu">${l('Chọn dịch vụ', 'Choosing a service')}</h2>
<section class="tpl-cards">
<div class="tpl-item">${ph('4x3', l('[Ảnh quần áo hằng ngày]', '[Everyday clothes]'))}<h3>${l('Giặt sấy', 'Wash & dry')}</h3><p>${l('Quần áo hằng ngày, mền màn: theo ký.', 'Everyday clothes, bedding: by weight.')}</p></div>
<div class="tpl-item">${ph('4x3', l('[Ảnh vest, đầm]', '[Suits, dresses]'))}<h3>${l('Giặt hấp', 'Dry cleaning')}</h3><p>${l('Vest 120.000 ₫, đầm 100.000 ₫, len lụa da 80.000 ₫, jean thun sơ mi 50.000 ₫.', 'Suits 120,000 ₫, dresses 100,000 ₫, wool/silk/leather 80,000 ₫, jeans/shirts 50,000 ₫.')}</p></div>
<div class="tpl-item">${ph('4x3', l('[Ảnh giày, gấu bông]', '[Shoes, plush toys]'))}<h3>${l('Dịch vụ khác', 'More')}</h3><p>${l('Giày 75.000 ₫/đôi, gấu bông 25.000 ₫/500 g, topper 35.000 ₫/kg, mũ bảo hiểm 35.000 ₫, giặt tay 30.000 ₫, ủi 20.000 ₫/cái.', 'Shoes 75,000 ₫ a pair, plush 25,000 ₫/500 g, toppers 35,000 ₫/kg, helmets 35,000 ₫, hand wash 30,000 ₫, ironing 20,000 ₫ an item.')}</p></div>
</section>
<section class="tpl-callout tpl-tip">
<p><strong>${l('Mẹo:', 'Tip:')}</strong> ${l('Giặt 7 lần tặng 1: lần giặt thứ tám tiệm tặng bạn. Hỏi quầy để biết chi tiết.', 'Wash 7 times, get 1 free: your eighth wash is on the shop. Ask at the counter for details.')}</p>
</section>
<h2 id="gui-va-nhan">${l('Gửi và nhận đồ', 'Drop-off and pick-up')}</h2>
<ol class="tpl-steps">
<li><strong>${l('Gửi đồ', 'Drop off')}</strong> — ${l('mang tới tiệm, hoặc gọi, nhắn Zalo trước.', 'bring it in, or call or message on Zalo first.')}</li>
<li><strong>${l('Cân và ghi phiếu', 'Weigh and ticket')}</strong> — ${l('tiệm cân đồ và ghi phiếu kèm giá.', 'the shop weighs it and writes a ticket with the price.')}</li>
<li><strong>${l('Giặt máy riêng', 'Its own machine')}</strong> — ${l('mỗi người 1 máy.', 'one customer, one machine.')}</li>
<li><strong>${l('Đóng túi, nhận đồ', 'Bagged, collected')}</strong> — ${l('đồ sạch đóng túi kèm phiếu, chờ bạn tới lấy.', 'clean laundry is bagged with its ticket until you pick it up.')}</li>
</ol>
<figure class="tpl-wide">${photo('shelves.jpg', shelvesAlt(l))}</figure>
<h2 id="luu-y">${l('Lưu ý', 'Good to know')}</h2>
<section class="tpl-cols">
<div>
<h3>${l('Nên', 'Do')}</h3>
<ul class="tpl-pros">
<li>${l('Lấy hết đồ trong túi quần áo.', 'Empty every pocket.')}</li>
<li>${l('Báo trước đồ dễ ra màu.', 'Mention clothes that may bleed.')}</li>
<li>${l('Giữ phiếu đến khi nhận đồ.', 'Keep the ticket until pick-up.')}</li>
</ul>
</div>
<div>
<h3>${l('Không nên', 'Don’t')}</h3>
<ul class="tpl-cons">
<li>${l('Gửi đồ len, lụa, da, vest để giặt máy.', 'Put wool, silk, leather or suits in a machine wash.')}</li>
<li>${l('Quên chỉ vết bẩn khó (dầu mỡ, mực, son phấn).', 'Forget to point out tough stains (grease, ink, make-up).')}</li>
</ul>
</div>
</section>
<section class="tpl-callout tpl-warn">
<p><strong>${l('Lưu ý:', 'Heads-up:')}</strong> ${l('Tiệm nghỉ Lễ, Tết. Mở cửa 7:00–20:00 các ngày còn lại.', 'The shop closes on public holidays. Open 7:00–20:00 every other day.')}</p>
</section>
<h2 id="hoi-dap">${l('Hỏi đáp', 'FAQ')}</h2>
<section class="tpl-faq">${faq(
    l(
      'Đồ của tôi có bị giặt chung với người khác không?',
      'Is my laundry washed with other people’s?',
    ),
    l(
      'Không. SFaster giặt theo nguyên tắc mỗi người 1 máy.',
      'No. SFaster works on one customer, one machine.',
    ),
  )}${faq(
    l('Khi nào tôi lấy được đồ?', 'When can I pick up?'),
    l(
      'Tùy số lượng và dịch vụ. Gọi hoặc nhắn Zalo 0984 763 100, tiệm sẽ báo giờ có đồ.',
      'It depends on the amount and the service. Call or message 0984 763 100 on Zalo and the shop will tell you.',
    ),
  )}${faq(
    l('Tiệm ở đâu?', 'Where is the shop?'),
    l(
      '40 Cửu Long (Phường Hòa Hưng) và 68 Lê Hồng Phong (Phường Chợ Quán), TP.HCM.',
      '40 Cửu Long (Hòa Hưng ward) and 68 Lê Hồng Phong (Chợ Quán ward), Ho Chi Minh City.',
    ),
  )}${faq(
    l(
      'Đồ len, lụa, da, vest có giặt máy được không?',
      'Can wool, silk, leather or suits go in the machine?',
    ),
    l(
      'Nên chọn giặt hấp để giữ form và chất liệu.',
      'Better in dry cleaning, which keeps their shape and fabric.',
    ),
  )}
</section>
`,
};

export const LAUNDRY_TEMPLATES: ArticleTemplateSeed[] = [
  magazine,
  chapters,
  steps,
  ranked,
  interview,
  compare,
  timeline,
  photoEssay,
  news,
  handbook,
];
