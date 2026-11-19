Add-Type -AssemblyName System.Drawing
$imgDir = Join-Path $PSScriptRoot "..\frontend\public\img"
$files = Get-ChildItem -Path $imgDir -Filter *.jpg
$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]80)

foreach ($f in $files) {
    if ($f.Length -gt 500000) {
        $img = [System.Drawing.Image]::FromFile($f.FullName)
        $maxDim = 1280
        $w = $img.Width
        $h = $img.Height
        if ($w -gt $maxDim -or $h -gt $maxDim) {
            if ($w -gt $h) {
                $nw = $maxDim
                $nh = [int]($h * ($maxDim / $w))
            } else {
                $nh = $maxDim
                $nw = [int]($w * ($maxDim / $h))
            }
        } else {
            $nw = $w
            $nh = $h
        }
        $bmp = New-Object System.Drawing.Bitmap($nw, $nh)
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $g.DrawImage($img, 0, 0, $nw, $nh)
        $g.Dispose()
        $img.Dispose()
        $tmp = $f.FullName + ".tmp"
        $bmp.Save($tmp, $codec, $encoderParams)
        $bmp.Dispose()
        Move-Item -Path $tmp -Destination $f.FullName -Force
        $newLen = (Get-Item $f.FullName).Length
        Write-Host "Optimized $($f.Name): $($f.Length) -> $newLen bytes"
    }
}
