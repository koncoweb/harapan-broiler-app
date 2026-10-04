$ports = 8081, 8082
foreach ($p in $ports) {
  $conns = Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue
  foreach ($c in $conns) {
    try {
      Stop-Process -Id $c.OwningProcess -Force -ErrorAction Stop
      Write-Output ("killed PID " + $c.OwningProcess + " on port " + $p)
    } catch {
      Write-Output ("failed to kill on port " + $p + ": " + $_.Exception.Message)
    }
  }
}
Write-Output "done"
