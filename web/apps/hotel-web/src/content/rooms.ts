import type { StaticImageData } from 'next/image';
import type { SiteMessages } from '@/i18n/dictionaries';
import garden from '../../public/images/room-garden.jpg';
import deluxe from '../../public/images/room-deluxe.jpg';
import suite from '../../public/images/room-suite.jpg';

/**
 * The rooms (FICTIONAL, like the hotel): size, guests and the price per night in đồng, breakfast
 * included. Names, beds and features are in the dictionaries (`rooms.items.<id>`).
 */
export const rooms: { id: keyof SiteMessages['rooms']['items'] & string; size: number; guests: number; price: number; image: StaticImageData }[] = [
  { id: 'garden', size: 28, guests: 2, price: 1_450_000, image: garden },
  { id: 'deluxe', size: 32, guests: 2, price: 1_850_000, image: deluxe },
  { id: 'suite', size: 48, guests: 3, price: 2_950_000, image: suite },
];

/** Places nearby: minutes and how (dictionary: `location.places.<id>`). */
export const nearby: { id: keyof SiteMessages['location']['places'] & string; minutes: number; mode: 'walk' | 'bike' | 'car' }[] = [
  { id: 'oldTown', minutes: 5, mode: 'walk' },
  { id: 'market', minutes: 8, mode: 'walk' },
  { id: 'traQue', minutes: 10, mode: 'bike' },
  { id: 'anBang', minutes: 15, mode: 'car' },
  { id: 'myson', minutes: 60, mode: 'car' },
  { id: 'airport', minutes: 45, mode: 'car' },
];
