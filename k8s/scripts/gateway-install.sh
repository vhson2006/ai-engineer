#!/usr/bin/env bash
# Installs NGINX Gateway Fabric (the cluster's edge proxy, Gateway API) once per cluster:
#   1. Gateway API CRDs (standard channel, the version this NGF release was tested with)
#   2. NGF's own CRDs (NginxProxy, policies...)
#   3. The NGF control plane in namespace nginx-gateway, and GatewayClass "nginx"
# The data plane (an nginx Deployment + LoadBalancer Service) is created per Gateway, from
# k8s/base/gateway/gateway.yaml, when you run `npm run k8s:up`.
#
# Idempotent: does nothing when this version is already installed.
# Why not ingress-nginx: kubernetes/ingress-nginx was retired in March 2026 (no more fixes).
set -euo pipefail

NGF_VERSION=v2.8.0
RAW=https://raw.githubusercontent.com/nginx/nginx-gateway-fabric/$NGF_VERSION

installed=$(kubectl -n nginx-gateway get deploy nginx-gateway \
  -o jsonpath='{.metadata.labels.app\.kubernetes\.io/version}' 2>/dev/null || true)
if [ "v$installed" = "$NGF_VERSION" ]; then
  echo "NGINX Gateway Fabric $NGF_VERSION already installed"
  exit 0
fi

echo "Installing Gateway API CRDs + NGINX Gateway Fabric $NGF_VERSION"
kubectl kustomize "https://github.com/nginx/nginx-gateway-fabric/config/crd/gateway-api/standard?ref=$NGF_VERSION" \
  | kubectl apply -f -
kubectl apply --server-side -f "$RAW/deploy/crds.yaml"
kubectl apply -f "$RAW/deploy/default/deploy.yaml"
kubectl -n nginx-gateway rollout status deploy/nginx-gateway --timeout=180s
