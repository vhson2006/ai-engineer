# 0008. NATS clients reconnect forever

- **Status:** Accepted
- **Date:** 2026-11-06
- **Related:** 0007, `nest-microservice/libs/common/src/nats/nats-options.ts`, `nest-microservice/.claude/rules/microservice.md`

## Context

The nats.js defaults give up after 10 reconnect attempts 2 s apart (~20 s) and close the
connection for good, while the process keeps running and `/health` stays green: a consumer
silently stops receiving events, a publisher fails every emit. A NATS restart (rollout, node
replacement, JetStream recovering streams) or a dev port-forward restart takes longer than that.
It happened in dev after NATS moved to a StatefulSet.

## Decision

Every NATS connection uses `natsConnectionOptions(url, name)` from `@app/common`:
`maxReconnectAttempts: -1`, `reconnectTimeWait: 2000` with jitter, `waitOnFirstConnect: true`
(start even if NATS isn't up yet), and a connection name visible in `/connz`.

## Consequences

- Verified: after a 45 s outage both services reconnected within ~4 s and events flowed again.
- A service can run while NATS is down (publishes fail and are logged; with 0007 they wait in
  the outbox instead).
- Follow-up: report the NATS connection state in `/health` (readiness) so an orchestrator sees it.

## Alternatives considered

- **Crash on disconnect and let Kubernetes restart the pod**: restart storms during a NATS
  rollout, lost in-flight work. Rejected.
- **Keep the defaults**: the silent-deaf-service failure above. Rejected.
