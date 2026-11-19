# CivicFix watchdog - restarts backend/frontend if their ports are down.
# Runs every minute via the CivicFixWatchdog scheduled task.
$ErrorActionPreference = "SilentlyContinue"
$be = "C:\CivicFix 02\backend"
$fe = "C:\CivicFix 02\frontend"

function Test-Port($port) {
  try {
    $c = New-Object System.Net.Sockets.TcpClient
    $c.Connect("127.0.0.1", $port)
    $c.Close()
    return $true
  } catch { return $false }
}

if (-not (Test-Port 5000)) {
  Start-Process -FilePath "node.exe" `
    -ArgumentList "src/server.js" `
    -WorkingDirectory $be `
    -WindowStyle Minimized
}

if (-not (Test-Port 5173)) {
  Start-Process -FilePath (Join-Path $fe "node_modules\.bin\vite.cmd") `
    -ArgumentList "--port", "5173", "--host" `
    -WorkingDirectory $fe `
    -WindowStyle Minimized
}
