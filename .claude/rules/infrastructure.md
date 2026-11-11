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
- Keycloak: admin `admin`/`admin`, test users password `password`, client secret
  `web-dev-secret`, `dev-cli` (password grant; absent from the prod realm).
- Redis: ACL users only (`components/local-data/redis/users.acl`, default user off), one per app,
  limited to its prefix and GET/SET/DEL/GETDEL/INCR/EXPIRE/PING. Never the `admin` user in an app.
- NATS has no credentials in dev and `k8s/`; elsewhere enable auth through env.
- Prod secrets: secret manager → External Secrets. Never commit a secret.

## Bootstrap state outside git (redo after a fresh cluster or a recreated namespace)
- `npm run keycloak:admin-url` and `npm run keycloak:admin-otp` (stored in Keycloak's database).
- The realm JSON is imported only when the realm doesn't exist: on a running Keycloak, apply realm
  changes (clients, roles, mappers, groups, brute-force) with kcadm as well.
- `npm run k8s:down` deletes the namespace and its PVCs (all data).

## Changes
- Stateful pieces: StatefulSets with a PVC; prod StorageClass `reclaimPolicy: Retain` + backups.
- Before `npm run k8s:up`: `npm run k8s:render` (and `:prod`), `npm run krakend:check`,
  `kubectl diff -k k8s/overlays/dev`. Never apply the prod overlay by hand (Argo CD, ADR 0009).
- Scripts run from the repo root, `.sh` files through `node k8s/scripts/sh.mjs <script>` (on
  Windows `bash` is often WSL, without kubectl). `port-forward.sh` / `.ps1` keep their watchdog.
- Local staging (ADR 0018) mirrors prod: after a prod manifest change, check `npm run staging:up`.
  Shared pieces live in `components/`; staging gets only tiny patches.
