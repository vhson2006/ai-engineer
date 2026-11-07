# 0023. Observability: Grafana Cloud, fed by Grafana Alloy in the cluster

- **Status:** Accepted, partly implemented (services + Alloy done; KrakenD and web apps to do)
- **Date:** 2026-11-07
- **Related:** 0007 (outbox / consumers), 0009 (delivery), 0018 (local staging), `libs/common/src/observability/` and `libs/common/src/logging/` (in `nest-microservice/`), `nest-microservice/.claude/rules/microservice.md`

## Context

The services already write JSON logs with a `requestId`, but there were no metrics and no traces:
nothing shows latency or error rates per route, an outbox that stopped publishing, a consumer
dead-lettering messages, or where the time of a slow request went (web app → KrakenD → service
→ Postgres). We don't want to run Prometheus, Loki, Tempo and Grafana ourselves (storage,
upgrades, and Grafana would be one more admin UI to keep private, ADR 0004).

## Decision

- **Backend: Grafana Cloud** (managed Prometheus/Mimir, Loki, Tempo, Grafana). The Free tier is
  enough for the local staging (ADR 0018) and a small production. Every signal carries the label
  `cluster` (`staging-local`, `prod`) so environments share one stack without mixing.
- **One agent per namespace: Grafana Alloy**, plain manifests in `k8s/components/observability`
  (staging and prod overlays). It scrapes metrics, reads pod logs through the API server,
  receives OTLP traces, and pushes everything to Grafana Cloud. It only has a namespaced Role
  (pods, pods/log: read): no ClusterRole, no hostPath, no node access. Nothing in Grafana Cloud
  calls into the cluster. Credentials: a write-only token in a Secret (External Secrets in prod),
  never in git. Only allow-listed metrics leave the cluster, scraped every 60 s.
- **Metrics: Prometheus pull.** Each service serves `GET /metrics` (prom-client) on its own port,
  like `/health`: outside the `api` prefix, `@Public()`, never published in KrakenD. Labels are
  low-cardinality only (route TEMPLATE, method, status; never ids, users or query strings).
  Standard set: `http_server_request_duration_seconds`, `messaging_outbox_*`,
  `messaging_consumer_*`, Node.js process metrics.
- **Traces: OpenTelemetry**, OTLP/HTTP to Alloy, W3C `traceparent` continued across web app →
  KrakenD → service. Off unless `OTEL_EXPORTER_OTLP_ENDPOINT` is set (dev and tests need nothing).
  Parent-based sampling, `OTEL_TRACES_SAMPLER_ARG` for new traces. Probes and scrapes aren't traced.
  Event handling gets its own CONSUMER span (the trace doesn't yet cross the outbox).
- **Logs: unchanged** (JSON on stdout, read by Alloy), plus `trace_id`/`span_id` inside a span, so
  Grafana jumps from a log line to its trace.

## Consequences

- Dashboards and alerts on rates, latency, outbox failures and DLQ arrivals become possible.
- Grafana Cloud bills active series: every new metric or label must be checked for cardinality,
  and added to Alloy's allow-list (`config.alloy`) to leave the cluster at all.
- `/metrics` must stay unpublished (same rule and review check as `/health`); prod
  NetworkPolicies must admit Alloy to the service ports.
- Telemetry leaves the cluster: never put tokens, personal data or user input in labels, span
  attributes or logs (the access log rules already apply).
- No node or Kubernetes-object metrics (kube-state-metrics, cAdvisor): pod CPU/memory come from
  the apps' `process_*` metrics; cAdvisor through the API server would need `nodes/proxy`, which
  is too powerful to grant. Add kube-state-metrics if restarts/replicas dashboards are needed.
- To do: KrakenD's OpenTelemetry exporter, the web apps'
  `instrumentation.ts`, `traceparent` stored with outbox rows (one trace from request to consumer).

## Alternatives considered

- **Grafana's `k8s-monitoring` Helm chart**: complete, but cluster-wide RBAC, a DaemonSet with
  hostPath, node-exporter and kube-state-metrics by default, and far more series than the Free
  tier allows; we need a fraction of it. Rejected for now.
- **Self-hosted kube-prometheus-stack + Loki + Tempo**: full control, but storage, upgrades and
  a Grafana to keep private on a single-node budget. Rejected for now.
- **DigitalOcean monitoring only**: node-level graphs, no application metrics or traces.
- **OpenTelemetry for metrics too (OTLP push)**: one SDK, but `/metrics` + scraping is what
  Kubernetes tooling and dashboards expect, and it works without a collector. Can be revisited.
