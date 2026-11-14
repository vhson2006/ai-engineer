#!/usr/bin/env bash
# `npm run k8s:stop`: the local dev stack (overlays/dev, namespace nest-microservice) stops, its
# data KEPT (volumes: Postgres, Redis, NATS, SeaweedFS); `npm run k8s:up` resumes it. Frees the
# laptop's memory (e.g. before staging:build). `npm run k8s:down` instead deletes everything,
# data included. What runs on your machine stops with Ctrl+C: the API (`npm run start:dev`), the
# web apps (`npm run dev`) and `npm run k8s:forward`.
set -euo pipefail
cd "$(dirname "$0")/../.."
source k8s/scripts/local.sh
require_local_cluster
say "Stopping dev (namespace nest-microservice): every pod to 0, its volumes and data KEPT"
stop_namespace nest-microservice
echo "Dev stopped; npm run k8s:up resumes it with the same data (npm run k8s:down deletes it)."
