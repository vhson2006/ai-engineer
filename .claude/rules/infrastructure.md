---
paths:
  - 'k8s/**'
  - 'nest-microservice/docker-compose.yml'
  - 'package.json'
---

# Infrastructure rules (`k8s/`, local stack)

`k8s/` is the infrastructure of the WHOLE system. Layout and commands: `k8s/README.md`. KrakenD:
`krakend.md`.

## Exposure (what the Internet can reach)
- **Public = `www.*`, `admin.*`, `auth.*` (app realm + `/resources` only) and object storage via
  presigned URLs.** Nothing else gets a Gateway route: no `api.<domain>`, no LoadBalancer/NodePort
  for KrakenD or a service, no KrakenD CORS (ADR 0003). Prod NetworkPolicy `krakend-from-web`.
- **Admin site** (ADR 0019): public but locked by the `admin-web` browser flow (non-admins refused,
  then OTP required), the role re-checked by the app, 15 min idle / 8 h sessions, `noindex`.
  Never relax one lock because another exists.
- **Keycloak admin and realm `master` are never published** (ADR 0004): port-forward
  `svc/keycloak 8180:8080`; realm `master`'s Frontend URL is `http://localhost:8180`. Prod: named
  admins with OTP, bootstrap admin removed.
- **Brute-force detection** on both realms: 5 failures → lockout growing 1 min, max 15 min, reset
  after 12 h, never permanent. Keycloak sees the edge's IP: configure forwarded headers in prod
  before relying on per-IP data.
- **Telemetry leaves only through Grafana Alloy** (ADR 0023): one per namespace, read-only Role,
  write-only token, UI by port-forward; new metrics/labels pass the allow-list in `config.alloy`
  (~10k series). `/metrics` is never published.
- No admin web UIs for NATS/Redis in the cluster: CLIs (`nats-box`, `redis-cli`) or port-forward.
- Client IP: the edge sets `X-Real-IP`; in prod enable PROXY protocol on the LB + real-IP in the edge.
- Default-deny NetworkPolicies (`components/network-policies`): a new in-cluster client gets its
  own rule, and its own ACL user where the store has ACLs.

## Credentials (dev only, never reuse)
- Keycloak: admin `admin`/`admin`, test users password `Dev-Staging-2026!`, client secret
  `web-dev-secret`, `dev-cli` (password grant; absent from the prod realm).
- Redis: ACL users only (`components/local-data/redis/users.acl`, default user off), one per app,
  limited to its prefix and GET/SET/DEL/GETDEL/INCR/EXPIRE/PING. Never the `admin` user in an app.
- NATS has no credentials in dev and `k8s/`; elsewhere enable auth through env.
- Prod secrets: secret manager → External Secrets. Never commit a secret.

## Bootstrap state outside git (redo after a fresh cluster or a recreated namespace)
- Keycloak's configuration is NOT bootstrap state any more (ADR 0043): realms `nest-microservice` and
  `master` come from the same files in every environment (`base/keycloak/`, components
  `keycloak-local`, and each site's `k8s/sites/<id>/keycloak`), with each environment's values (`public-urls`,
  Secret `keycloak-clients`), applied by the Job `keycloak-config` on every k8s:up / staging:up /
  Argo CD sync. Change the files, never the console or a kcadm script; never one environment's copy
  of a realm; no people in `realm.json`. prod still needs, once: named admins in `master`, then the
  bootstrap admin removed.
- Content is not bootstrap state either (ADR 0044): staging and prod get the sites' snapshot from
  the Job `content-import` (each site's version once, table `content_imports`); dev:
  `npm run seed:content -- --all`. Never content created by hand to make an environment usable.
- `npm run k8s:down` deletes the namespace and its PVCs (all data).

## Changes
- **A public address (host, URL, issuer, storage origin) is written once per environment**, in
  `overlays/<env>/urls.env` (ConfigMap `public-urls`): Keycloak, KrakenD and the Job read it,
  `components/public-urls` (and `components/https`: the TLS listener, https-only routes, HSTS)
  writes it into the Gateway, the routes and the apps' settings. Never a host name or a public URL
  in a manifest, a patch or an env file. HSTS is the `HSTS` line of `urls.env`, raised step by step
  (ADR 0048): never includeSubDomains, never preload.
- **A business site in Kubernetes = `k8s/sites/<id>`** from the shared template (ADR 0047), listed by
  the overlay: never a hand-written Deployment for a site. Rules select sites by `role: business-site`.
- Stateful pieces: StatefulSets with a PVC; prod StorageClass `reclaimPolicy: Retain` + backups.
- Before `npm run k8s:up`: `npm run k8s:render` (and `:prod`), `npm run krakend:check`,
  `kubectl diff -k k8s/overlays/dev`. Never apply the prod overlay by hand (Argo CD, ADR 0009).
- Scripts run from the repo root, `.sh` files through `node k8s/scripts/sh.mjs <script>` (on
  Windows `bash` is often WSL, without kubectl). `port-forward.sh` / `.ps1` keep their watchdog.
- Local staging (ADR 0018) mirrors prod: after a prod manifest change, check `npm run staging:up`.
  A setting added to one environment's env files goes to the other too, or into `ONLY` of
  `k8s/scripts/env-parity.mjs` with its reason (CI: `npm run k8s:check`).
  Shared pieces live in `components/`; staging gets only tiny patches.
