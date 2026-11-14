#!/usr/bin/env bash
# Shared by the scripts that act on the LOCAL cluster (up.sh, staging.sh, stop.sh): source it.
# Dev and prod use the same namespace name (nest-microservice): these refuse any kubectl context
# other than Docker Desktop's, so a stop meant for the laptop can never reach production.

say() { printf '\n\033[1m▸ %s\033[0m\n' "$*"; }

# Safety: everything here assumes the LOCAL cluster. Never run it against another context.
require_local_cluster() {
  local ctx
  ctx=$(kubectl config current-context)
  if [ "$ctx" != "docker-desktop" ] && [ "${STAGING_ALLOW_CONTEXT:-}" != "$ctx" ]; then
    echo "Refusing: kubectl context is '$ctx', not 'docker-desktop'." >&2
    echo "These commands only run on the local cluster (STAGING_ALLOW_CONTEXT=$ctx to override)." >&2
    exit 1
  fi
}

# A developer's own Keycloak values (k8s/keycloak-local.env.example: e.g. a Google client): Secret
# "keycloak-local" from the git-ignored file, read LAST by the Job keycloak-config
# (components/keycloak-local). Without the file the Secret is removed: the overlay's values apply.
# Run it before applying the overlay (the Job starts right away). The namespace must exist.
KEYCLOAK_LOCAL_ENV=k8s/.keycloak-local.env
keycloak_local_secret() { # namespace
  if [ -f "$KEYCLOAK_LOCAL_ENV" ]; then
    say "Keycloak: your own values from $KEYCLOAK_LOCAL_ENV"
    local line literals=()
    while IFS= read -r line || [ -n "$line" ]; do
      line=${line%$'\r'} # a file saved on Windows
      case "$line" in '' | '#'*) continue ;; *=*) literals+=("--from-literal=$line") ;; esac
    done <"$KEYCLOAK_LOCAL_ENV"
    kubectl -n "$1" create secret generic keycloak-local "${literals[@]}" --dry-run=client -o yaml | kubectl apply -f - >/dev/null
  else
    kubectl -n "$1" delete secret keycloak-local --ignore-not-found >/dev/null
  fi
}

# Every pod of a namespace to 0, its volumes (and data) KEPT; finished Jobs deleted (migrations,
# streams, Keycloak configuration, content import: the next up runs them again). The manifests set
# the replicas back on the next apply (k8s:up, staging:up). No-op without the namespace.
stop_namespace() { # namespace
  require_local_cluster
  if ! kubectl get namespace "$1" >/dev/null 2>&1; then
    echo "Namespace $1 doesn't exist: nothing to stop."
    return 0
  fi
  kubectl -n "$1" scale deploy,statefulset --all --replicas=0 >/dev/null
  kubectl -n "$1" delete job --all --ignore-not-found >/dev/null
}
