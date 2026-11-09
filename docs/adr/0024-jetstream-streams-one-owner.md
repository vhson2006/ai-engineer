# 0024. JetStream streams: one owner (nats-setup), one shared EVENTS stream, a checked storage budget

- **Status:** Accepted, implemented (2026-11-09)
- **Date:** 2026-11-09
- **Related:** 0007 (replaces its "streams created/updated by the apps at startup"), 0008,
  `nest-microservice/apps/nats-setup/`, `nest-microservice/libs/common/src/messaging/streams.ts`,
  `k8s/components/apps/nats-setup-job.yaml`, `k8s/components/nats/`

## Context

ADR 0007 let every service run `ensureStreams()` at startup (create if missing, else update).
Starting the two services together on a fresh NATS crashed one of them with
`insufficient storage resources available` (10047): both saw "not found", both called `add`, and
NATS checks the storage reservation (600 MB reserved + 500 MB asked > 800 MB `max_file_store`)
BEFORE noticing that the stream already exists. With ~10 services more problems follow:

- **Config ping-pong**: during a rolling update, pods of the old and the new version each "fix"
  the stream to their own config.
- **Storage growth**: JetStream reserves every stream's `max_bytes` × replicas up front. A stream
  per service would grow the reservation with each service; nothing checked that the sum fits.

## Decision

1. **One owner.** Only `apps/nats-setup` creates or changes streams (`ensureStreams`, from
   `STREAM_CONFIGS` in `libs/common`). It runs before / alongside the services:
   - k8s: Job `nats-setup` (image `deployment-migrate`, another command), an Argo CD **Sync**
     hook (not PreSync: NATS doesn't exist yet at PreSync on a first install); staging waits for it.
   - dev: `npm run nats:setup`, run first by `npm run start:dev`.

   Services only call `waitForStreams` (read-only, up to 2 min, then crash and restart with a
   message naming nats-setup) and create their OWN durable consumer. `ensureStreams` stays safe if
   two runs overlap (a lost create race is detected and ignored) and writes only when a field
   differs.
2. **One shared `EVENTS` stream** (`events.>`) for every service, plus `DLQ`. A new consumer is a
   durable consumer on `EVENTS` (no storage reserved), not a new stream. A new stream only for a
   different retention or size need, with its own `max_bytes`.
3. **A checked storage budget.** Every file stream has `max_bytes > 0`;
   Σ `max_bytes` × `num_replicas` ≤ `max_file_store` (`k8s/components/nats/configmap.yaml`) ≤ 90 %
   of the NATS volume (`statefulset.yaml`). `streams.spec.ts` reads those manifests and fails
   otherwise; CI runs the API tests when `k8s/components/nats/` changes.

## Consequences

- Fresh clusters and parallel starts no longer crash; a normal restart writes nothing to NATS.
- A stream change ships with the `deployment-migrate` image and is applied once per rollout, by
  one process. Old pods keep running against the new config, so stream changes must stay
  compatible with the running version (like database migrations: expand, then contract).
- Dev: if NATS was recreated (`k8s:down`/`k8s:up`) and a service is started alone
  (`start:deployment`), it waits, then fails, until `npm run nats:setup` runs.
- Raising a stream's size means raising `max_file_store` and the PVC in the same change (prod R3:
  ×3 per stream). The test says so before a cluster does.

## Alternatives considered

- **Keep `ensureStreams` in every service, only fix the race**: fixes the crash, not the config
  ping-pong during rollouts nor the growing number of writers.
- **One stream per service**: more reserved storage per service, more configs to keep in budget,
  no benefit while retention is the same for all events.
- **NACK (JetStream controller, CRDs)**: declarative and Kubernetes-native, but one more operator to
  run and upgrade, and the stream configs would leave the code the tests check. Reconsider with a
  multi-team cluster.
- **Raise `max_file_store` / the PVC only**: hides the race until the next stream; still no check.
