import type { StaticImageData } from 'next/image';
import type { Messages } from '@/i18n/messages';
import bouquet from '../../public/images/bouquet.jpg';
import corridor from '../../public/images/corridor.jpg';
import hands from '../../public/images/hands.jpg';
import music from '../../public/images/music.jpg';
import ring from '../../public/images/ring.jpg';
import stairs from '../../public/images/stairs.jpg';
import windowLight from '../../public/images/window.jpg';

/**
 * The wedding of Văn Hải Sơn & Trần Thị Trúc Giang. Names, places and times are data (here);
 * sentences are in src/i18n/messages/<lang>.json.
 *
 * PLACEHOLDER: the date, times, venue and addresses below are assumptions to be replaced by the
 * couple (search for "PLACEHOLDER"). Times are Vietnam time (UTC+7).
 */

export const couple = {
  groom: { short: 'Hải Sơn', full: 'Văn Hải Sơn' },
  bride: { short: 'Trúc Giang', full: 'Trần Thị Trúc Giang' },
  monogram: { groom: 'S', bride: 'G' },
  hashtag: '#SonGiangWedding',
} as const;

/** Vietnam has no daylight saving time: one fixed offset. */
export const TIME_ZONE = 'Asia/Ho_Chi_Minh';

export interface WeddingEvent {
  id: keyof Messages['events']['items'];
  /** ISO date-times with the +07:00 offset. */
  start: string;
  end: string;
  venue: string;
  address: string;
  mapsQuery: string;
}

export const events: WeddingEvent[] = [
  {
    id: 'ceremony',
    start: '2026-12-19T09:00:00+07:00', // PLACEHOLDER
    end: '2026-12-19T10:30:00+07:00', // PLACEHOLDER
    venue: 'Tư gia nhà trai', // PLACEHOLDER
    address: '45 Đường Hoa Lan, Phường 2, Quận Phú Nhuận, TP. Hồ Chí Minh', // PLACEHOLDER
    mapsQuery: '45 Hoa Lan, Phú Nhuận, Hồ Chí Minh',
  },
  {
    id: 'reception',
    start: '2026-12-19T17:30:00+07:00', // PLACEHOLDER
    end: '2026-12-19T21:00:00+07:00', // PLACEHOLDER
    venue: 'Nhà hàng Tiệc cưới Ánh Dương · Sảnh Hoa Hồng', // PLACEHOLDER
    address: '123 Nguyễn Văn Linh, Phường Tân Phong, Quận 7, TP. Hồ Chí Minh', // PLACEHOLDER
    mapsQuery: '123 Nguyễn Văn Linh, Quận 7, Hồ Chí Minh',
  },
];

/** The main moment (countdown, hero date, calendar file): the reception. */
export const mainEvent = events[1];

/** The evening's programme (reception), "HH:MM" Vietnam time. */
export const schedule: { id: keyof Messages['schedule']['items']; time: string }[] = [
  { id: 'welcome', time: '17:30' }, // PLACEHOLDER
  { id: 'ceremony', time: '18:00' },
  { id: 'dinner', time: '18:30' },
  { id: 'party', time: '19:30' },
];

export interface Photo {
  id: keyof Messages['photos'];
  image: StaticImageData;
}

export const photos = {
  bouquet: { id: 'bouquet', image: bouquet },
  corridor: { id: 'corridor', image: corridor },
  window: { id: 'window', image: windowLight },
  stairs: { id: 'stairs', image: stairs },
  ring: { id: 'ring', image: ring },
  music: { id: 'music', image: music },
  hands: { id: 'hands', image: hands },
} as const satisfies Record<string, Photo>;

/** Album order. */
export const album: Photo[] = [photos.corridor, photos.bouquet, photos.window, photos.ring, photos.stairs, photos.music, photos.hands];

/** Our story: one photo per chapter (the words are in the dictionaries; edit them freely). */
export const story: { id: keyof Messages['story']['items']; photo: Photo }[] = [
  { id: 'met', photo: photos.hands },
  { id: 'together', photo: photos.music },
  { id: 'proposal', photo: photos.ring },
  { id: 'wedding', photo: photos.window },
];
