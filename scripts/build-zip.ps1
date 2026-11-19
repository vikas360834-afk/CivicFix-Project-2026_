# Builds the final submission ZIP (excludes node_modules, .env, *.db, dist).
param(
  [string]$Out = "$PSScriptRoot\..\civicfix-submission.zip"
)

$ErrorActionPreference = "Stop"
$root = (Resolve-Path "$PSScriptRoot\..").Path
$name = [System.IO.Path]::GetFileName($root)
$temp = Join-Path $env:TEMP "civicfix-zip-src"
$dest = Join-Path $temp $name

Write-Host "==> Preparing zip source in $temp"
if (Test-Path $temp) { Remove-Item $temp -Recurse -Force }
New-Item -ItemType Directory -Path $dest -Force | Out-Null

$custom = @(
  "synopsis.md", "README.md", ".gitignore", "backend", "frontend", "docs", "scripts"
)
foreach ($item in $custom) {
  $src = Join-Path $root $item
  if (Test-Path $src) { Copy-Item $src -Destination $dest -Recurse -Force }
}

# Drop heavy / non-portable artifacts
$dropPatterns = @(
  "node_modules", ".env", "*.db", "*.db-journal", "dist", ".vite", "package-lock.json", "dev.db"
)
foreach ($p in $dropPatterns) {
  Get-ChildItem $dest -Recurse -Force -Filter $p -ErrorAction SilentlyContinue |
    Where-Object { $_.PSIsContainer -or $_.Name -like $p -or $_.Name -eq "dev.db" } |
    ForEach-Object { Remove-Item $_.FullName -Recurse -Force -ErrorAction SilentlyContinue }
}
# second pass: remove any stray files by exact name
Get-ChildItem $dest -Recurse -Force -Include "*.db", ".env", "dev.db" -ErrorAction SilentlyContinue |
  ForEach-Object { Remove-Item $_.FullName -Force -ErrorAction SilentlyContinue }

# marker with generation timestamp
"Generated on $(Get-Date -Format 'yyyy-MM-dd HH:mm') for 24CIE554 submission" |
  Set-Content (Join-Path $dest "VERSION.txt")

Write-Host "==> Compressing..."
if (Test-Path $Out) { Remove-Item $Out -Force }
Compress-Archive -Path $temp\$name -DestinationPath $Out -CompressionLevel Optimal
Remove-Item $temp -Recurse -Force

$size = [math]::Round((Get-Item $Out).Length / 1MB, 2)
Write-Host "==> Done: $Out ($size MB)"