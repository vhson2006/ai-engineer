/*
 * Video studio (ADR 0039): the script templates and the voices. Code, versioned: a project keeps
 * the template VERSION it was made with. Each template id is also a Remotion composition of the
 * same name in `web/packages/video` (render-worker, admin preview): change both together.
 *
 * Slots are what the admin fills in: images (from the site's media library), avatars (from the
 * site's avatar library), a voice per speaker, facts (free text, or a published article). Scenes
 * are what the AI writes: one spoken line and one on-screen text each, within the limits.
 * A scene whose image slot is optional and empty is left out. Every video ends on the brand card.
 */

export type StudioLocale = 'vi' | 'en';
export type Localized = Record<StudioLocale, string>;

export interface StudioImageSlot {
  id: string;
  label: Localized;
  hint: Localized;
  required: boolean;
}

export interface StudioAvatarSlot {
  id: string;
  label: Localized;
}

export interface StudioSpeaker {
  id: string;
  label: Localized;
  /** The speaker is this avatar (its default voice, unless the admin picks another). */
  avatar?: string;
}

export interface StudioFactSlot {
  id: string;
  label: Localized;
  hint: Localized;
  /** `article`: the admin picks a published article; its text is the fact. */
  kind: 'text' | 'article';
  required: boolean;
  maxLength: number;
}

export interface StudioScene {
  id: string;
  /** For the AI, in English: what this scene must say. */
  purpose: string;
  /** The image shown (an image slot id). Without one: the brand card. */
  image?: string;
  /** The avatar shown (an avatar slot id): full screen without an image, in a corner with one. */
  avatar?: string;
  speaker: string;
  maxWords: number;
  onScreenMaxChars: number;
}

export interface StudioTemplate {
  id: string;
  version: number;
  name: Localized;
  description: Localized;
  aspect: '9:16';
  /** Typical length, for the admin (the real length follows the voice). */
  seconds: [number, number];
  /** Sites that must not use it (wine: no prices or promotions for alcohol). */
  excludeSites: string[];
  /** The template's own instructions for the AI, in English. */
  instructions: string;
  images: StudioImageSlot[];
  avatars: StudioAvatarSlot[];
  speakers: StudioSpeaker[];
  facts: StudioFactSlot[];
  scenes: StudioScene[];
}

const L = (vi: string, en: string): Localized => ({ vi, en });

