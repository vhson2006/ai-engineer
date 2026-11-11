# 0026. Business services: content, commerce, crm, marketing, notification, social

- **Status:** Accepted, partly implemented (content-service, 2026-11-10)
- **Date:** 2026-11-10
- **Related:** 0001, 0007, 0024 (one shared `EVENTS` stream), 0025 (`site_id` everywhere), 0027,
  `nest-microservice/CLAUDE.md`

## Context

For most of the planned sites, admins need the same things: write posts for the site and its
social pages, handle orders and bookings, follow customers and their feedback (including comments
and messages on the business's fanpage), and send email/SMS marketing. Customers follow their
orders and bookings. Today the API has deployment-service (a sample domain) and
notification-service (an event consumer).

Marketing email and SMS in Vietnam need the recipient's prior consent (Decree 91/2020 on spam,
Decree 13/2023 on personal data). Social platform tokens (Meta, Zalo) are powerful secrets, and
those APIs change often.

## Decision

Six services, split by business area, each with its own database and `site_id` on every row:

| Service | Owns |
|---|---|
| **content** | Articles, pages, publishing schedule, the products shown on the site |
| **commerce** | Orders and bookings (one service while they share customer, status and payment; booking moves out when it needs staff calendars and slots) |
| **crm** | Customer profiles per site, feedback, the fanpage inbox, tags and segments, **marketing consent** |
| **marketing** | Campaigns, audiences (segments from crm), send schedules |
| **notification** | The existing service, now the **only sender of email and SMS** (transactional and marketing): providers, rate limits, delivery status, unsubscribes |
| **social** | The **only holder of social platform tokens**: publishes posts to fanpages, receives comments and messages (webhooks, 0027) |

- Requests come from the web servers through KrakenD (0001, 0003). Services talk to each other
  through events on the shared `EVENTS` stream with outbox and inbox (0007, 0024), not by calling
  each other. Examples: `order created` → notification sends the confirmation, crm records the
  purchase; `fanpage comment received` (social) → crm stores it as feedback; `article published`
  (content) → social posts it; `campaign due` (marketing) → notification sends in batches;
  `unsubscribed` (notification) → crm updates consent.
- **Order of work:** (1) content, commerce, crm, and transactional email in notification;
  (2) social, once the Meta and Zalo apps are approved; (3) marketing, which may start as a module
  of crm and move out when campaigns grow.

## Consequences

- One place each for the risky parts: sending (notification), social tokens (social), consent
  (crm). Marketing can never send to someone crm doesn't list as consenting.
- Each new service follows the full-change rule (contract, route, KrakenD endpoint, web helper,
  tests) and the `new-service` skill; deployment-service stays as the reference until removed.
- Six databases to migrate and back up; data needed across services is copied through events
  (eventual consistency), e.g. commerce keeps the customer's name on the order.
- Starting the Meta / Zalo app review early avoids blocking step 2.

## Alternatives considered

- **One "business" service for everything**: fastest start, but sending, social tokens and
  customer data share one blast radius and one deployment. Could be revisited as a modular
  monolith if the team stays one person.
- **Separate order and booking services from the start**: two services for one customer flow
  before booking actually needs its own model.
- **Each service sends its own email/SMS**: consent, unsubscribes and provider limits in many
  places. Rejected.
- **crm and marketing as one service forever**: customer records would carry campaign churn; kept
  as the starting point only.
