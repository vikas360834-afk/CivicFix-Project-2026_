# Generates AI civic images for CivicFix via pollinations.ai (free, no key).
# Usage:  powershell -File scripts\gen-images.ps1
$out = Join-Path $PSScriptRoot "..\frontend\public\img"
New-Item -ItemType Directory -Force -Path $out | Out-Null

$images = @(
  @{ name = "hero.jpg";      w = 1024; h = 640; seed = 11; prompt = "bright hopeful indian city street, municipal worker in orange safety vest inspecting a repaired road with a tablet, clean modern buildings, golden hour, photorealistic, wide shot" },
  @{ name = "pothole.jpg";   w = 640;  h = 480; seed = 21; prompt = "large dangerous pothole on an indian city road with cracked asphalt, daylight, documentary photo, photorealistic" },
  @{ name = "garbage.jpg";   w = 640;  h = 480; seed = 22; prompt = "overflowing garbage bin on an indian street corner with litter, daytime, documentary photo, photorealistic" },
  @{ name = "streetlight.jpg"; w = 640; h = 480; seed = 23; prompt = "dark indian street at night with a broken unlit street light pole, moody, documentary photo, photorealistic" },
  @{ name = "water.jpg";     w = 640;  h = 480; seed = 24; prompt = "burst water pipe leaking and flooding an indian residential lane, daytime, documentary photo, photorealistic" },
  @{ name = "resolved.jpg";  w = 640;  h = 480; seed = 25; prompt = "freshly repaired smooth asphalt road with new white lane markings in an indian city, workers packing up, blue sky, photorealistic" },
  @{ name = "ai.jpg";        w = 640;  h = 480; seed = 26; prompt = "futuristic holographic civic analytics dashboard floating above a city map, glowing emerald and teal ui, dark background, high tech" },
  @{ name = "community.jpg"; w = 640;  h = 480; seed = 27; prompt = "young indian citizens using a smartphone app to photograph a civic issue on their street, warm daylight, candid, photorealistic" }
)

foreach ($img in $images) {
  $dest = Join-Path $out $img.name
  if (Test-Path $dest) { Write-Host "skip $($img.name) (exists)"; continue }
  $enc = [uri]::EscapeDataString($img.prompt)
  $url = "https://image.pollinations.ai/prompt/$enc`?width=$($img.w)&height=$($img.h)&seed=$($img.seed)&nologo=true"
  $done = $false
  for ($try = 1; $try -le 4 -and -not $done; $try++) {
    Write-Host "Generating $($img.name) (try $try) ..." -NoNewline
    try {
      Invoke-WebRequest -Uri $url -OutFile $dest -TimeoutSec 120 -ErrorAction Stop
      $kb = [math]::Round((Get-Item $dest).Length / 1kb)
      Write-Host " ok ($kb KB)"
      $done = $true
    } catch {
      Write-Host " retry: $($_.Exception.Message)"
      Start-Sleep -Seconds (8 * $try)
    }
  }
  Start-Sleep -Seconds 6
}
Write-Host "Done. Images in $out"