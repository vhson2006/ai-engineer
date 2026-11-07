#!/usr/bin/env bash
# Secures and enables the Keycloak admin realm `master` (dev AND prod), once per fresh cluster:
#   - its Frontend URL → the private admin address, so the admin console works through the port-forward;
#   - brute-force detection (5 failures → temporary lockout, up to 15 min), like the app realm.
# Usage:
#   npm run keycloak:admin-url              # current kubectl context, http://localhost:8180
#
# Why: KC_HOSTNAME is the PUBLIC URL (auth.<domain>), and the console's login runs on realm
# "master" at that URL. The edge Gateway publishes only /realms/nest-microservice, so the console
# hangs (master → 404). Setting realm master's own Frontend URL to the private admin address
# (KC_HOSTNAME_ADMIN, reached with `kubectl port-forward svc/keycloak 8180:8080`) moves the admin
# login there. The app realm, its tokens and issuer are not touched (its brute-force settings come
# from the realm JSON).
#
# Run once after a fresh cluster (stored in Keycloak's database, survives restarts), BEFORE
# removing the bootstrap admin in prod: it logs in with KC_BOOTSTRAP_ADMIN_* inside the pod.
# Undo: same command with an empty URL:  bash k8s/scripts/keycloak-admin-url.sh ""
set -euo pipefail
URL=${1-http://localhost:8180}
NS=${NS:-nest-microservice} # staging: NS=nest-staging (see staging.sh)
export MSYS_NO_PATHCONV=1 # Git Bash: don't rewrite /opt/... into a Windows path

kubectl -n "$NS" exec deploy/keycloak -c keycloak -- env FRONTEND_URL="$URL" sh -c '
K=/opt/keycloak/bin/kcadm.sh; C=/tmp/kcadm-$$.config
trap "rm -f $C" EXIT
$K config credentials --config "$C" --server http://localhost:8080 --realm master \
  --user "$KC_BOOTSTRAP_ADMIN_USERNAME" --password "$KC_BOOTSTRAP_ADMIN_PASSWORD" >/dev/null 2>&1 \
  || { echo "kcadm login failed (bootstrap admin removed? set the Frontend URL with a named admin)" >&2; exit 1; }
$K update realms/master --config "$C" -s "attributes.frontendUrl=$FRONTEND_URL" \
  -s bruteForceProtected=true -s permanentLockout=false -s failureFactor=5 -s waitIncrementSeconds=60 \
  -s maxFailureWaitSeconds=900 -s maxDeltaTimeSeconds=43200 -s quickLoginCheckMilliSeconds=1000 \
  -s minimumQuickLoginWaitSeconds=60
echo "realm master: Frontend URL = ${FRONTEND_URL:-<none>}, brute-force detection on (5 failures)"'
echo "Admin console: ${URL:-<KC_HOSTNAME>}/admin  (needs: npm run k8s:forward, or kubectl -n $NS port-forward svc/keycloak ${URL##*:}:8080)"
