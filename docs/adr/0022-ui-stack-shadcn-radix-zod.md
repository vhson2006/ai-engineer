# 0022. UI stack of the web apps: shadcn/ui-style components on Radix, react-hook-form + zod, TanStack Table, URL state

- **Status:** Accepted
- **Date:** 2026-11-07
- **Related:** 0013, 0019, 0020, `web/.claude/rules/ui.md`, `web/.claude/rules/forms.md`,
  `web/packages/ui/`, `web/packages/core/src/validation/`

## Context

The admin site needs real application UI (dialogs, menus, selects, date pickers, data tables,
validated forms, toasts), and both apps must stay consistent. The previous admin project
(admin-tcgplayer, Create React App) used Chakra UI v2 + emotion, Redux Toolkit + redux-saga,
react-router, react-intl, react-helmet, CKEditor 5, apexcharts, xlsx, crypto-js (tokens and
permissions in localStorage). This system is Next.js 16 App Router with Server Components,
Server Actions, a BFF (no tokens in the browser) and Tailwind v4 design tokens.

## Decision

- **Components: shadcn/ui style in `@web/ui`**: Radix primitives (`radix-ui`) + Tailwind classes
  using our tokens, `class-variance-authority` for variants, `tailwind-merge` in `cn()`. The code
  lives in the repo (one component per file, imported as `@web/ui/<name>`), not in a dependency.
  Icons: `lucide-react`. Toasts: `sonner`. Searchable selects: `cmdk` (Combobox). Calendar and
  date picker: `@daypicker/react` (+ `date-fns` locales).
- **Forms: react-hook-form + zod**. One schema per form, shared by the browser and the Server
  Action (`parseInput()` in `@web/core/validation`); messages are dictionary keys translated by
  `@web/ui/form`. Server field errors are shown with `applyActionErrors()`.
- **Tables: TanStack Table v9** (`@web/ui/data-table`), rendering server data; paging and search
  in the URL.
- **State: Server Components + Server Actions for data; `nuqs` for URL state** (filters,
  search, page). No Redux / saga / client data cache until a feature needs one.
- **App structure: `src/features/<area>/<feature>/`** (schema, actions + test, components) with
  thin routes in `src/app/[lang]/…`.
- Second wave (installed, each with a real use):
  - `recharts` → `@web/ui/chart` (BarChart, AreaChart, ChartFrame), admin overview charts;
  - `motion` → `@web/ui/reveal` (scroll reveal), portfolio sections below the fold. Progressive
    enhancement: the server HTML is visible; only elements still below the viewport after hydration
    are hidden and revealed; nothing for `prefers-reduced-motion`;
  - Tiptap → `@web/ui/rich-text-editor` (HTML out; sanitize on the server before displaying);
  - `@dnd-kit` → `@web/ui/sortable-list` (mouse, touch, keyboard, announcements);
  - `write-excel-file` (not `exceljs`: unmaintained since 2024, 9 dependencies) →
    `@web/core/export` (`toXlsx`, `xlsxResponse`), admin `GET /exports/deployments`.
  The admin page `/design-system` shows every component.

## Consequences

- Components are ours to change; upgrades of Radix are a dependency bump, the styling stays.
- Interactive components are Client Components (`'use client'`); pages stay Server Components and
  pass translated strings as props.
- CSP: Radix positioning and sonner use inline styles: `style-src 'unsafe-inline'` (already the
  case, ADR 0016) must stay.
- Dropped from the old stack: Chakra/emotion (runtime CSS-in-JS, all-client), Redux/saga (data
  lives on the server), react-router, react-intl (ADR 0020), react-helmet (Metadata API),
  fontsource (`next/font`), crypto-js and tokens in localStorage (ADR 0010).

## Alternatives considered

- **Chakra UI v3**: still runtime CSS-in-JS, a second styling system next to Tailwind. Rejected.
- **Mantine / MUI**: same issue, heavier. Rejected.
- **CKEditor 5**: GPL or a commercial license since v44. Tiptap (MIT) when rich text is needed.
- **apexcharts**: imperative wrapper, larger; recharts composes as React components.
- **xlsx 0.18 from npm**: unmaintained there, known vulnerabilities. **exceljs**: no release since
  2024, heavy dependency tree; we only write files: write-excel-file.
- **motion's `whileInView` with `initial` in the server HTML**: hides content without JavaScript
  and breaks hydration for reduced-motion users (server and client markup differ). Rejected for
  the effect-based Reveal.
- **TanStack Query / Redux for server data**: duplicates what Server Components already do.
