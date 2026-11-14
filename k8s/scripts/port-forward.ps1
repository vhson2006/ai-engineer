# Windows PowerShell version of port-forward.sh. Ctrl+C stops all forwards.
$ns = 'nest-microservice'
$forwards = @(
  @{ svc = 'postgres'; ports = @('5432:5432') },
  @{ svc = 'redis';    ports = @('6379:6379') },
  @{ svc = 'nats';     ports = @('4222:4222', '8222:8222') },
  @{ svc = 'krakend';  ports = @('8080:8080') },
  @{ svc = 'seaweedfs'; ports = @('8333:8333') },
  @{ svc = 'keycloak'; ports = @('8180:8080', '9000:9000') },
  @{ svc = 'mailpit';  ports = @('8025:8025') }
)

# Kills the kubectl port-forwards of THIS script: Stop-Job doesn't kill kubectl.exe, and orphans
# keep holding the ports (often forwarding to a pod that no longer exists).
$svcPattern = '-n ' + $ns + ' port-forward svc/(' + (($forwards | ForEach-Object { $_.svc }) -join '|') + ') '
function Stop-Forwards {
  Get-CimInstance Win32_Process -Filter "Name='kubectl.exe'" |
    Where-Object { $_.CommandLine -match $svcPattern } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
}
Stop-Forwards # orphans of a previous run

$jobs = foreach ($f in $forwards) {
  Start-Job -ArgumentList $ns, $f.svc, $f.ports -ScriptBlock {
    param($ns, $svc, $ports)
    # Pods behind the Service. `port-forward svc/x` binds to ONE pod at start; when it is replaced
    # (rollout, restart) kubectl keeps the port open but forwards to nothing and doesn't exit.
    # A watchdog reconnects when the pods changed (same logic as port-forward.sh).
    function Get-Backends {
      $names = kubectl -n $ns get endpointslices -l "kubernetes.io/service-name=$svc" -o 'jsonpath={.items[*].endpoints[*].targetRef.name}' 2>$null
      (("$names" -split '\s+') | Where-Object { $_ } | Sort-Object) -join ' '
    }
    while ($true) {
      $pods = Get-Backends
      $kubectlArgs = @('-n', $ns, 'port-forward', "svc/$svc") + $ports + @('--address', '127.0.0.1')
      $p = Start-Process -FilePath kubectl -ArgumentList $kubectlArgs -NoNewWindow -PassThru
      while (-not $p.HasExited) {
        Start-Sleep -Seconds 5
        $now = Get-Backends
        if ($now -and $now -ne $pods) {
          "[port-forward] svc/$svc`: pods changed ($pods -> $now), reconnecting"
          Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
          break
        }
      }
      Start-Sleep -Seconds 2   # also restarts kubectl if it exited
    }
  }
}

Write-Host 'Gateway       http://www.localtest.me:8000  http://auth.localtest.me:8000  (no forward needed)'
Write-Host 'KrakenD       http://localhost:8080  (the API: private, like in prod; portfolio-web API_URL)'
Write-Host 'Keycloak      http://localhost:8180/admin  (admin console, private), management http://localhost:9000'
Write-Host 'Postgres      localhost:5432   Redis localhost:6379   NATS localhost:4222 (monitor http://localhost:8222)'
Write-Host 'S3 (files)    http://localhost:8333  (SeaweedFS)'
Write-Host "Mail          http://localhost:8025  (Mailpit: every e-mail Keycloak sends, e.g. activation links)"
Write-Host 'Press Ctrl+C to stop.'
try { while ($true) { $jobs | Receive-Job; Start-Sleep -Seconds 1 } }
finally { $jobs | Stop-Job; $jobs | Remove-Job -Force; Stop-Forwards }
