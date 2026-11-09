---
paths:
  - 'k8s/**'
  - 'nest-microservice/docker-compose.yml'
  - 'package.json'
---

# Infrastructure rules (`k8s/`, local stack)

`k8s/` describes the infrastructure of the WHOLE system (both packages): edge Gateway, KrakenD,
Keycloak, NATS, data stores, the apps. Layout and commands: `k8s/README.md`. Decisions:
`docs/adr/` (0003 private API, 0004 Keycloak admin, 0007 JetStream, 0009 delivery, 0019 admin site,
0023 observability, 0024 JetStream streams: one owner, storage budget).

## Exposure (what the Internet can reach)
- **Public surface = `www.*` (portfolio-web) + `admin.*` (admin-web) + `auth.*` (Keycloak app realm
  and `/resources` only) + object storage via presigned URLs.** Nothing else gets a Gateway route.
- **The admin site is public but locked** (ADR 0019): Keycloak client `admin-web` with its own
  browser flow (non-admins refused after the password, then OTP REQUIRED: `npm run keycloak:admin-otp`,
  once per fresh cluster, also run by `staging:up`), client role `admin-web:admin` re-checked by the
  app (`KEYCLOAK_REQUIRED_ROLE`), sessions 15 min idle / 8 h max, `X-Robots-Tag: noindex`. Never
  relax one lock because another exists.
- **The API is private.** KrakenD has no Gateway route and no CORS; only the web apps' servers (portfolio-web, admin-web)
  call it (prod NetworkPolicy `krakend-from-web`). Service ports (3001, 3002...) are never
  exposed outside the host/cluster. Never add an `api.<domain>` route, a LoadBalancer/NodePort for
  KrakenD or a service, or KrakenD CORS.
- **Keycloak admin console and realm `master` are never published** (`/admin`, `/realms/master`
  answer 404 on the Gateway). Admins use `kubectl port-forward svc/keycloak 8180:8080` →
  http://localhost:8180/admin; realm `master` has Frontend URL `http://localhost:8180`
  (`npm run keycloak:admin-url`, once per fresh cluster; it also enables brute-force detection on
  `master`). Prod: named admins with OTP, bootstrap admin removed.
- **Brute-force detection** on both realms: 5 failures → temporary lockout growing by 1 min, up to
  15 min, reset after 12 h, never permanent (an attacker must not be able to lock users out for
  good). App realm: in the realm JSON (imported only when the realm is created: on a running
  Keycloak change it with kcadm too). Keycloak sees the edge's IP, not the client's: in prod, configure
  forwarded headers before relying on per-IP data.
- **Telemetry leaves the cluster only through Grafana Alloy** (`components/observability`, ADR 0023):
  one per namespace, a namespaced Role (pods, pods/log: read), a write-only Grafana Cloud token,
  its UI port-forward only (no Service port, no route). Metrics pass an allow-list in
  `config.alloy` (Free tier ~10k series): a new metric or label is checked for cardinality there.
  Never put ids, users or user input in labels. `/metrics` is never published (Gateway, KrakenD).
- No admin web UIs for NATS/Redis in the cluster (no login, full rights). Inspect with the CLIs
  (`nats-box` temporary pod, `redis-cli`) or a desktop client through `kubectl port-forward`.
- Client IP: the edge sets `X-Real-IP` (the web app's rate limits use it). In prod, enable PROXY
  protocol on the cloud load balancer and real-IP handling in the edge, or every client shares the
  LB's IP.
- Prod is default-deny (`overlays/prod/networkpolicies.yaml`): a new in-cluster client gets its
  own NetworkPolicy rule, and its own ACL user where the store has ACLs.

## Credentials (dev only, never reuse)
- Keycloak: admin `admin`/`admin`, test users with password `password`, client secret
  `web-dev-secret`, a `dev-cli` client with the password grant (absent from the prod realm).
- Redis requires ACL users (`k8s/components/local-data/redis/users.acl`, default user disabled).
  Each client gets its own user restricted to its key prefix and the commands it needs (`web` →
  `~web:*`, `admin-web` → `~admin-web:*` with `REDIS_KEY_PREFIX=admin-web:`;
  GET/SET/DEL/GETDEL/INCR/EXPIRE/PING). Never give an app the `admin` user.
- NATS runs **without credentials** in dev and `k8s/`. Outside local dev, enable NATS auth and
  pass it through env (`natsConnectionOptions` in nest-microservice).
- Prod secrets come from the secret manager through External Secrets; never commit a secret.

## Changes
- Stateful pieces are StatefulSets with a PVC (`volumeClaimTemplates`); in prod use a StorageClass
  with `reclaimPolicy: Retain` and keep backups (a PVC is not a backup).
- After a change: `npm run k8s:render` (and `:prod`), `npm run krakend:check` for KrakenD, then
  `kubectl diff -k k8s/overlays/dev` before `npm run k8s:up`. Never `kubectl apply` the prod
  overlay by hand (Argo CD, ADR 0009).
- Run the scripts from the repo root (`package.json` here); the local apps reach the cluster
  through `npm run k8s:forward`.
- `port-forward.sh` / `.ps1` reconnect when the pods behind a Service change (watchdog); keep that
  logic in both scripts.
- **Local staging** (`overlays/staging`, ADR 0018) mirrors prod with local substitutes; when a prod
  manifest changes, check `npm run staging:up` still works. Shared pieces live in `components/`
  (apps, network-policies); never copy prod files into staging except tiny patches.
- npm scripts call `.sh` files through `node k8s/scripts/sh.mjs <script>` (Git Bash on Windows),
  never `bash <script>` directly: on Windows that `bash` is often WSL, without kubectl.
