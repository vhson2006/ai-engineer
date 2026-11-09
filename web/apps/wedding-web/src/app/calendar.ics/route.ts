import { format } from '@web/core/i18n/format';
import { couple, events } from '@/content/wedding';
import { loadMessages } from '@/i18n/dictionaries';
import { DEFAULT_LOCALE, isLocale } from '@/i18n/locales';
import { icsFile } from '@/lib/dates';

/**
 * GET /calendar.ics?lang=vi: both wedding events as a calendar file (Apple Calendar, Outlook).
 * Read-only, public, no cookies; not a page, so it's listed in ROUTING.bypass.
 */
export async function GET(request: Request) {
  const lang = new URL(request.url).searchParams.get('lang') ?? '';
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const t = await loadMessages(locale);
  const names = { groom: couple.groom.short, bride: couple.bride.short };

  const body = icsFile(
    events.map((event) => ({
      uid: `${event.id}-${event.start}@son-giang-wedding`,
      title: `${t.events.items[event.id].name} · ${format(t.events.calendarTitle, names)}`,
      start: event.start,
      end: event.end,
      location: `${event.venue}, ${event.address}`,
      details: format(t.events.calendarDetails, names),
    })),
    new Date().toISOString(),
  );

  return new Response(body, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="son-giang-wedding.ics"',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
