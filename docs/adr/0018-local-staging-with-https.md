# 0018. Local staging: the production setup in the local cluster, with HTTPS

- **Status:** Accepted
- **Date:** 2026-11-06
- **Related:** 0003, 0004, 0009, 0015, `k8s/overlays/staging`, `k8s/platform/local`,
  `k8s/scripts/staging.sh`

## Context

Dev runs the apps on the host (`npm run start:dev`, `next dev`) against infrastructure in the
local cluster, over plain HTTP. What only production exercises was untested until a real
deployment: the production images and their read-only, non-root containers, Keycloak in
production mode, TLS at the Gateway and HSTS, `Secure` / `__Host-` cookies, the migration Job,
NetworkPolicies (default deny), in-cluster service discovery, the outbox/JetStream flow between
pods. Production environments are on hold (ADR 0009), so a remote staging isn't an option yet.

## Decision

- A **local staging** overlay (`k8s/overlays/staging`, namespace `nest-staging`) deploys the
  whole system in Docker Desktop's cluster like prod: `components/apps` with the production
  images (`npm run staging:build`; Docker Desktop's cluster uses the local image store, nothing is
  pushed), `components/network-policies` (shared with prod), Keycloak `start`, KrakenD private,
  a migration Job, plus `components/local-data` (Postgres, Redis, SeaweedFS) instead of managed
  services, and plain dev credentials instead of External Secrets.
- **HTTPS like prod**: cert-manager (same version as prod) issues the Gateway's wildcard
  certificate from the Gateway annotation, from a **local CA** (`k8s/platform/local`) instead of
  Let's Encrypt. The CA is limited by **name constraints to `localtest.me`**: trusted once in
  Windows (`npm run staging:trust-ca`), it can't be abused for any other domain.
- URLs without a port, like prod: `https://{www,auth,s3}.staging.localtest.me` (port 443 is
  free on this machine; plain HTTP on 8001 only redirects).
- In-cluster name resolution of the public hosts (what public DNS does in prod): a CoreDNS rule
  maps `*.staging.localtest.me` to the staging Gateway; the apps trust the local CA through
  `NODE_EXTRA_CA_CERTS` (ConfigMap `local-ca`, certificate only).
- `npm run staging:up` scales the dev namespace to 0 to free memory (data kept);
  `npm run k8s:up` brings dev back. `staging:down` deletes the staging namespace.
- `staging.sh` refuses to run unless the kubectl context is `docker-desktop`.

## Consequences

- Production manifests are unchanged: moving the NetworkPolicies into a shared component left
  the prod render byte-for-byte identical (checked).
- Local cluster-level additions (cert-manager, the local CA, the CoreDNS rule) stay after
  `staging:down`; they don't affect dev.
- Staging and dev don't run at the same time by default (8 GB for Docker Desktop).
- Differences from prod that remain: single replicas, in-cluster data stores (no TLS to the
  database), a private CA, the dev realm's test users and `dev-cli` client.

## Alternatives considered

- **mkcert**: needs another tool and its CA has no name constraints. Rejected for the
  cert-manager CA, which also exercises prod's certificate mechanism.
- **Self-signed certificate, accept the browser warning**: doesn't test HSTS / Secure cookies the
  way a browser treats a trusted site. Rejected.
- **A remote staging cluster**: costs money and depends on the on-hold environments. Later.
