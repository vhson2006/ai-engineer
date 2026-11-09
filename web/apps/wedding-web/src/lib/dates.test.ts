import { describe, expect, it } from 'vitest';
import { canChi, googleCalendarUrl, icsFile, longDate, lunarDate, shortDate, time, utcStamp } from './dates';

const event = {
  title: 'Đám cưới Hải Sơn & Trúc Giang',
  start: '2026-12-19T17:30:00+07:00',
  end: '2026-12-19T21:00:00+07:00',
  location: 'Nhà hàng Ánh Dương, 123 Nguyễn Văn Linh; Quận 7',
  details: 'Trân trọng kính mời',
};

describe('wedding dates (Vietnam time)', () => {
  it('names lunar years', () => {
    expect(canChi(2026)).toBe('Bính Ngọ');
    expect(canChi(2025)).toBe('Ất Tỵ');
    expect(canChi(2024)).toBe('Giáp Thìn');
  });

  it('gives the lunar date of the wedding', () => {
    expect(lunarDate('2026-12-19T17:30:00+07:00')).toEqual({ day: 11, month: 11, year: 2026, yearName: 'Bính Ngọ' });
  });

  it('formats dates and times in Vietnam time, whatever the device zone', () => {
    expect(shortDate('2026-12-19T23:30:00+07:00')).toBe('19.12.2026'); // 16:30 UTC, still the 19th in Vietnam
    expect(time('vi', '2026-12-19T17:30:00+07:00')).toBe('17:30');
    expect(longDate('vi', '2026-12-19T17:30:00+07:00')).toMatch(/Thứ Bảy/);
    expect(longDate('en', '2026-12-19T17:30:00+07:00')).toMatch(/Saturday/);
  });

  it('builds calendar links and files in UTC', () => {
    expect(utcStamp(event.start)).toBe('20261219T103000Z');
    const url = new URL(googleCalendarUrl(event));
    expect(url.searchParams.get('dates')).toBe('20261219T103000Z/20261219T140000Z');
    expect(url.searchParams.get('text')).toBe(event.title);

    const ics = icsFile([{ ...event, uid: 'reception@wedding' }], '2026-11-08T00:00:00Z');
    expect(ics).toContain('DTSTART:20261219T103000Z\r\n');
    expect(ics).toContain('LOCATION:Nhà hàng Ánh Dương\\, 123 Nguyễn Văn Linh\\; Quận 7\r\n');
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
  });
});
