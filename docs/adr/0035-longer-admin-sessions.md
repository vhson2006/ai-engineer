# 0035. Longer admin sessions for now: 8 h without activity, 7 days at most

- **Status:** Accepted, implemented (2026-11-12), interim: the owner will revisit it
- **Date:** 2026-11-12
- **Related:** amends 0019 (lock 3, "short sessions") and 0030; 0010 (sessions), 0025 (customer realms)

## Context

The admin site signed admins out after 15 minutes without a request to the server (client
`admin-web`: 15 min idle, 8 h max; realm SSO: 30 min / 10 h). The idle time counts requests, not
activity: writing an article for 20 minutes without saving ends the session, and the save fails.
Site admins (ADR 0030) write slowly and are interrupted; the owner finds the sessions too short.

## Decision

- Realm `nest-microservice`: SSO session **8 h idle, 7 days max** (Keycloak caps a client's session
  at the realm's).
- Client `admin-web`: **8 h idle, 7 days max** (superadmins and site admins alike).
- Client `web` (portfolio-web) keeps its lifetimes, now pinned on the client: 30 min idle, 10 h max.
- Unchanged: access tokens 5 min (refreshed by the server), refresh-token rotation, OTP for
  superadmins, the role re-check at sign-in and on every refresh, tokens only on the server.
- The app session (Redis) already lives exactly as long as the refresh token: no code change.
- Running Keycloaks are updated with the admin API (`--import-realm` skips an existing realm).

## Consequences

- No more sign-outs while writing; an admin stays signed in for a working day without activity.
- Weaker than 0019's lock 3: a forgotten session on a shared computer, or a stolen session cookie,
  stays usable up to 8 h idle / 7 days, and site admins have no OTP. Sign out on shared computers.
- Planned instead (proposed 2026-11-12, not built): short idle kept but extended while the admin is
  actively working (activity keep-alive), a warning before expiry, and local draft autosave; then
  this ADR is superseded. Customers (ADR 0025 realms) would get "remember me" + re-authentication
  for sensitive actions.

## Alternatives considered

- **Activity keep-alive with the 15 min idle kept**: the better long-term fix; postponed by the owner.
- **Only raise `admin-web` to 30 min**: still too short for the owner.
