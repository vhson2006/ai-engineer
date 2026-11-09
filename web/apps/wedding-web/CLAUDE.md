@AGENTS.md

# wedding-web: wedding invitation of Văn Hải Sơn & Trần Thị Trúc Giang

One app of the web workspace: **read `web/CLAUDE.md` first** (non-negotiables, rules, skill,
commands; they apply here).

Specific to this app:
- **An online wedding invitation** (one page): names, events, schedule and photos in
  `src/content/wedding.ts`; sentences in `src/i18n/messages/<lang>.json`. Values marked
  `PLACEHOLDER` (date, times, venue, addresses) are assumptions until the couple confirms them;
  the date appears everywhere through `mainEvent` (never hard-code it in a dictionary: use `{date}`).
- Dates are always Vietnam time (`src/lib/dates.ts` + tests): long date, lunar date (âm lịch,
  from Intl's Chinese calendar + can chi), Google Calendar link, `.ics` file
  (`src/app/calendar.ics/route.ts`, listed in `ROUTING.bypass`).
- Countdown and album lightbox are client components (`src/features/`); the countdown renders
  placeholders on the server (the page is prerendered) and fills in after hydration.
- Private by link: `robots: noindex`. No RSVP or guestbook yet: they store guests' data, so they
  need the API + a Server Action (`/new-form`), never a client-side submit.
- Look: ivory, champagne gold `--brand`, `--gold-light`, `--blush`, espresso `--deep`. Fonts:
  Great Vibes (`font-script`, names), Cormorant Garamond (`font-display`), Be Vietnam Pro.
  Navigation: `@web/ui/section-nav` + `<SmoothScroll />`.
- Photos in `public/images/` are the couple's own, resized to 1600 px (EXIF rotation applied).
- Not deployed yet: no Dockerfile, k8s manifests or Gateway route.

`npm run dev` (http://localhost:3500), `npm test`, `npm run typecheck`, `npm run lint`:
from this folder or from `web/` (`npm run dev:wedding`).
