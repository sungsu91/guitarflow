param(
  [Parameter(Mandatory = $true)]
  [string]$ArchivePath,
  [string]$OutputDirectory = (Join-Path $PSScriptRoot "..\public\assets\maps\three-d-lab\river-garden-v2")
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.IO.Compression.FileSystem

$specifications = @(
  @{ Name = "environment_room_close_rgba.png"; Width = 1672; Height = 941; Alpha = $true }
  @{ Name = "water_floor_river_rgb.png"; Width = 1672; Height = 941; Alpha = $false }
  @{ Name = "foreground_riverbank_rgba.png"; Width = 1907; Height = 825; Alpha = $true }
)

if (-not (Test-Path -LiteralPath $ArchivePath -PathType Leaf)) {
  throw "Missing River Garden V2 archive: $ArchivePath"
}

$resolvedOutput = [System.IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Path $resolvedOutput -Force | Out-Null

$archive = [System.IO.Compression.ZipFile]::OpenRead($ArchivePath)
try {
  $audit = foreach ($specification in $specifications) {
    $entry = $archive.Entries | Where-Object {
      $_.Name -eq $specification.Name -and $_.Length -gt 0
    } | Select-Object -First 1
    if (-not $entry) {
      throw "Missing River Garden V2 asset in archive: $($specification.Name)"
    }

    $destination = Join-Path $resolvedOutput $specification.Name
    $entryStream = $entry.Open()
    $destinationStream = [System.IO.File]::Create($destination)
    try {
      $entryStream.CopyTo($destinationStream)
    }
    finally {
      $destinationStream.Dispose()
      $entryStream.Dispose()
    }

    $bitmap = [System.Drawing.Bitmap]::new($destination)
    try {
      if ($bitmap.Width -ne $specification.Width -or $bitmap.Height -ne $specification.Height) {
        throw "Unexpected dimensions for $($specification.Name). Expected $($specification.Width)x$($specification.Height), received $($bitmap.Width)x$($bitmap.Height)."
      }
      $hasAlpha = [System.Drawing.Image]::IsAlphaPixelFormat($bitmap.PixelFormat)
      if ($specification.Alpha -and -not $hasAlpha) {
        throw "Expected a real alpha channel in $($specification.Name)."
      }

      [pscustomobject]@{
        Alpha = $hasAlpha
        Bytes = (Get-Item -LiteralPath $destination).Length
        Height = $bitmap.Height
        Name = $specification.Name
        Width = $bitmap.Width
      }
    }
    finally {
      $bitmap.Dispose()
    }
  }
}
finally {
  $archive.Dispose()
}

$audit | Format-Table -AutoSize
Write-Output "River Garden V2 assets prepared in: $resolvedOutput"
