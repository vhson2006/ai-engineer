# 0033. Article bodies may contain layout blocks from a fixed vocabulary

- **Status:** Accepted, partly implemented (2026-11-11: allow-list, site styles, laundry templates; not the admin editor)
- **Date:** 2026-11-11
- **Related:** 0031 (extended by this ADR), 0006, `libs/common/src/contracts/content/content.types.ts`
  (`ARTICLE_HTML_TAGS`, `ARTICLE_HTML_CLASSES`), `apps/content-service/src/articles/article-html.ts`,
  `web/packages/ui/src/article-layout.css`, `apps/content-service/scripts/seed-article-templates.ts`

## Context

The sites want ready-made article templates (magazine, step-by-step guide, timeline, photo essay,
FAQ…): columns, framed and full-width images, boxes, numbered steps. ADR 0031 allows text tags
only, so a template saved through the API loses every block. Writing the HTML straight into the
database would skip the sanitizer the sites rely on, so the allow-list itself has to grow.

## Decision

- The allow-list adds **`section`, `div`, `figure`, `figcaption`, `img`** to the text tags of 0031.
- **Classes**: only those of `ARTICLE_HTML_CLASSES`, per tag (`section.tpl-cols`, `figure.tpl-wide`,
  `p.tpl-lead`…); any other class is dropped. Still no `style`, no event handler, no other attribute.
- **Images**: `src`, `alt`, `width`, `height`, `loading` only, and `src` must be a file of the site
  itself (`/images/….svg|png|jpg|webp|avif`); any other image is removed whole. Uploaded photos come
  with media uploads (ADR 0006): their storage origin is added to this rule then, never any https.
- `h2`/`h3` may carry an `id` (table of contents links `#id`).
- The sites style the blocks with one shared stylesheet, `@web/ui/article-layout.css`, scoped to
  `.article-layout` and coloured through `--article-accent*` variables each site sets.
- Templates enter the database **through the service** (ArticlesService: sanitizer, slugs, reading
  time, outbox events), e.g. `seed-article-templates.ts`, never with raw SQL.

## Consequences

- Every site can show richer articles with one renderer (the sanitized HTML) and one stylesheet.
- A bigger allow-list is a bigger XSS surface: `article-html.spec.ts` covers the new tags (unknown
  classes, foreign images, `javascript:`/`data:` sources, attributes).
- **The admin editor (Tiptap StarterKit) doesn't know these blocks yet**: opening a template article
  in the admin site and saving it drops the layout. Until Tiptap nodes exist for the blocks, edit
  template articles' text with care or recreate them from the template.

## Alternatives considered

- **Write template HTML directly in the database**: skips the sanitizer the sites trust. Rejected.
- **Structured blocks (JSON) per layout**: a renderer per block in every site and a contract change
  per new block. Rejected for now (as in 0031).
- **Allow any class or inline style**: lets an editor (or a stolen session) restyle or hide content
  on a public site. Rejected.
