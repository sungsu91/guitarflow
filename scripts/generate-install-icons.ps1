param()

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$iconDirectory = Join-Path $projectRoot "public\icons"
$sourcePath = Join-Path $iconDirectory "just-play-icon-1024.png"
$backgroundColor = [System.Drawing.ColorTranslator]::FromHtml("#0B1020")

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

Write-InstallIcon -DestinationPath (Join-Path $iconDirectory "just-play-apple-touch-icon.png") -Size 180
Write-InstallIcon -DestinationPath (Join-Path $iconDirectory "just-play-icon-192.png") -Size 192
Write-InstallIcon -DestinationPath (Join-Path $iconDirectory "just-play-icon-512.png") -Size 512

# Android adaptive masks can remove roughly the outer fifth of the canvas.
# Keep the complete JUST PLAY artwork inside the mask-safe region while the
# opaque navy canvas extends edge to edge.
Write-InstallIcon -DestinationPath (Join-Path $iconDirectory "just-play-icon-maskable-192.png") -Size 192 -ArtworkScale 0.64
Write-InstallIcon -DestinationPath (Join-Path $iconDirectory "just-play-icon-maskable-512.png") -Size 512 -ArtworkScale 0.64

$aliases = @{
  "just-play-apple-touch-icon.png" = "apple-touch-icon.png"
  "just-play-icon-192.png" = "icon-192.png"
  "just-play-icon-512.png" = "icon-512.png"
  "just-play-icon-maskable-192.png" = "icon-maskable-192.png"
  "just-play-icon-maskable-512.png" = "icon-maskable-512.png"
}

foreach ($entry in $aliases.GetEnumerator()) {
  [System.IO.File]::Copy(
    (Join-Path $iconDirectory $entry.Key),
    (Join-Path $iconDirectory $entry.Value),
    $true
  )
}
