# 0007. Events at-least-once: outbox + NATS JetStream + inbox, no BullMQ

- **Status:** Accepted, implemented (2026-11-06)
- **Date:** 2026-11-06
- **Related:** 0001, 0008, `libs/common/src/messaging/`, `nest-microservice/.claude/rules/microservice.md`
  ("Events"), `k8s/components/nats/`

## Context

Events and background work (notifications, transactional mail, later bulk mail) must not be lost.
Core NATS doesn't store messages (a consumer that is down or fails misses them), and a crash
between the database commit and the publish loses the event even with a durable broker. Once
delivery is retried, a message can also arrive twice, so consumers must not apply it twice. A
second Redis + BullMQ was proposed for mail.

## Decision

```
deployment-service                     JetStream                       notification-service
BEGIN                                  stream EVENTS (events.>, 7 d)   durable consumer "notification"
  UPDATE deployments                     │                             BEGIN
  INSERT outbox_messages(id, …)          │                               INSERT inbox_messages(consumer, message_id)
COMMIT                                   │                               …work on its own database…
OutboxRelay ─ publish(Nats-Msg-Id=id) ──▶│ ──────── deliver ──────────▶COMMIT → ack
             PubAck → published_at       │        error → nak(backoff)   duplicate → skip, ack
                                         └── DLQ stream (dlq.>, 30 d) ◀── permanent error / 10 attempts
```

- **Outbox (producer):** `addToOutbox(tx, subject, payload)` writes the message to
  `outbox_messages` in the SAME transaction as the data. `OutboxRelay` publishes unpublished rows
  oldest first (row locks `FOR UPDATE SKIP LOCKED`, safe with replicas), with `Nats-Msg-Id` = row
  id, marks them published after the PubAck, stops a batch at the first failure (order kept,
  `attempts` / `last_error` recorded), deletes published rows after 7 days.
- **JetStream:** stream `EVENTS` (`events.>`, 7 days, 10-minute duplicate window: a republished
  row is stored once) and `DLQ` (`dlq.>`, 30 days), created/updated by the apps at startup.
- **Inbox (consumer), idempotent-consumer variant:** `handleOnce(prisma, consumer, messageId, …)`
  inserts `(consumer, message_id)` into `inbox_messages` in the SAME transaction as the work; a
  duplicate does nothing. Only ids are stored: JetStream keeps, redelivers and dead-letters.
- **Consumer:** `JetStreamConsumer` (durable, explicit ack, `ack_wait` 30 s): success → ack;
  error → nak with backoff (1 s, 5 s, 30 s, 2 min, 10 min); `PermanentMessageError` (invalid
  payload, unknown subject) or the 10th failure → copied to `dlq.<consumer>.<subject>` with the
  reason, then term.
- **Names:** tables `outbox_messages` / `inbox_messages` (models `OutboxMessage` /
  `InboxMessage`); subjects `events.<resource>.<past-tense-verb>`; request/reply only on `rpc.*`.
- Each service keeps its tables in its own database: notification-service got its own database
  `notification` for its inbox.
- **No BullMQ, no second Redis.** Rate limits, scheduling and priorities for mail are covered without
  it (token bucket in the worker, `scheduled_at` + CronJob, separate subjects).

## Consequences

- Verified in dev: an event goes outbox → stream → consumer → inbox with one message id end to
  end; **NATS down during a write: the API still answers 201, and the event is delivered ~8 s
  after NATS is back**; the same `Nats-Msg-Id` published twice is stored once; an invalid event
  goes straight to the DLQ with the reason and leaves no inbox row.
- Delivery is at-least-once, effect once on the consumer's database. Side effects outside it (an
  email) can repeat in a crash window between the side effect and the commit.
- Order is kept per producer by the relay, but redeliveries can reorder events at the consumer:
  handlers that care compare versions (`revision`) instead of assuming order.
- One more table per producer and per consumer; NATS becomes stateful (prod: 3-node cluster,
  streams `num_replicas: 3`, `Retain` StorageClass).

## Alternatives considered

- **BullMQ + Redis**: a job queue, not a fan-out bus; can't replace the outbox (Redis is outside
  the Postgres transaction); a second broker to run; would share memory with sessions. Rejected.
- **Core NATS only, outbox as an event log pulled by consumers**: re-implements JetStream
  (cursors, retry, DLQ, retention, lag) per producer. Rejected.
- **JetStream without outbox**: loses events between commit and publish. Rejected.
- **Full transactional inbox (store payloads, ack at once, own worker)**: duplicates what JetStream
  already does (storage, redelivery, DLQ). Kept for when processing must be decoupled from receipt.
- **One shared outbox/inbox table**: different contents, access patterns and lifecycles. Rejected.
