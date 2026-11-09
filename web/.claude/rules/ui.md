---
paths:
  - 'packages/ui/**'
  - 'apps/*/src/app/**'
  - 'apps/*/src/components/**'
  - 'apps/*/src/features/**'
---

# UI: design system and app structure

Decision: ADR 0022. Look and feel: the tokens in `packages/ui/src/theme.css`.

## Use what exists
- Components come from `@web/ui/<name>` (one file per component in `packages/ui/src/components/`):
  button, badge, card, input (+ Textarea), label, checkbox, select, dialog, dropdown-menu,
  popover, tooltip, tabs, command (+ Combobox), calendar (+ DatePicker), form, data-table,
  pagination, toaster, skeleton (+ Separator), locale-switcher (+ LocaleToggle for menus),
  nav-links, chart (BarChart, AreaChart, ChartFrame), reveal, rich-text-editor, sortable-list,
  section-nav (SectionNav + MobileNav drawer, scrollspy) and smooth-scroll (`<SmoothScroll />` in
  the layout) for single-page sites. Live catalogue: admin
  `/design-system` (`apps/admin-web/src/features/design-system/showcase.tsx`): add new components there. `@web/ui` (index)
  re-exports the common ones plus Container, Section, Chip, Avatar, `cn`, `richText`.
- Icons: `lucide-react`. Toasts: `toast` from `@web/ui/toaster` (one `<Toaster />` in the layout).
- Never add another component library, CSS-in-JS, or a second icon set. A missing component is
  added to `packages/ui/src/components/` in the same style (Radix primitive + tokens + `cn`),
  then used by both apps.

## Styling
- Semantic tokens only (`bg-surface`, `text-muted`, `border-border`, `bg-brand`…); raw palette
  colors only for status (via `Badge` tones). Merge classes with `cn()` (tailwind-merge).
- Variants with `cva` inside the component, not ad-hoc class strings in pages.
- Every interactive element: visible focus (`focus-visible:outline-brand`), keyboard reachable,
  an accessible name (labels and `aria-label` from the dictionaries).

## App structure
- `src/app/[lang]/…/page.tsx`: thin. Reads params/session, fetches on the server, passes data
  and translated labels to feature components. Session-dependent parts inside `<Suspense>`.
- `src/features/<feature>/`: `schema.ts` (zod, shared), `actions.ts` (+ `actions.test.ts`),
  `*-table.tsx` / `*-form.tsx` / `*-dialog.tsx` / `toolbar.tsx` (client), `search-params.ts`
  (nuqs parsers + `createLoader` for the page).
- `src/components/`: the app shell only (header, footer, layout pieces).
- An app never imports another app; shared code goes to `packages/`.

## Charts, motion, rich text, drag and drop, exports
- Charts: `@web/ui/chart`, data computed on the server; functions (colors, number format) live in a
  small client wrapper in the feature (functions can't cross the server/client boundary). Give every
  chart an accessible `label` summary.
- Motion: `<Reveal>` for content below the fold only, never the hero/LCP. Never ship hidden
  content in the server HTML (no `initial={{ opacity: 0 }}` rendered on the server).
- Rich text: `@web/ui/rich-text-editor` outputs HTML = user input. Sanitize it on the server with an
  allow-list before storing or displaying it; never `dangerouslySetInnerHTML` raw user HTML.
- Drag and drop: `@web/ui/sortable-list` (keyboard + screen-reader announcements from the dictionaries).
- Excel export: a GET Route Handler outside `[lang]` (add it to `ROUTING.bypass`), `limitAction(LIMITS.export)`,
  session check, `toXlsx` + `xlsxResponse` from `@web/core/export`, a row cap; cells are never formulas.

## Data and state
- Server data: fetched in Server Components; mutations through Server Actions (forms.md), then
  `refresh()`. No Redux/saga, no client data cache unless a feature truly needs it.
- List state (search, filters, page, sort) in the URL with `nuqs` (`shallow: false` to re-render
  the server page, `debounce` for typing). Pagination: `@web/ui/pagination` (real links).
- Tables: `@web/ui/data-table` with columns from `dataTableColumnHelper<T>()` in a client module,
  memoized; labels passed as props.
