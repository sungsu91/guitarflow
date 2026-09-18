param()

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$iconDirectory = Join-Path $projectRoot "public\icons"
$publicDirectory = Join-Path $projectRoot "public"
$sourcePath = Join-Path $publicDirectory "assets\branding\fretiva-lab-app-icon-master.png"
$backgroundColor = [System.Drawing.Color]::White

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
    # Preserve the supplied white background as opaque RGB.
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

        $fitScale = ($Size * $ArtworkScale) / [Math]::Max($source.Width, $source.Height)
        $artworkWidth = [int][Math]::Round($source.Width * $fitScale)
        $artworkHeight = [int][Math]::Round($source.Height * $fitScale)
        $destination = New-Object System.Drawing.Rectangle(
          [int][Math]::Floor(($Size - $artworkWidth) / 2),
          [int][Math]::Floor(($Size - $artworkHeight) / 2),
          $artworkWidth,
          $artworkHeight
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

Write-InstallIcon -DestinationPath (Join-Path $iconDirectory "fretiva-lab-pink-v1-icon-1024.png") -Size 1024
Write-InstallIcon -DestinationPath (Join-Path $iconDirectory "fretiva-lab-pink-v1-apple-touch-icon.png") -Size 180
Write-InstallIcon -DestinationPath (Join-Path $iconDirectory "fretiva-lab-pink-v1-icon-192.png") -Size 192
Write-InstallIcon -DestinationPath (Join-Path $iconDirectory "fretiva-lab-pink-v1-icon-512.png") -Size 512
Write-InstallIcon -DestinationPath (Join-Path $iconDirectory "fretiva-lab-pink-v1-favicon-16.png") -Size 16
Write-InstallIcon -DestinationPath (Join-Path $iconDirectory "fretiva-lab-pink-v1-favicon-32.png") -Size 32
Write-InstallIcon -DestinationPath (Join-Path $iconDirectory "fretiva-lab-pink-v1-favicon-48.png") -Size 48

# A centered square at 56% fits entirely in the 40%-radius safe circle.
# Preserve the entire source, with opaque white padding to every edge.
Write-InstallIcon -DestinationPath (Join-Path $iconDirectory "fretiva-lab-pink-v1-icon-maskable-192.png") -Size 192 -ArtworkScale 0.56
Write-InstallIcon -DestinationPath (Join-Path $iconDirectory "fretiva-lab-pink-v1-icon-maskable-512.png") -Size 512 -ArtworkScale 0.56

$fretivaFaviconPath = Join-Path $publicDirectory "fretiva-lab-pink-v1-favicon.ico"
Write-PngIco -DestinationPath $fretivaFaviconPath -PngPaths @(
  (Join-Path $iconDirectory "fretiva-lab-pink-v1-favicon-16.png"),
  (Join-Path $iconDirectory "fretiva-lab-pink-v1-favicon-32.png"),
  (Join-Path $iconDirectory "fretiva-lab-pink-v1-favicon-48.png")
)

$aliases = @{
  "fretiva-lab-pink-v1-icon-1024.png" = @("just-play-icon-1024.png")
  "fretiva-lab-pink-v1-apple-touch-icon.png" = @("apple-touch-icon.png", "just-play-apple-touch-icon.png")
  "fretiva-lab-pink-v1-icon-192.png" = @("icon-192.png", "just-play-icon-192.png")
  "fretiva-lab-pink-v1-icon-512.png" = @("icon-512.png", "just-play-icon-512.png")
  "fretiva-lab-pink-v1-icon-maskable-192.png" = @("icon-maskable-192.png", "just-play-icon-maskable-192.png")
  "fretiva-lab-pink-v1-icon-maskable-512.png" = @("icon-maskable-512.png", "just-play-icon-maskable-512.png")
  "fretiva-lab-pink-v1-favicon-32.png" = @("favicon-32.png", "just-play-favicon-32.png")
  "fretiva-lab-pink-v1-favicon-48.png" = @("favicon-48.png", "just-play-favicon-48.png")
}

foreach ($entry in $aliases.GetEnumerator()) {
  foreach ($alias in (@($entry.Value) + @($entry.Key.Replace("fretiva-lab-pink-v1-", "fretiva-lab-")))) {
    [System.IO.File]::Copy(
      (Join-Path $iconDirectory $entry.Key),
      (Join-Path $iconDirectory $alias),
      $true
    )
  }
}

[System.IO.File]::Copy($fretivaFaviconPath, (Join-Path $publicDirectory "favicon.ico"), $true)
[System.IO.File]::Copy($fretivaFaviconPath, (Join-Path $publicDirectory "just-play-favicon.ico"), $true)

[System.IO.File]::Copy($fretivaFaviconPath, (Join-Path $publicDirectory "fretiva-lab-favicon.ico"), $true)
