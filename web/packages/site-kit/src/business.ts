/**
 * A business site's facts (ADR 0042): who, where, when, how to reach it. Hard-coded per site in
 * `src/content/business.ts`; every visible word stays in the site's dictionaries. Client-safe.
 */

export type Weekday = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

/** One row of opening hours; its label is `t.hours[key]` in the site's dictionaries. */
export interface OpeningHours {
  key: string;
  days: Weekday[];
  /** "HH:MM", local time. */
  open: string;
  close: string;
}

export interface Phone {
  display: string;
  href: string;
}

export interface Business {
  /** content-service site id (ADR 0026), also the Keycloak group `/sites/<id>`. */
  siteId: string;
  /** Short name (the logo's big word). */
  name: string;
  /** Full name: titles, legal pages, JSON-LD. */
  fullName: string;
  /** The name in page titles, link previews and the website (default: fullName). */
  siteName?: string;
  /** The registered company name, when it differs (JSON-LD, the footer's copyright). */
  legalName?: string;
  /** A sample site: the business is fictional (a notice in the footer, ADR 0042). */
  sample: boolean;
  /** The number to call: header, buttons, JSON-LD. */
  phone: Phone;
  /** Zalo (Vietnam): the phones' action bar and the contact buttons; none outside Vietnam. */
  zaloHref?: string;
  email?: string;
  /**
   * The postal address. `country`: ISO 3166 code, default VN. `locality`: JSON-LD's
   * addressLocality when it isn't the ward (or the city, without a ward).
   */
  address: { street: string; ward?: string; city: string; region: string; postalCode?: string; country?: string; locality?: string };
  /** What Google Maps searches for (the map embed and "Get directions"). */
  mapQuery: string;
  /** The business's own Maps link (a short link), else a search for `mapQuery`. */
  mapsHref?: string;
  /** Zoom of the map embed (default 16). */
  mapZoom?: number;
  /** Empty: no opening hours shown (orders by phone only). */
  hours: OpeningHours[];
  /** Social profiles (JSON-LD `sameAs`; a site may show them). */
  socials?: { id: string; label: string; href: string }[];
  /** schema.org LocalBusiness subtype and extra properties (servesCuisine, potentialAction…). */
  schema: { type: string; priceRange?: string; logo?: string; extra?: Record<string, unknown> };
  /** The language cookie (in dev every site runs on localhost: one cookie per site). */
  cookieName: string;
}

/** One line: "18 Thái Văn Lung, Phường Sài Gòn, TP.HCM" / "2241 Treelight Way, Wendell, NC 27591". */
export function fullAddress(business: Business): string {
  const { street, ward, city, region, postalCode } = business.address;
  return [street, ward, postalCode ? `${city}, ${region} ${postalCode}` : city].filter(Boolean).join(', ');
}

/** The business on Google Maps (opens the app on phones). */
export function mapsHref(business: Business): string {
  return business.mapsHref ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.mapQuery)}`;
}

/** The keyless Google Maps embed (www.google.com: `frameOrigins` of the proxy). */
export function mapEmbedSrc(business: Business, locale: string): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(business.mapQuery)}&hl=${locale}&z=${business.mapZoom ?? 16}&output=embed`;
}
