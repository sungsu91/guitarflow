param(
  [Parameter(Mandatory = $true)]
  [string]$PanoramaSky,
  [Parameter(Mandatory = $true)]
  [string]$EnvironmentGarden,
  [Parameter(Mandatory = $true)]
  [string]$EnvironmentBridge,
  [Parameter(Mandatory = $true)]
  [string]$WaterwheelRotor,
  [Parameter(Mandatory = $true)]
  [string]$WaterwheelSheet,
  [Parameter(Mandatory = $true)]
  [string]$WaterfallSheet,
  [Parameter(Mandatory = $true)]
  [string]$WillowForeground,
  [Parameter(Mandatory = $true)]
  [string]$LanternGlowMask,
  [Parameter(Mandatory = $true)]
  [string]$LanternGlow,
  [string]$WillowRear = "",
  [string]$OutputDirectory = (Join-Path $PSScriptRoot "..\public\assets\maps\three-d-lab\river-garden-v1")
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

function Assert-SourceImage {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,
    [Parameter(Mandatory = $true)]
    [int]$Width,
    [Parameter(Mandatory = $true)]
    [int]$Height,
    [Parameter(Mandatory = $true)]
    [bool]$RequiresAlpha
  )

  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    throw "Missing River Garden source image: $Path"
  }
  if ((Get-Item -LiteralPath $Path).Length -le 0) {
    throw "River Garden source image is empty: $Path"
  }

  $bitmap = [System.Drawing.Bitmap]::new($Path)
  try {
    if ($bitmap.Width -ne $Width -or $bitmap.Height -ne $Height) {
      throw "Unexpected dimensions for $Path. Expected ${Width}x${Height}, received $($bitmap.Width)x$($bitmap.Height)."
    }
    $hasAlpha = [System.Drawing.Image]::IsAlphaPixelFormat($bitmap.PixelFormat)
    if ($RequiresAlpha -and -not $hasAlpha) {
      throw "Expected a real alpha channel in $Path."
    }
    [pscustomobject]@{
      Alpha = $hasAlpha
      Height = $bitmap.Height
      Name = [System.IO.Path]::GetFileName($Path)
      Width = $bitmap.Width
    }
  }
  finally {
    $bitmap.Dispose()
  }
}

$sources = @(
  @{ Path = $PanoramaSky; Name = "panorama_sky_01_rgb.png"; Width = 1774; Height = 887; Alpha = $false }
  @{ Path = $EnvironmentGarden; Name = "environment_room_garden_rgba.png"; Width = 1672; Height = 941; Alpha = $true }
  @{ Path = $EnvironmentBridge; Name = "environment_room_bridge_rgba.png"; Width = 1672; Height = 941; Alpha = $true }
  @{ Path = $WaterwheelRotor; Name = "waterwheel_rotor_rgba.png"; Width = 256; Height = 256; Alpha = $true }
  @{ Path = $WaterwheelSheet; Name = "waterwheel_12f_rgba.png"; Width = 3072; Height = 256; Alpha = $true }
  @{ Path = $WaterfallSheet; Name = "waterfall_8f_rgba.png"; Width = 2048; Height = 682; Alpha = $true }
  @{ Path = $WillowForeground; Name = "willow_foreground_rgba.png"; Width = 1672; Height = 941; Alpha = $true }
  @{ Path = $LanternGlowMask; Name = "lantern_glow_mask.png"; Width = 256; Height = 256; Alpha = $false }
  @{ Path = $LanternGlow; Name = "lantern_glow_rgba.png"; Width = 256; Height = 256; Alpha = $true }
)

$audit = foreach ($source in $sources) {
  Assert-SourceImage -Path $source.Path -Width $source.Width -Height $source.Height -RequiresAlpha $source.Alpha
}

$resolvedOutput = [System.IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Path $resolvedOutput -Force | Out-Null

foreach ($source in $sources) {
  Copy-Item -LiteralPath $source.Path -Destination (Join-Path $resolvedOutput $source.Name) -Force
}

if ($WillowRear) {
  if ((Test-Path -LiteralPath $WillowRear -PathType Leaf) -and (Get-Item -LiteralPath $WillowRear).Length -gt 0) {
    $rearAudit = Assert-SourceImage -Path $WillowRear -Width 1672 -Height 941 -RequiresAlpha $true
    Copy-Item -LiteralPath $WillowRear -Destination (Join-Path $resolvedOutput "willow_rear_rgba.png") -Force
    $audit += $rearAudit
  }
  else {
    Write-Warning "willow_rear_rgba.png is unavailable or empty; the garden environment shell will supply the rear willow layer."
  }
}

$audit | Format-Table -AutoSize
Write-Output "River Garden assets prepared in: $resolvedOutput"
