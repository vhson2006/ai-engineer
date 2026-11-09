import { LOCALES, type Locale } from '@/i18n/locales';
import { TIME_ZONE } from '@/content/wedding';

/**
 * Date helpers for the invitation. Pure, client-safe, always in Vietnam time (the wedding's
 * time zone), whatever the guest's device says.
 */

const STEMS = ['Canh', 'Tân', 'Nhâm', 'Quý', 'Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ'];
const BRANCHES = ['Thân', 'Dậu', 'Tuất', 'Hợi', 'Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi'];

/** The sexagenary name of a lunar year: 2026 → "Bính Ngọ". */
export function canChi(year: number): string {
  return `${STEMS[year % 10]} ${BRANCHES[year % 12]}`;
}

/**
 * The lunar date (âm lịch) of an instant, from the Chinese calendar of Intl (identical to the
 * Vietnamese one except on rare days where UTC+7 vs UTC+8 moves a new moon: double-check the
 * printed invitation).
 */
export function lunarDate(iso: string): { day: number; month: number; year: number; yearName: string } {
  const parts = new Intl.DateTimeFormat('en-u-ca-chinese', { day: 'numeric', month: 'numeric', year: 'numeric', timeZone: TIME_ZONE }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  const year = Number(get('relatedYear') || get('year'));
  return { day: Number(get('day')), month: Number.parseInt(get('month'), 10), year, yearName: canChi(year) };
}

/** "Thứ Bảy, 19 tháng 12, 2026" / "Saturday 19 December 2026". */
export function longDate(locale: Locale, iso: string): string {
  return new Intl.DateTimeFormat(LOCALES[locale].intl, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: TIME_ZONE }).format(new Date(iso));
}

/** "19.12.2026" style for the hero. */
export function shortDate(iso: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: TIME_ZONE }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('day')}.${get('month')}.${get('year')}`;
}

/** "17:30" in Vietnam time. */
export function time(locale: Locale, iso: string): string {
  return new Intl.DateTimeFormat(LOCALES[locale].intl, { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TIME_ZONE }).format(new Date(iso));
}

/** 20261219T103000Z (UTC, for calendar links and .ics files). */
export function utcStamp(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export interface CalendarEvent {
  title: string;
  start: string;
  end: string;
  location: string;
  details: string;
}

/** "Add to Google Calendar" link (opens Google's own page: no API, nothing stored here). */
export function googleCalendarUrl(event: CalendarEvent): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${utcStamp(event.start)}/${utcStamp(event.end)}`,
    location: event.location,
    details: event.details,
    ctz: TIME_ZONE,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** RFC 5545 text escaping. */
const escapeIcs = (text: string) => text.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');

/** An .ics file (Apple Calendar, Outlook, Google): one VEVENT per event, CRLF line endings. */
export function icsFile(events: (CalendarEvent & { uid: string })[], stamp: string): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//wedding-web//VI', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  for (const event of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${event.uid}`,
      `DTSTAMP:${utcStamp(stamp)}`,
      `DTSTART:${utcStamp(event.start)}`,
      `DTEND:${utcStamp(event.end)}`,
      `SUMMARY:${escapeIcs(event.title)}`,
      `LOCATION:${escapeIcs(event.location)}`,
      `DESCRIPTION:${escapeIcs(event.details)}`,
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}
