#!/usr/bin/env bash
# `npm run k8s:up`: the local cluster (overlays/dev). Idempotent; run it again after any change.
#   1. NGINX Gateway Fabric, once per cluster (gateway-install.sh).
#   2. Deletes the previous Job keycloak-config: a Job's template is immutable and a finished Job
#      doesn't run again, so every k8s:up applies the Keycloak configuration anew (ADR 0043).
#   3. Secret keycloak-local from k8s/.keycloak-local.env, if you have one (local.sh).
#   4. Applies the overlay; the Job waits for Keycloak, then applies realms master and
#      nest-microservice (follow it: kubectl -n nest-microservice logs -f job/keycloak-config).
#   5. After local staging: every dev pod comes back (the manifests set replicas; the Gateway's
#      nginx is scaled back here).
set -euo pipefail
NS=nest-microservice
source k8s/scripts/local.sh
bash k8s/scripts/gateway-install.sh
if kubectl get namespace "$NS" >/dev/null 2>&1; then
  kubectl -n "$NS" delete job keycloak-config --ignore-not-found >/dev/null
fi
kubectl create namespace "$NS" --dry-run=client -o yaml | kubectl apply -f - >/dev/null # a first run
keycloak_local_secret "$NS"
kubectl apply -k k8s/overlays/dev
# After local staging (staging:up scaled dev to 0): the Gateway's nginx, made by NGINX Gateway Fabric
# and not by these manifests, doesn't come back with the apply.
if [ "$(kubectl -n "$NS" get deploy edge-nginx -o jsonpath='{.spec.replicas}' 2>/dev/null)" = "0" ]; then
  kubectl -n "$NS" scale deploy edge-nginx --replicas=1 >/dev/null
fi
echo "Keycloak configuration: kubectl -n $NS logs -f job/keycloak-config"
