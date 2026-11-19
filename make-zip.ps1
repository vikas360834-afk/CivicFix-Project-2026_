$src = "c:\Users\dell\Downloads\civicfix v2"
$staging = Join-Path $env:TEMP "civicfix-staging-pkg"
$zip1 = "c:\Users\dell\Downloads\civicfix-v2-final.zip"
$zip2 = "c:\Users\dell\Downloads\civicfix v2\civicfix-v2-final.zip"
$zip3 = "C:\Users\dell\.gemini\antigravity\brain\4ade16ad-5b2b-4c37-a90b-d9f15adf30cb\civicfix-v2-final.zip"

if (Test-Path $staging) { Remove-Item -Recurse -Force $staging }
New-Item -ItemType Directory -Path $staging | Out-Null

robocopy.exe $src $staging /E /XD node_modules dist .git .vite /XF *.zip *.log /NFL /NDL /NJH /NJS | Out-Null

Write-Host "Verifying dev.db in staging..."
$db = Join-Path $staging "backend\prisma\dev.db"
if (Test-Path $db) {
    Write-Host "✅ dev.db confirmed in staging: $((Get-Item $db).Length) bytes"
} else {
    Write-Host "⚠️ dev.db missing in staging!"
}

if (Test-Path $zip1) { Remove-Item -Force $zip1 }
Write-Host "Compressing archive..."
Compress-Archive -Path "$staging\*" -DestinationPath $zip1 -CompressionLevel Optimal

$size = (Get-Item $zip1).Length
Write-Host "✅ Created zip1 at $zip1 : $size bytes"

Copy-Item -Path $zip1 -Destination $zip2 -Force
Write-Host "✅ Copied to zip2 at $zip2"

Copy-Item -Path $zip1 -Destination $zip3 -Force
Write-Host "✅ Copied to zip3 at $zip3"

Remove-Item -Recurse -Force $staging
Write-Host "🎉 Packaging completed successfully!"
