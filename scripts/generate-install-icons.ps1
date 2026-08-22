param()

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$iconDirectory = Join-Path $projectRoot "public\icons"
$publicDirectory = Join-Path $projectRoot "public"
$sourcePath = Join-Path $publicDirectory "assets\branding\fretiva-lab-app-icon-master.png"
$backgroundColor = [System.Drawing.Color]::Black

function Write-InstallIcon {
  param(
    [Parameter(Mandatory = $true)]
    [string]$DestinationPath,

    [Parameter(Mandatory = $true)]
    [int]$Size,

    [double]$ArtworkScale = 1.0
  )

  $source = [System.Drawing.Image]::FromFile($sourcePath)
  try {
    # Installation icons are intentionally RGB, not RGBA. iOS otherwise places
    # transparent Web Clip artwork on a system background that can appear white.
    $canvas = New-Object System.Drawing.Bitmap(
      $Size,
      $Size,
      [System.Drawing.Imaging.PixelFormat]::Format24bppRgb
    )
    try {
      $graphics = [System.Drawing.Graphics]::FromImage($canvas)
      try {
        $graphics.Clear($backgroundColor)
        $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

        $artworkSize = [int][Math]::Round($Size * $ArtworkScale)
        $artworkOffset = [int][Math]::Floor(($Size - $artworkSize) / 2)
        $destination = New-Object System.Drawing.Rectangle(
          $artworkOffset,
          $artworkOffset,
          $artworkSize,
          $artworkSize
        )
        $graphics.DrawImage($source, $destination)
      }
      finally {
        $graphics.Dispose()
      }

      $canvas.Save($DestinationPath, [System.Drawing.Imaging.ImageFormat]::Png)
    }
    finally {
      $canvas.Dispose()
    }
  }
  finally {
    $source.Dispose()
  }
}

function Write-PngIco {
  param(
    [Parameter(Mandatory = $true)]
    [string]$DestinationPath,

    [Parameter(Mandatory = $true)]
    [string[]]$PngPaths
  )

  $images = [System.Collections.Generic.List[byte[]]]::new()
  foreach ($pngPath in $PngPaths) {
    $images.Add([System.IO.File]::ReadAllBytes($pngPath))
  }
  $stream = New-Object System.IO.MemoryStream
  $writer = New-Object System.IO.BinaryWriter($stream)
  try {
    $writer.Write([uint16]0)
    $writer.Write([uint16]1)
    $writer.Write([uint16]$images.Count)

    $offset = 6 + (16 * $images.Count)
    for ($index = 0; $index -lt $images.Count; $index += 1) {
      $pngPath = $PngPaths[$index]
      $png = $images[$index]
      $bitmap = [System.Drawing.Bitmap]::FromFile($pngPath)
      try {
        $writer.Write([byte]$bitmap.Width)
        $writer.Write([byte]$bitmap.Height)
      }
      finally {
        $bitmap.Dispose()
      }
      $writer.Write([byte]0)
      $writer.Write([byte]0)
      $writer.Write([uint16]1)
      $writer.Write([uint16]32)
      $writer.Write([uint32]$png.Length)
      $writer.Write([uint32]$offset)
      $offset += $png.Length
    }

    foreach ($png in $images) {
      $writer.Write($png)
    }

    [System.IO.File]::WriteAllBytes($DestinationPath, $stream.ToArray())
  }
  finally {
    $writer.Dispose()
    $stream.Dispose()
  }
}

Write-InstallIcon -DestinationPath (Join-Path $iconDirectory "fretiva-lab-icon-1024.png") -Size 1024
Write-InstallIcon -DestinationPath (Join-Path $iconDirectory "fretiva-lab-apple-touch-icon.png") -Size 180
Write-InstallIcon -DestinationPath (Join-Path $iconDirectory "fretiva-lab-icon-192.png") -Size 192
Write-InstallIcon -DestinationPath (Join-Path $iconDirectory "fretiva-lab-icon-512.png") -Size 512
Write-InstallIcon -DestinationPath (Join-Path $iconDirectory "fretiva-lab-favicon-32.png") -Size 32
Write-InstallIcon -DestinationPath (Join-Path $iconDirectory "fretiva-lab-favicon-48.png") -Size 48

# Android adaptive masks can remove roughly the outer fifth of the canvas.
# Keep the complete FRETIVA LAB artwork inside the mask-safe region while the
# opaque black canvas extends edge to edge.
Write-InstallIcon -DestinationPath (Join-Path $iconDirectory "fretiva-lab-icon-maskable-192.png") -Size 192 -ArtworkScale 0.64
Write-InstallIcon -DestinationPath (Join-Path $iconDirectory "fretiva-lab-icon-maskable-512.png") -Size 512 -ArtworkScale 0.64

$fretivaFaviconPath = Join-Path $publicDirectory "fretiva-lab-favicon.ico"
Write-PngIco -DestinationPath $fretivaFaviconPath -PngPaths @(
  (Join-Path $iconDirectory "fretiva-lab-favicon-32.png"),
  (Join-Path $iconDirectory "fretiva-lab-favicon-48.png")
)

$aliases = @{
  "fretiva-lab-icon-1024.png" = @("just-play-icon-1024.png")
  "fretiva-lab-apple-touch-icon.png" = @("apple-touch-icon.png", "just-play-apple-touch-icon.png")
  "fretiva-lab-icon-192.png" = @("icon-192.png", "just-play-icon-192.png")
  "fretiva-lab-icon-512.png" = @("icon-512.png", "just-play-icon-512.png")
  "fretiva-lab-icon-maskable-192.png" = @("icon-maskable-192.png", "just-play-icon-maskable-192.png")
  "fretiva-lab-icon-maskable-512.png" = @("icon-maskable-512.png", "just-play-icon-maskable-512.png")
  "fretiva-lab-favicon-32.png" = @("favicon-32.png", "just-play-favicon-32.png")
  "fretiva-lab-favicon-48.png" = @("favicon-48.png", "just-play-favicon-48.png")
}

foreach ($entry in $aliases.GetEnumerator()) {
  foreach ($alias in $entry.Value) {
    [System.IO.File]::Copy(
      (Join-Path $iconDirectory $entry.Key),
      (Join-Path $iconDirectory $alias),
      $true
    )
  }
}

[System.IO.File]::Copy($fretivaFaviconPath, (Join-Path $publicDirectory "favicon.ico"), $true)
[System.IO.File]::Copy($fretivaFaviconPath, (Join-Path $publicDirectory "just-play-favicon.ico"), $true)
