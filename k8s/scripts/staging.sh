#!/usr/bin/env bash
# LOCAL STAGING: the whole system in the local Docker Desktop cluster, production images, HTTPS.
# (k8s/overlays/staging; never touches production.) Run from the repo root through npm:
#
#   npm run staging:build      build the 5 production images (Docker Desktop's cluster sees them)
#   npm run staging:up         install/refresh everything, scale dev down, deploy, migrate, wait
#   npm run staging:trust-ca   trust the local CA in Windows (once): HTTPS padlock, no warning
#   npm run staging:status     pods, certificate, URLs
#   npm run staging:down       delete staging (namespace + data); `npm run k8s:up` brings dev back
set -euo pipefail
cd "$(dirname "$0")/../.."
export MSYS_NO_PATHCONV=1

NS=nest-staging
DEV_NS=nest-microservice
CERT_MANAGER_VERSION=v1.21.3 # same as production (k8s/README.md)
CA_FILE=k8s/.local-ca.crt    # git-ignored: the CA certificate only (never the key)
GRAFANA_ENV=k8s/.grafana-cloud.env # git-ignored: Grafana Cloud credentials (k8s/grafana-cloud.env.example)

say() { printf '\n\033[1m▸ %s\033[0m\n' "$*"; }

# Safety: everything here assumes the LOCAL cluster. Never run it against another context.
require_local_cluster() {
  local ctx
  ctx=$(kubectl config current-context)
  if [ "$ctx" != "docker-desktop" ] && [ "${STAGING_ALLOW_CONTEXT:-}" != "$ctx" ]; then
    echo "Refusing: kubectl context is '$ctx', not 'docker-desktop'." >&2
    echo "Local staging only runs on the local cluster (STAGING_ALLOW_CONTEXT=$ctx to override)." >&2
    exit 1
  fi
}

build() {
  say "Building production images (tag :staging)"
  docker build --target deployment-service -t local/deployment-service:staging nest-microservice
  docker build --target notification-service -t local/notification-service:staging nest-microservice
  docker build --target migrate -t local/deployment-migrate:staging nest-microservice
  docker build -f web/apps/portfolio-web/Dockerfile --build-arg SITE_URL=https://www.staging.localtest.me -t local/portfolio-web:staging web
  docker build -f web/apps/admin-web/Dockerfile -t local/admin-web:staging web
  echo "Done. Docker Desktop's cluster uses the local image store: no push, no pull."
}

install_cert_manager() {
  if ! kubectl get deploy -n cert-manager cert-manager >/dev/null 2>&1; then
    say "Installing cert-manager $CERT_MANAGER_VERSION"
    kubectl apply -f "https://github.com/cert-manager/cert-manager/releases/download/$CERT_MANAGER_VERSION/cert-manager.yaml"
  fi
  # Gateway API support (like prod's enableGatewayAPI) and CA name constraints.
  local args
  args=$(kubectl -n cert-manager get deploy cert-manager -o jsonpath='{.spec.template.spec.containers[0].args}')
  if [[ "$args" != *"--enable-gateway-api"* ]]; then
    kubectl -n cert-manager patch deploy cert-manager --type=json -p='[
      {"op":"add","path":"/spec/template/spec/containers/0/args/-","value":"--enable-gateway-api"},
      {"op":"add","path":"/spec/template/spec/containers/0/args/-","value":"--feature-gates=NameConstraints=true"}]'
  fi
  kubectl -n cert-manager rollout status deploy/cert-manager deploy/cert-manager-webhook deploy/cert-manager-cainjector --timeout=180s
}

local_ca() {
  say "Local CA (localtest.me only)"
  # The webhook may need a few seconds after install before it accepts resources.
  for i in $(seq 1 20); do kubectl apply -k k8s/platform/local >/dev/null 2>&1 && break; sleep 3; done
  kubectl apply -k k8s/platform/local
  kubectl -n cert-manager wait certificate/local-ca --for=condition=Ready --timeout=120s
  kubectl -n cert-manager get secret local-ca -o jsonpath='{.data.ca\.crt}' | base64 -d > "$CA_FILE"
  echo "CA certificate: $CA_FILE ($(openssl x509 -in "$CA_FILE" -noout -subject 2>/dev/null | sed 's/subject=//'))"
}

