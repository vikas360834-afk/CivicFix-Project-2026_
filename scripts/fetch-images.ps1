# Curated HD images for CivicFix, from Wikimedia Commons (free, no key, licensed).
# Saves into frontend/public/img so the app works offline.
# Usage: powershell -File scripts\fetch-images.ps1
$out = Join-Path $PSScriptRoot "..\frontend\public\img"
New-Item -ItemType Directory -Force -Path $out | Out-Null
$api = "https://commons.wikimedia.org/w/api.php"

# file => @{ q = search query; i = preferred result index; w = width }
$themes = [ordered]@{
  "hero.jpg"        = @{ q = "Bengaluru skyline";            i = 0; w = 2000 }
  "pothole.jpg"     = @{ q = "pothole road";                 i = 1; w = 1600 }
  "garbage.jpg"     = @{ q = "waste dump India street";      i = 0; w = 1600 }
  "streetlight.jpg" = @{ q = "street light broken";          i = 1; w = 1600 }
  "water.jpg"       = @{ q = "waterlogging street";          i = 0; w = 1600 }
  "resolved.jpg"    = @{ q = "asphalt road repair";          i = 0; w = 1600 }
  "community.jpg"   = @{ q = "India city street people";     i = 0; w = 1600 }
  "ai.jpg"          = @{ q = "control room monitors data";   i = 0; w = 1600 }
  "electricity.jpg" = @{ q = "electricity pole street";      i = 3; w = 1600 }
  "park.jpg"        = @{ q = "city park garden";             i = 4; w = 1600 }
  "gas.jpg"         = @{ q = "gas pipeline street";          i = 4; w = 1600 }
}

function Get-CommonsImage($q, $idx, $w) {
  $search = [uri]::EscapeDataString($q) + "%20filetype%3Abitmap"
  $uri = "$api`?action=query&format=json&generator=search&gsrsearch=$search&gsrnamespace=6&gsrlimit=12&prop=imageinfo&iiprop=url&iiurlwidth=$w"
  $r = Invoke-RestMethod -Uri $uri -TimeoutSec 40 -Headers @{ "User-Agent" = "CivicFix-CollegeProject/1.0" }
  if (-not $r.query.pages) { return $null }
  $list = @($r.query.pages.PSObject.Properties.Value | Sort-Object { $_.index })
  if ($idx -ge $list.Count) { $idx = 0 }
  $p = $list[$idx]
  if (-not $p.imageinfo[0].thumburl) { return $null }
  return @{ url = $p.imageinfo[0].thumburl; title = $p.title }
}

foreach ($name in $themes.Keys) {
  $t = $themes[$name]
  Write-Host ("{0,-16} <- '{1}' [{2}] ..." -f $name, $t.q, $t.i) -NoNewline
  try {
    $img = Get-CommonsImage $t.q $t.i $t.w
    if (-not $img) { Write-Host " no result"; continue }
    Invoke-WebRequest -Uri $img.url -OutFile (Join-Path $out $name) -TimeoutSec 120 -Headers @{ "User-Agent" = "CivicFix-CollegeProject/1.0" } -ErrorAction Stop
    $kb = [math]::Round((Get-Item (Join-Path $out $name)).Length / 1kb)
    Write-Host (" ok ({0} KB)  {1}" -f $kb, $img.title)
  } catch {
    Write-Host " FAILED: $($_.Exception.Message)"
  }
}
Write-Host "Done -> $out"