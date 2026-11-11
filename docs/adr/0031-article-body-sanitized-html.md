# 0031. Article bodies are HTML, sanitized by content-service with an allow-list

- **Status:** Accepted, implemented (2026-11-11); extended by 0033 (layout blocks)
- **Date:** 2026-11-11
- **Related:** 0026, 0030, `libs/common/src/contracts/content/content.types.ts` (`ARTICLE_HTML_TAGS`),
  `apps/content-service/src/articles/article-html.ts`, `web/packages/ui/src/components/rich-text-editor.tsx`

## Context

Article bodies were structured blocks (`p`, `h2`, `quote`, `list`): safe, but too poor for the
editors the admins expect (bold, links, sub-headings, numbered lists). The admin site already has a
rich text editor (Tiptap) that produces HTML.

## Decision

- `body` of an article translation is a **string of HTML** (max 200 000 characters).
- **content-service sanitizes every body on write**, before the transaction, with `sanitize-html`
  and the allow-list `ARTICLE_HTML_TAGS`: `p br h2 h3 strong em u s code pre blockquote ul ol li hr a`.
  Only `a href` survives as an attribute, and only http(s), mailto, a path or `#anchor`; links get
  `rel="noopener noreferrer nofollow"`; an unsafe link keeps its text and loses its href. Everything else (script,
  style, iframe, img, event handlers, inline styles) is removed. A body with no text left: 400.
- What is stored is what is served: the sites render the body as HTML without re-checking it.
  Reading time counts the text of the sanitized HTML.
- Images in the body come later, with media uploads (ADR 0006): the allow-list grows then.
- Migration `article_body_html` converts the existing blocks to HTML (text escaped).

## Consequences

- One trusted place: any client of the API (admin site, a future import) gets the same cleaning.
- The sites trust content-service's output: a bug in the allow-list is an XSS on every site.
  Keep `article-html.spec.ts` covering every removal; change the list only with tests.
- `sanitize-html` ≥ 2.18 depends on ESM-only `htmlparser2`: production loads it through Node's
  `require(esm)` (Node ≥ 22.12), and Jest transforms those packages (`transformIgnorePatterns`).

## Alternatives considered

- **Keep blocks, richer types**: every new format = a contract change on both sides. Rejected.
- **Store the editor's JSON (ProseMirror)**: safe by construction, but every site then needs a
  renderer for it. Rejected for now.
- **Sanitize when rendering, in each site**: n places to get right. Rejected.
