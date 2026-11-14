#!/usr/bin/env bash
# `npm run k8s:up`: the local cluster (overlays/dev). Idempotent; run it again after any change.
#   1. NGINX Gateway Fabric, once per cluster (gateway-install.sh).
#   2. Deletes the previous Job keycloak-config: a Job's template is immutable and a finished Job
#      doesn't run again, so every k8s:up applies the Keycloak configuration anew (ADR 0043).
#   3. Applies the overlay; the Job waits for Keycloak, then applies realms master and
#      nest-microservice (follow it: kubectl -n nest-microservice logs -f job/keycloak-config).
set -euo pipefail
NS=nest-microservice
bash k8s/scripts/gateway-install.sh
if kubectl get namespace "$NS" >/dev/null 2>&1; then
  kubectl -n "$NS" delete job keycloak-config --ignore-not-found >/dev/null
fi
kubectl apply -k k8s/overlays/dev
echo "Keycloak configuration: kubectl -n $NS logs -f job/keycloak-config"
