import type { StaticImageData } from 'next/image';
import type { SiteMessages } from '@/i18n/dictionaries';
import haGiang from '../../public/images/ha-giang.jpg';
import haLong from '../../public/images/ha-long.jpg';
import hoiAn from '../../public/images/hoi-an.jpg';
import phuQuoc from '../../public/images/phu-quoc.jpg';

/**
 * The tours (FICTIONAL, like the agency): price per adult in đồng, length and group size. Names,
 * regions and highlights are in the dictionaries (`tours.items.<id>`).
 */
export interface Tour {
  id: keyof SiteMessages['tours']['items'] & string;
  region: keyof SiteMessages['tours']['regions'] & string;
  days: number;
  nights: number;
  maxGroup: number;
  price: number;
  image: StaticImageData;
}

export const tours: Tour[] = [
  { id: 'haLong', region: 'north', days: 2, nights: 1, maxGroup: 16, price: 3_290_000, image: haLong },
  { id: 'haGiang', region: 'north', days: 4, nights: 3, maxGroup: 10, price: 5_990_000, image: haGiang },
  { id: 'hoiAn', region: 'centre', days: 3, nights: 2, maxGroup: 14, price: 4_590_000, image: hoiAn },
  { id: 'phuQuoc', region: 'south', days: 4, nights: 3, maxGroup: 16, price: 6_490_000, image: phuQuoc },
];
