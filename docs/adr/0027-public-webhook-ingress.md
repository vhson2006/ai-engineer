# 0027. A public, signature-checked ingress for platform webhooks

- **Status:** Accepted, not implemented
- **Date:** 2026-11-10
- **Related:** 0003 (adds one narrow exception to the private API), 0007, 0017, 0026,
  `k8s/base/gateway/routes.yaml`, `.claude/rules/infrastructure.md`

## Context

The social service (0026) must receive fanpage comments and messages. Meta (Facebook, Instagram)
and Zalo deliver them by calling an HTTPS URL of ours (webhooks), from the Internet, without a
user token. ADR 0003 keeps the whole API private: only the web servers call KrakenD. Payment
providers will need the same kind of callback later.

Meta signs each delivery (`X-Hub-Signature-256`, HMAC-SHA256 of the raw body with the app
secret) and verifies the URL once with a `GET` challenge (`hub.verify_token`). Zalo signs its
events (`X-ZEvent-Signature`, SHA-256 over the app id, payload, timestamp and the OA secret key).

## Decision

- **One extra public host, `hooks.<domain>`**, routed by the edge Gateway to a **webhook receiver**
  only: never to KrakenD or to the services' REST APIs. Paths per provider (`/meta`, `/zalo`),
  everything else 404.
- The receiver is a separate Deployment (same image as social, its own entrypoint) that does as
  little as possible:
  1. verify the provider's signature on the **raw body** with a constant-time compare; reject
     unsigned or mis-signed requests with 401 and log them;
  2. answer Meta's verification challenge;
  3. de-duplicate by the provider's event id, write the event to its outbox, publish to `EVENTS`
     (0007), and answer 200 fast; the social service does the real work from the event.
- It holds only the app secrets needed to verify signatures, not page access tokens, and has no
  access to other services' databases. NetworkPolicy: ingress from the Gateway only, egress to
  its database and NATS only.
- Edge limits (0017): body size limit, per-IP rate limit, request timeout on `hooks.*`.
- A new provider (payments, ...) = a new path in the same receiver, with its own signature check,
  in the same change.

## Consequences

- The private API of 0003 stays private; the public surface grows by one host whose code is
  small and only accepts signed requests.
- Provider retries and duplicates are expected: the event id de-duplication and the inbox (0007)
  make processing idempotent.
- Dev needs a public URL to test webhooks (a tunnel such as cloudflared or ngrok) plus signed
  sample payloads in tests.
- App secrets rotate per provider; a rotation needs both secrets accepted for a short window.

## Alternatives considered

- **Route webhooks through KrakenD without auth**: opens KrakenD to the Internet and mixes a
  public path into the private gateway. Rejected.
- **Expose the social service directly**: its page tokens and full API behind a public route.
  Rejected.
- **Poll the platforms' APIs instead of webhooks**: slower, rate-limited, and not offered for every
  event (e.g. Messenger messages). Rejected as default.
- **A hosted webhook relay (third-party SaaS)**: one more vendor seeing customer messages.
  Rejected for now.
