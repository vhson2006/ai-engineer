# 0048. HSTS ramped up from urls.env; certificate expiry watched

- **Status:** Accepted, implemented (staging, prod overlay)
- **Date:** 2026-11-14
- **Related:** 0018 (local staging with HTTPS), 0023 (Grafana Alloy), 0047 (business sites),
  `k8s/components/https`, `k8s/overlays/<env>/urls.env`, `k8s/components/observability/config.alloy`

## Context

Every public route sent `Strict-Transport-Security: max-age=31536000` from day one, written in two
copies of the same patch (staging and prod). With HSTS, a browser refuses plain HTTP **and refuses
to let the visitor click through a certificate error**, for max-age seconds, and remembers it even
after the header is removed. An expired or wrong certificate (a failed renewal, a DNS change) would
then lock every visitor out for as long as it takes to fix, with no workaround on their side.
Nothing told us a renewal had failed.

## Decision

- **Keep HSTS** (it stops SSL-stripping on first visits over HTTP, and the admin site carries
  sessions), but **ramp it**: the value is the `HSTS` line of each environment's `urls.env`, starting
  at `max-age=300` (5 minutes) at go-live, then 86400 (1 day), 604800 (1 week), 31536000 (1 year),
  a few weeks at each step, only while the certificates are healthy.
- **No `includeSubDomains`** (every subdomain, including future client hosts, would have to serve
  HTTPS), **never `preload`** (built into browsers, months to undo).
- **One place**: `components/https` (listed last by staging and prod) moves the public routes to the
  https listener, adds the header with the `HSTS` value, and sets the wildcard host of the listener
  and the redirect. The overlays' own route patches are gone.
- **Certificate expiry is watched**: Alloy's blackbox exporter opens TLS to www, admin and auth every
  5 minutes and sends `probe_ssl_earliest_cert_expiry` and `probe_success` to Grafana Cloud. Two
  alert rules (k8s/README, Observability): less than 14 days left (cert-manager renews 30 days
  before, so a failed renewal is seen two weeks ahead), and no TLS for 15 minutes.

## Consequences

- Raising HSTS = one line in `urls.env` (prod), reviewed like any change.
- While max-age is short, a certificate incident blocks returning visitors for minutes, not a year.
- The alert rules live in Grafana Cloud, not in git: recreate them with a new stack.

## Alternatives considered

- **Remove HSTS**: the http→https redirect stays, but a first request over HTTP can be intercepted.
  Rejected: the ramp keeps the protection with a short risk window.
- **One year from the start**: rejected for the reasons above.