export const STUDIO_TEMPLATES: StudioTemplate[] = [
  {
    id: 'price-hook',
    version: 1,
    name: L('Giá nổi bật', 'Price hook'),
    description: L(
      'Mở đầu bằng một mức giá thật, hai lợi ích, kết bằng lời kêu gọi. 12–18 giây, không cần avatar.',
      'Opens on a real price, two benefits, then the call to action. 12–18 seconds, no avatar.',
    ),
    aspect: '9:16',
    seconds: [12, 18],
    excludeSites: ['wine'],
    instructions:
      'A fast price-led clip. The first line states the price exactly as written in the fact "price". The two benefit lines use only the facts and the brand. The last line is the brand\'s call to action.',
    images: [
      {
        id: 'hero',
        label: L('Ảnh chính', 'Main image'),
        hint: L('Sản phẩm hoặc dịch vụ của mức giá, rõ nét', 'The product or service of the price'),
        required: true,
      },
      {
        id: 'detail1',
        label: L('Ảnh lợi ích 1', 'Benefit image 1'),
        hint: L('Minh hoạ lợi ích thứ nhất', 'Shows the first benefit'),
        required: true,
      },
      {
        id: 'detail2',
        label: L('Ảnh lợi ích 2', 'Benefit image 2'),
        hint: L('Minh hoạ lợi ích thứ hai (tuỳ chọn)', 'Shows the second benefit (optional)'),
        required: false,
      },
    ],
    avatars: [],
    speakers: [{ id: 'narrator', label: L('Người dẫn (không hiện mặt)', 'Narrator (off screen)') }],
    facts: [
      {
        id: 'price',
        label: L('Mức giá', 'Price'),
        hint: L(
          'Đúng như bảng giá, ví dụ "Giặt sấy từ 35.000đ/mẻ"',
          'As on the price list, e.g. "Gel manicure $35"',
        ),
        kind: 'text',
        required: true,
        maxLength: 200,
      },
      {
        id: 'benefits',
        label: L('Lợi ích', 'Benefits'),
        hint: L('Mỗi dòng một lợi ích có thật', 'One real benefit per line'),
        kind: 'text',
        required: false,
        maxLength: 600,
      },
    ],
    scenes: [
      {
        id: 'hook',
        purpose: 'Hook: state the price from the fact "price", as a short question or exclamation.',
        image: 'hero',
        speaker: 'narrator',
        maxWords: 12,
        onScreenMaxChars: 28,
      },
      {
        id: 'benefit1',
        purpose: 'First benefit, from the facts or the brand.',
        image: 'detail1',
        speaker: 'narrator',
        maxWords: 14,
        onScreenMaxChars: 32,
      },
      {
        id: 'benefit2',
        purpose: 'Second, different benefit, from the facts or the brand.',
        image: 'detail2',
        speaker: 'narrator',
        maxWords: 14,
        onScreenMaxChars: 32,
      },
      {
        id: 'cta',
        purpose: "Call to action: the brand's call to action, mention the business name.",
        speaker: 'narrator',
        maxWords: 12,
        onScreenMaxChars: 30,
      },
    ],
  },
  {
    id: 'host-intro',
    version: 1,
    name: L('Tư vấn viên giới thiệu', 'Host introduction'),
    description: L(
      'Một avatar chào, giới thiệu 3–4 điểm nổi bật kèm ảnh, rồi mời liên hệ. 20–30 giây.',
      'An avatar greets, presents 3–4 highlights with photos, then invites viewers to get in touch. 20–30 seconds.',
    ),
    aspect: '9:16',
    seconds: [20, 30],
    excludeSites: [],
    instructions:
      'A friendly host speaking to the viewer in the first person ("we", the business). Greet, present each highlight in one sentence, close with the call to action. The host is staff of the business: never a customer, never a testimonial.',
    images: [
      {
        id: 'point1',
        label: L('Ảnh điểm 1', 'Highlight image 1'),
        hint: L('Điểm nổi bật thứ nhất', 'First highlight'),
        required: true,
      },
      {
        id: 'point2',
        label: L('Ảnh điểm 2', 'Highlight image 2'),
        hint: L('Điểm nổi bật thứ hai', 'Second highlight'),
        required: true,
      },
      {
        id: 'point3',
        label: L('Ảnh điểm 3', 'Highlight image 3'),
        hint: L('Điểm nổi bật thứ ba', 'Third highlight'),
        required: true,
      },
      {
        id: 'point4',
        label: L('Ảnh điểm 4', 'Highlight image 4'),
        hint: L('Điểm nổi bật thứ tư (tuỳ chọn)', 'Fourth highlight (optional)'),
        required: false,
      },
    ],
    avatars: [{ id: 'host', label: L('Tư vấn viên', 'Host') }],
    speakers: [{ id: 'host', label: L('Tư vấn viên', 'Host'), avatar: 'host' }],
    facts: [
      {
        id: 'topic',
        label: L('Giới thiệu điều gì', 'What to present'),
        hint: L('Ví dụ "dịch vụ giặt hấp và giặt chăn mền"', 'E.g. "our pedicure menu"'),
        kind: 'text',
        required: true,
        maxLength: 300,
      },
      {
        id: 'points',
        label: L('Các điểm nổi bật', 'Highlights'),
        hint: L('Mỗi dòng một điểm, theo thứ tự ảnh', 'One per line, in the order of the images'),
        kind: 'text',
        required: true,
        maxLength: 1000,
      },
    ],
    scenes: [
      {
        id: 'greet',
        purpose: 'The host greets the viewer and says what they will present (fact "topic").',
        avatar: 'host',
        speaker: 'host',
        maxWords: 16,
        onScreenMaxChars: 30,
      },
      {
        id: 'point1',
        purpose: 'First highlight (first line of the fact "points").',
        image: 'point1',
        avatar: 'host',
        speaker: 'host',
        maxWords: 16,
        onScreenMaxChars: 32,
      },
      {
        id: 'point2',
        purpose: 'Second highlight (second line of the fact "points").',
        image: 'point2',
        avatar: 'host',
        speaker: 'host',
        maxWords: 16,
        onScreenMaxChars: 32,
      },
      {
        id: 'point3',
        purpose: 'Third highlight (third line of the fact "points").',
        image: 'point3',
        avatar: 'host',
        speaker: 'host',
        maxWords: 16,
        onScreenMaxChars: 32,
      },
      {
        id: 'point4',
        purpose: 'Fourth highlight (fourth line of the fact "points").',
        image: 'point4',
        avatar: 'host',
        speaker: 'host',
        maxWords: 16,
        onScreenMaxChars: 32,
      },
      {
        id: 'cta',
        purpose: "The host closes with the brand's call to action.",
        avatar: 'host',
        speaker: 'host',
        maxWords: 14,
        onScreenMaxChars: 30,
      },
    ],
  },
  {
    id: 'article-tips',
    version: 1,
    name: L('Mẹo từ bài viết', 'Tips from an article'),
    description: L(
      'Tóm một bài viết đã đăng thành 3 mẹo ngắn, mời đọc bài đầy đủ trên website. 25–35 giây.',
      'Turns a published article into 3 short tips and invites viewers to read it on the website. 25–35 seconds.',
    ),
    aspect: '9:16',
    seconds: [25, 35],
    excludeSites: [],
    instructions:
      'Summarise the article (fact "article") into a hook and exactly three tips taken from it, in its order. Add nothing that is not in the article. The last line invites viewers to read the full article on the website.',
    images: [
      {
        id: 'image1',
        label: L('Ảnh mẹo 1', 'Tip image 1'),
        hint: L('Thường là ảnh bìa của bài', 'Usually the article cover'),
        required: true,
      },
      {
        id: 'image2',
        label: L('Ảnh mẹo 2', 'Tip image 2'),
        hint: L('Minh hoạ mẹo thứ hai', 'Shows the second tip'),
        required: true,
      },
      {
        id: 'image3',
        label: L('Ảnh mẹo 3', 'Tip image 3'),
        hint: L('Minh hoạ mẹo thứ ba', 'Shows the third tip'),
        required: true,
      },
    ],
    avatars: [],
    speakers: [{ id: 'narrator', label: L('Người dẫn (không hiện mặt)', 'Narrator (off screen)') }],
    facts: [
      {
        id: 'article',
        label: L('Bài viết', 'Article'),
        hint: L('Một bài đã đăng của site', 'A published article of the site'),
        kind: 'article',
        required: true,
        maxLength: 12_000,
      },
    ],
    scenes: [
      {
        id: 'hook',
        purpose: 'Hook: the problem or question the article answers.',
        image: 'image1',
        speaker: 'narrator',
        maxWords: 14,
        onScreenMaxChars: 30,
      },
      {
        id: 'tip1',
        purpose: 'Tip 1, from the article.',
        image: 'image1',
        speaker: 'narrator',
        maxWords: 18,
        onScreenMaxChars: 36,
      },
      {
        id: 'tip2',
        purpose: 'Tip 2, from the article.',
        image: 'image2',
        speaker: 'narrator',
        maxWords: 18,
        onScreenMaxChars: 36,
      },
      {
        id: 'tip3',
        purpose: 'Tip 3, from the article.',
        image: 'image3',
        speaker: 'narrator',
        maxWords: 18,
        onScreenMaxChars: 36,
      },
      {
        id: 'cta',
        purpose:
          'Invite viewers to read the full article on the website, mention the business name.',
        speaker: 'narrator',
        maxWords: 14,
        onScreenMaxChars: 30,
      },
    ],
  },
];

export function studioTemplate(id: string): StudioTemplate | undefined {
  return STUDIO_TEMPLATES.find((template) => template.id === id);
}

/**
 * The voices an admin can pick: the TTS provider's prebuilt voices (Gemini), each speaking any of
 * the site's languages. The id is what goes into SpeechLine.voice.
 */
export interface StudioVoice {
  id: string;
  label: Localized;
}

export const STUDIO_VOICES: StudioVoice[] = [
  { id: 'Kore', label: L('Nữ: rõ ràng, chắc chắn', 'Female: clear, firm') },
  { id: 'Aoede', label: L('Nữ: nhẹ nhàng, thoải mái', 'Female: light, relaxed') },
  { id: 'Leda', label: L('Nữ: trẻ trung', 'Female: youthful') },
  { id: 'Puck', label: L('Nam: vui vẻ, năng động', 'Male: upbeat') },
  { id: 'Charon', label: L('Nam: trầm, rõ ràng', 'Male: calm, informative') },
  { id: 'Orus', label: L('Nam: chắc chắn', 'Male: firm') },
];
export const STUDIO_VOICE_IDS = STUDIO_VOICES.map((voice) => voice.id);
