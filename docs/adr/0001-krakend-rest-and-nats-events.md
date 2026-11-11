# 0001. KrakenD gateway, REST for requests, NATS events between services

- **Status:** Accepted
- **Date:** 2026-11-05 (recorded 2026-11-06)
- **Related:** `nest-microservice/CLAUDE.md` non-negotiables 1 and 5, `.claude/rules/krakend.md`, `nest-microservice/.claude/rules/microservice.md`

## Context

The template started with a Nest `api-gateway` app that translated HTTP into NATS RPC for every
call. That gateway had to be coded, tested and deployed for each route, mixed routing with code,
and turned every request into a request/reply over the bus. We want services that own their
data, a single place that declares what can be called, and loose coupling for side effects.

## Decision

- **KrakenD** (declarative, no code) is the only HTTP entry to the services. Every route is
  declared in `k8s/base/krakend/config/krakend.tmpl` (Flexible Configuration, one template for
  every environment), with the same path as the service, `no-op` encoding, and explicit query
  strings and headers. No business logic in KrakenD.
- **REST** for requests that need an answer: the client (the web app's server) → KrakenD →
  the owning service.
- **NATS events** (past tense, `<RESOURCE>_EVENTS`) for facts other services may react to,
  published only after the database write succeeded.
- Each service owns its database (Prisma + Postgres); no service reads another's tables.

## Consequences

- A new route = a KrakenD endpoint + a service route + tests (`/new-endpoint` skill).
- KrakenD CE follows backend redirects: services never answer 3xx to send a client elsewhere
  (they return a URL as JSON, see 0006).
- Events are delivered at-least-once through an outbox, JetStream and an inbox (ADR 0007).

## Alternatives considered

- **Nest api-gateway translating HTTP → NATS RPC**: code per route, extra hop, mixes concerns. Removed.
- **Other API gateways (Kong, NGINX…)**: not evaluated in depth. KrakenD fits the needs:
  declarative config, JWT validation built in, stateless, no database.
- **Synchronous REST between services for side effects**: couples availability of services; events instead.
