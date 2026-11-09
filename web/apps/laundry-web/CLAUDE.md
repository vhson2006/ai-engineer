@AGENTS.md

# laundry-web: Giặt sấy SFaster

One app of the web workspace: **read `web/CLAUDE.md` first** (non-negotiables, rules, skill,
commands; they apply here).

Specific to this app:
- **Public landing page, no API yet.** Facts and prices come from the shop's sign, price board
  and door posters, hard-coded in `src/content/shop.ts` (lines marked `CONFIRM` are partly
  unreadable in the photos); every visible word is in `src/i18n/messages/<lang>.json`.
- Never invent facts about the shop (turnaround times, delivery, discounts beyond "giặt 7 lần
  tặng 1"). Questions the shop hasn't answered say "call or message us on Zalo".
- The price estimator (`src/features/estimate/`, `src/lib/pricing.ts` + tests) mirrors the
  price board exactly; change both with the board. It only computes in the browser (no
  Server Action, nothing is sent).
- Not on the site on purpose: the shop is also a Vietlott point of sale (unrelated brand).
- Languages: Vietnamese (default) and English. Prices in VND (`src/lib/format.ts`).
- Look (from the sign): green `--brand`, yellow `--sun` (the `.sign-letters` lettering),
  red `--cherry` (small accents), dark green `--deep`. Fonts: Baloo 2 (`font-display`),
  Be Vietnam Pro (`font-sans`). Navigation: `@web/ui/section-nav` + `<SmoothScroll />`.
- Photos in `public/images/` are the owner's phone photos, resized.
- No booking/pickup form yet: by phone/Zalo. A form = `/new-form`, never a client-side submit.
- Not deployed yet: no Dockerfile, k8s manifests, Gateway route, sitemap or Open Graph image.

`npm run dev` (http://localhost:3400), `npm test`, `npm run typecheck`, `npm run lint`:
from this folder or from `web/` (`npm run dev:laundry`).