coredns_rule() {
  # In the cluster, *.localtest.me resolves to 127.0.0.1 (the pod itself). Pods must reach
  # https://auth.staging.localtest.me (Keycloak) and https://s3.staging.localtest.me through the
  # Gateway, like public DNS does in prod. Idempotent: inserts a marked block once.
  local corefile
  corefile=$(kubectl -n kube-system get configmap coredns -o jsonpath='{.data.Corefile}')
  if [[ "$corefile" == *"staging.localtest.me"* ]]; then return; fi
  say "CoreDNS: *.staging.localtest.me → the staging Gateway (in-cluster)"
  local rule='    # local staging (k8s/scripts/staging.sh): *.staging.localtest.me -> staging Gateway\n    rewrite stop {\n        name regex (.+)\\.staging\\.localtest\\.me\\.$ edge-nginx.nest-staging.svc.cluster.local.\n        answer auto\n    }'
  local updated
  updated=$(printf '%s' "$corefile" | awk -v rule="$rule" '{ print } /^\.:53 \{/ && !done { print rule; done=1 }')
  kubectl -n kube-system create configmap coredns --from-literal=Corefile="$updated" --dry-run=client -o yaml \
    | kubectl -n kube-system apply -f - >/dev/null
  kubectl -n kube-system rollout restart deploy/coredns >/dev/null
  kubectl -n kube-system rollout status deploy/coredns --timeout=120s
}


# Alloy (ADR 0023) ships metrics, logs and traces to Grafana Cloud, with the credentials of
# $GRAFANA_ENV. Without that file staging still works: Alloy is scaled to 0 (the apps' traces are
# simply dropped).
telemetry() {
  if [ -f "$GRAFANA_ENV" ]; then
    say "Telemetry: Alloy → Grafana Cloud (credentials from $GRAFANA_ENV)"
    kubectl -n "$NS" create secret generic grafana-cloud --from-env-file="$GRAFANA_ENV"       --dry-run=client -o yaml | kubectl apply -f - >/dev/null
    kubectl -n "$NS" rollout restart deploy/alloy >/dev/null # pick up changed credentials
  else
    say "Telemetry off: no $GRAFANA_ENV (copy k8s/grafana-cloud.env.example to enable it)"
    kubectl -n "$NS" scale deploy/alloy --replicas=0 >/dev/null
  fi
}

scale_dev_down() {
  if kubectl get ns "$DEV_NS" >/dev/null 2>&1; then
    say "Scaling dev ($DEV_NS) to 0 to free memory (data kept; npm run k8s:up restores it)"
    kubectl -n "$DEV_NS" scale deploy,statefulset --all --replicas=0 >/dev/null
  fi
}

