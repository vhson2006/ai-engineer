#!/usr/bin/env bash
# Expose the in-cluster infra on localhost with the SAME ports as docker-compose.yml,
# so .env (DB_PORT=5432, NATS_URL=nats://localhost:4222) works unchanged.
# Ctrl+C stops all forwards.
set -u
NS=nest-microservice
SVCS='postgres|redis|nats|krakend|seaweedfs|keycloak'

# Kills the kubectl port-forwards of THIS script (left over by a previous run, or ours on exit).
# On Windows (Git Bash) killing the shell doesn't kill kubectl.exe: the orphans keep holding the
# ports, often forwarding to a pod that no longer exists, and the next run can't bind them.
stop_forwards() {
  if command -v powershell.exe >/dev/null 2>&1; then
    powershell.exe -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name='kubectl.exe'\" | Where-Object { \$_.CommandLine -match '-n $NS port-forward svc/($SVCS) ' } | ForEach-Object { Stop-Process -Id \$_.ProcessId -Force -ErrorAction SilentlyContinue }" >/dev/null 2>&1
  else
    pkill -f "kubectl -n $NS port-forward svc/($SVCS) " 2>/dev/null
  fi
  return 0
}

# Names of the pods currently behind a Service (sorted, space-separated), from its EndpointSlices.
backends() {
  kubectl -n "$NS" get endpointslices -l "kubernetes.io/service-name=$1" \
    -o jsonpath='{range .items[*].endpoints[*]}{.targetRef.name}{"\n"}{end}' 2>/dev/null | sort | tr '\n' ' '
}

# `kubectl port-forward svc/x` binds to ONE pod chosen at start. When that pod is replaced
# (rollout, restart, new config), kubectl keeps the local port open but forwards to nothing, and
# doesn't exit: the apps on this machine hang. So a watchdog compares the pods behind the Service
# every 5 s and reconnects when they changed. The loop also restarts kubectl if it exits.
forward() {
  local svc=$1
  shift
  while true; do
    local pods
    pods=$(backends "$svc")
    kubectl -n "$NS" port-forward "svc/$svc" "$@" --address 127.0.0.1 &
    local pid=$!
    while kill -0 "$pid" 2>/dev/null; do
      sleep 5
      local now
      now=$(backends "$svc")
      if [ -n "$now" ] && [ "$now" != "$pods" ]; then
        echo "[port-forward] svc/$svc: pods changed (${pods:-none} -> $now), reconnecting" >&2
        kill "$pid" 2>/dev/null
        break
      fi
    done
    wait "$pid" 2>/dev/null
    echo "[port-forward] svc/$svc stopped, restarting in 2s..." >&2
    sleep 2
  done
}

stop_forwards # orphans of a previous run
trap 'trap - EXIT INT TERM; stop_forwards; kill 0' EXIT INT TERM
forward postgres 5432:5432 &
forward redis 6379:6379 &
forward nats 4222:4222 8222:8222 &
forward krakend 8080:8080 &
forward seaweedfs 8333:8333 &
forward keycloak 8180:8080 9000:9000 &
cat <<'MSG'
Gateway       http://www.localtest.me:8000  http://auth.localtest.me:8000  (no forward needed)
KrakenD       http://localhost:8080  (the API: private, like in prod; portfolio-web's API_URL)
Keycloak      http://localhost:8180/admin  (admin console, private), management http://localhost:9000
Postgres      localhost:5432   Redis localhost:6379   NATS localhost:4222 (monitor http://localhost:8222)
S3 (files)    http://localhost:8333  (SeaweedFS; buckets dev-public-files, dev-private-files)
MSG
wait
