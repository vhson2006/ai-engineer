# 0041. Articles written by AI: a brief to confirm, blocks not HTML, images, then translated

- **Status:** Accepted, implemented (dev)
- **Date:** 2026-11-13
- **Related:** 0031/0033 (article HTML, layout blocks), 0036 (ai-service, machine translation),
  0037 (AI images, monthly quota), 0039 (brand kit and its business facts),
  `libs/common/src/contracts/ai/article.events.ts`, `libs/common/src/contracts/content/article-drafts.ts`,
  `apps/content-service/src/article-drafts/`, `apps/ai-service/src/articles/`,
  `web/apps/admin-web/src/features/ai-articles/`

## Context

Site admins want articles for their blogs without writing them from scratch, in the sites' look
(the layout blocks of 0033), with pictures, and without the AI making up prices, hours or claims
about a real business.

## Decision

- **Three steps the admin sees** (`/sites/{site}/articles/ai/…`):
  1. **The idea:** a topic (a category), the idea in their words, the language, optional readers
     and search keyword, a length (≈500 / 900 / 1,400 words), 0–3 AI images.
  2. **The brief:** ai-service writes a brief (the prompt, starting "You are a professional content
     writer…" / "Bạn là người viết nội dung chuyên nghiệp…") and an outline (4–8 H2s); the admin
     edits both, then confirms. Business facts (website, phone, address, hours, prices from the
     brand kit; wine: never prices) and the site's rules are put in by the system.
  3. **The article:** ai-service writes it as **blocks** (lead, paragraphs, headings, lists, tip /
     note / warning boxes, key points, steps, cards, FAQ, quote, call to action, images), never HTML.
     content-service turns them into the editor's HTML (the shapes of `layoutBlockHtml`), sanitizes
     it like any body, and saves a **draft** article. Nothing is ever published by itself.
- **Images:** the cover first, then the images of the text, each a 16:9 AI image of the media
  library (0037, its monthly quota); the article is built once all are settled. No quota left or a
  failed image: the article gets fewer (a warning says so).
- **Written in one language, then translated (2026-11-13):** the article is written in the
  chosen language; once its draft is built, content-service asks for a machine translation (0036)
  into each of the site's other languages in the same transaction. They arrive as draft
  translations to review, with the usual warnings; an article too long for one job gets the
  warning `translation_too_large` and is translated from the editor. The admin can still
  re-translate after editing the source ("Translate from…", with overwrite). History: first
  automatic, then left to the admin for a while, then automatic again at the user's request: an
  AI article is expected in every language of the site, and publishing needs them all.
- **Checks:** numbers of the article found in none of the sources (facts, confirmed brief, idea)
  are listed as warnings to check; the model is told never to invent figures, claims or reviews.
- **Jobs** (`article_draft_jobs`): prompting → prompted → writing → illustrating → completed |
  failed; events `events.article-prompt.*`, `events.article-writing.*` through the outbox; the
  answers in AiResultsConsumer (and its image answers). Quota: `CONTENT_AI_ARTICLES_PER_MONTH`
  (default 30) confirmed briefs per site and calendar month.

## Consequences

- An article costs a few cents of text (Gemini Flash today) plus its images. The admin reviews
  and publishes; AI-written text still needs a human check (facts, tone, the site's law).
- The block vocabulary lives in two places (the editor in `@web/ui`, the builder in
  content-service): a new block type changes both.

## Alternatives considered

- **HTML written by the model:** fragile (unknown tags and classes dropped by the sanitizer,
  broken blocks), and harder to place images in. Rejected for blocks.
- **One step (idea → article):** cheaper, but the admin can't steer the article before paying for
  it; the outline step costs little.
- **Writing every language with AI:** twice the cost and two versions that drift; translation of
  one source keeps them aligned.
- **Leaving every translation to the admin:** used for a while; one more step for each article,
  and publishing needs every language anyway. Editing the source after the automatic translation
  means translating again (overwrite), which the editor offers.