up() {
  require_local_cluster
  for img in deployment-service notification-service deployment-migrate portfolio-web admin-web; do
    docker image inspect "local/$img:staging" >/dev/null 2>&1 || { echo "Missing image local/$img:staging: run npm run staging:build first." >&2; exit 1; }
  done
  say "NGINX Gateway Fabric"
  bash k8s/scripts/gateway-install.sh
  install_cert_manager
  local_ca
  coredns_rule
  scale_dev_down

  say "Deploying k8s/overlays/staging into $NS"
  kubectl create namespace "$NS" --dry-run=client -o yaml | kubectl apply -f - >/dev/null
  kubectl -n "$NS" create configmap local-ca --from-file=ca.crt="$CA_FILE" --dry-run=client -o yaml | kubectl apply -f - >/dev/null
  kubectl -n "$NS" delete job db-migrate nats-setup --ignore-not-found >/dev/null # a Job's template is immutable
  # Content-addressed tags: a node that already has local/<img>:staging keeps its OLD copy
  # (IfNotPresent), so each build is deployed as local/<img>:<image id>; a rebuild changes the tag,
  # which also rolls the Deployments.
  local rewrite=()
  for img in deployment-service notification-service deployment-migrate portfolio-web admin-web; do
    local id
    id=$(docker image inspect -f '{{.Id}}' "local/$img:staging" | sed 's/^sha256://' | cut -c1-12)
    docker tag "local/$img:staging" "local/$img:$id"
    rewrite+=(-e "s#local/$img:staging#local/$img:$id#g")
  done
  kubectl kustomize k8s/overlays/staging | sed "${rewrite[@]}" | kubectl apply -f - >/dev/null
  telemetry

  say "Waiting for the data stores, the migrations, the JetStream streams and the apps"
  kubectl -n "$NS" rollout status statefulset/postgres statefulset/redis statefulset/nats statefulset/seaweedfs --timeout=300s
  kubectl -n "$NS" wait job/db-migrate job/nats-setup --for=condition=Complete --timeout=600s
  kubectl -n "$NS" rollout status deploy/keycloak --timeout=600s
  kubectl -n "$NS" rollout status deploy/krakend deploy/deployment-service deploy/notification-service deploy/portfolio-web deploy/admin-web --timeout=300s
  kubectl -n "$NS" wait certificate --all --for=condition=Ready --timeout=180s
  if [ -f "$GRAFANA_ENV" ]; then kubectl -n "$NS" rollout status deploy/alloy --timeout=180s; fi

  say "Keycloak admin realm (Frontend URL + brute-force detection)"
  NS="$NS" bash k8s/scripts/keycloak-admin-url.sh http://localhost:8181
  say "Admin site sign-in: password + one-time code (client admin-web)"
  NS="$NS" bash k8s/scripts/keycloak-admin-otp.sh

  status
}

status() {
  require_local_cluster
  kubectl -n "$NS" get pods,certificate 2>/dev/null || echo "staging is not deployed"
  cat <<MSG

  https://www.staging.localtest.me    the site (sign in: bob / password)
  https://admin.staging.localtest.me  the admin site (alice / password + one-time code, web/apps/admin-web/README.md)
  https://auth.staging.localtest.me   Keycloak (app realm)
  https://s3.staging.localtest.me     object storage (presigned URLs)
  Admin console: kubectl -n $NS port-forward svc/keycloak 8181:8080 → http://localhost:8181/admin
  Browser warning? Trust the local CA once: npm run staging:trust-ca
  Telemetry: $( [ -f "$GRAFANA_ENV" ] && echo "on → Grafana Cloud, label cluster=staging-local" || echo "off (k8s/grafana-cloud.env.example → $GRAFANA_ENV)" )
MSG
}

trust_ca() {
  [ -f "$CA_FILE" ] || { echo "No $CA_FILE yet: run npm run staging:up first." >&2; exit 1; }
  say "Trusting the local CA for your Windows user (Windows asks you to confirm)"
  openssl x509 -in "$CA_FILE" -noout -subject -enddate -ext nameConstraints 2>/dev/null || true
  powershell.exe -NoProfile -Command "Import-Certificate -FilePath '$(cygpath -w "$CA_FILE" 2>/dev/null || echo "$CA_FILE")' -CertStoreLocation Cert:\\CurrentUser\\Root | Format-List Subject,Thumbprint,NotAfter"
  echo "Done. Restart the browser. Firefox: about:config → security.enterprise_roots.enabled = true."
  echo "Remove later: certmgr.msc → Trusted Root Certification Authorities → 'Local staging CA (localtest.me only)'."
}

down() {
  require_local_cluster
  say "Deleting staging (namespace $NS, including its data)"
  kubectl delete namespace "$NS" --ignore-not-found --wait=true
  echo "cert-manager, the local CA and the CoreDNS rule stay (harmless, reused next time)."
  echo "Bring dev back: npm run k8s:up"
}

case "${1:-}" in
  build) build ;;
  up) up ;;
  status) status ;;
  trust-ca) trust_ca ;;
  down) down ;;
  *) echo "usage: staging.sh build|up|status|trust-ca|down" >&2; exit 2 ;;
esac
