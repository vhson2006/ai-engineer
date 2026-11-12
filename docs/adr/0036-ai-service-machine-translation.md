# 0036. ai-service: the one caller of AI providers; machine translation of articles first

- **Status:** Accepted, implemented (2026-11-12: ai-service with the `fake` and `gemini` providers,
  content-service translation jobs, admin "Translate from VI"; verified with a real Gemini key).
  Images: 0037
- **Date:** 2026-11-12
- **Related:** amends 0026 (a seventh service); 0007/0024 (outbox, inbox, EVENTS), 0031/0033 (article
  HTML), `libs/common/src/contracts/ai/translation.events.ts`, `apps/ai-service/`,
  `apps/content-service/src/translations/`, `web/apps/admin-web/src/features/articles/translate-panel.tsx`

## Context

Authors write an article in the site's main language and want the other languages produced for
them, with the same layout. Later uses of AI are planned too: video scripts, voices, captions for
social posts. Each would otherwise call a provider from its own service, spreading API keys, costs
and prompts. The owner has not paid for the Claude API yet and starts with Google's Gemini API,
whose free tier covers text (and speech), not images or video.

## Decision

- **A service `ai-service`** is the ONLY one that talks to AI providers and holds their keys. It owns
  no business data: its database `ai` holds its inbox, its outbox and a usage ledger (`ai_usage`:
  site, task, provider, model, tokens, duration; never prompts or answers). No REST route, nothing
  through KrakenD: requests and results are events.
- **Providers behind one interface** (`TranslationProvider`), chosen by `AI_TRANSLATION_PROVIDER`:
  `fake` (tests, offline dev: prefixes the text with `[EN]`), `gemini` (`@google/genai`, Interactions
  API, structured JSON output, `store: false`, default model `gemini-3.8-flash`). Claude later = one
  class, one env value. The official SDK is used instead of `HttpClient`: the call is asynchronous
  (not on a KrakenD request), long, and needs the SDK's structured output.
- **Translation flow** (at least once, effects once):
  `POST …/articles/{id}/translations/{locale}/auto` → 202 + Location of a job →
  `events.translation.requested` (content-service outbox) → ai-service calls the provider OUTSIDE any
  transaction → `events.translation.completed` | `failed` (ai-service outbox, with the inbox id) →
  content-service consumer (inbox) writes the translation.
- **Segments, not documents**: content-service sends text segments (each inline-only block with its
  inline tags, alt texts, title/excerpt/cover alt/SEO) and keeps the structure; the answer is put back
  into a snapshot of the source, then sanitized like any body (0031/0033). Blocks, classes, images and
  links never depend on the model. Segments whose numbers or inline tags changed are listed as
  warnings for the reviewer. The site's name is a glossary entry (never translated).
- **Only drafts**: the translation is saved as a DRAFT language; a live article must be unpublished
  first (409 `not_a_draft`); an existing language is replaced only with `overwrite` (409
  `translation_exists`). A person reviews before publishing ("machine translation" in the admin).
- **Failures always answer**: permanent errors (4xx, refusal, wrong segment count) → `failed` at once;
  transient ones (429, 5xx, network) → JetStream retries (ack wait 3 min, 5 deliveries, backoff), and the
  last one answers `failed` (`provider_unavailable`), so a job never stays pending.

## Consequences

- One place for keys, budgets per site, prompt versions and provider changes; content-service and the
  admin don't change when Claude replaces Gemini.
- **Gemini free tier**: Google may use the content to improve its products (only public articles are
  sent), with rate limits; images, video and music are paid even with Gemini.
- Machine translations need review; warnings point at numbers and formatting, not meaning.
- New infrastructure: database `ai`, Deployment `ai-service` (2 replicas in prod, PDB, NATS policy),
  secrets `ai-db` and `ai-providers` (`GEMINI_API_KEY`), image `ai-service`.

## Alternatives considered

- **A translation module inside content-service**: quicker, but every later AI use (video, captions)
  would hold its own key and budget. Rejected (the owner chose the shared service).
- **Translate the whole HTML in one prompt**: simpler, but the model can drop or change blocks and
  classes. Rejected for segments.
- **Call the provider from admin-web**: business logic and a key on the web server, Server Action
  limits. Rejected.
- **Machine translation APIs (Azure Translator, DeepL)**: free tiers exist, but no LLM tasks later
  (scripts, captions). Possible as another provider behind the same interface.
