param(
  [Parameter(Mandatory = $true)]
  [string]$Panorama,
  [Parameter(Mandatory = $true)]
  [string]$PavilionWillow,
  [Parameter(Mandatory = $true)]
  [string]$WaterwheelWaterfall,
  [Parameter(Mandatory = $true)]
  [string]$LotusRocks,
  [Parameter(Mandatory = $true)]
  [string]$SlashSheet,
  [Parameter(Mandatory = $true)]
  [string]$ImpactSheet,
  [string]$OutputDirectory = (Join-Path $PSScriptRoot "..\public\assets\maps\three-d-lab\moonlit-canal")
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

if (-not ("MoonlitCanalAssetProcessor" -as [type])) {
  $drawingDirectory = [System.IO.Path]::GetDirectoryName([System.Drawing.Bitmap].Assembly.Location)
  $drawingAssemblies = @(
    [System.Drawing.Bitmap].Assembly.Location
    [System.Drawing.Rectangle].Assembly.Location
    (Join-Path $drawingDirectory "System.Runtime.dll")
    (Join-Path $drawingDirectory "System.Private.CoreLib.dll")
    (Join-Path $drawingDirectory "System.Collections.dll")
    (Join-Path $drawingDirectory "System.Runtime.InteropServices.dll")
    (Join-Path $drawingDirectory "System.IO.FileSystem.dll")
    (Join-Path $drawingDirectory "System.Private.Windows.GdiPlus.dll")
    (Join-Path $drawingDirectory "System.Private.Windows.Core.dll")
  )
  Add-Type -ReferencedAssemblies $drawingAssemblies -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;

public static class MoonlitCanalAssetProcessor
{
    private static Bitmap LoadArgb(string path)
    {
        using (var source = new Bitmap(path))
        {
            var copy = new Bitmap(source.Width, source.Height, PixelFormat.Format32bppArgb);
            using (var graphics = Graphics.FromImage(copy))
            {
                graphics.CompositingMode = System.Drawing.Drawing2D.CompositingMode.SourceCopy;
                graphics.DrawImageUnscaled(source, 0, 0);
            }
            return copy;
        }
    }

    private static bool IsCheckerPixel(byte blue, byte green, byte red)
    {
        int maximum = Math.Max(red, Math.Max(green, blue));
        int minimum = Math.Min(red, Math.Min(green, blue));
        int average = (red + green + blue) / 3;
        return average >= 225 && maximum - minimum <= 24;
    }

    private static bool IsInteriorCheckerPixel(byte blue, byte green, byte red)
    {
        int maximum = Math.Max(red, Math.Max(green, blue));
        int minimum = Math.Min(red, Math.Min(green, blue));
        int average = (red + green + blue) / 3;
        return average >= 232 && maximum - minimum <= 12;
    }

    private static void TryEnqueue(
        int x,
        int y,
        int width,
        int height,
        int stride,
        byte[] pixels,
        bool[] visited,
        int[] queue,
        ref int tail)
    {
        if (x < 0 || x >= width || y < 0 || y >= height) return;
        int index = y * width + x;
        if (visited[index]) return;
        int pixelIndex = y * stride + x * 4;
        if (!IsCheckerPixel(pixels[pixelIndex], pixels[pixelIndex + 1], pixels[pixelIndex + 2])) return;
        visited[index] = true;
        queue[tail++] = index;
    }

    private static Bitmap RestoreAlpha(string input)
    {
        var bitmap = LoadArgb(input);
        var rectangle = new Rectangle(0, 0, bitmap.Width, bitmap.Height);
        var data = bitmap.LockBits(rectangle, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
        try
        {
            int length = Math.Abs(data.Stride) * bitmap.Height;
            var pixels = new byte[length];
            System.Runtime.InteropServices.Marshal.Copy(data.Scan0, pixels, 0, length);
            var visited = new bool[bitmap.Width * bitmap.Height];
            var queue = new int[bitmap.Width * bitmap.Height];
            int head = 0;
            int tail = 0;

            for (int x = 0; x < bitmap.Width; x++)
            {
                TryEnqueue(x, 0, bitmap.Width, bitmap.Height, data.Stride, pixels, visited, queue, ref tail);
                TryEnqueue(x, bitmap.Height - 1, bitmap.Width, bitmap.Height, data.Stride, pixels, visited, queue, ref tail);
            }
            for (int y = 0; y < bitmap.Height; y++)
            {
                TryEnqueue(0, y, bitmap.Width, bitmap.Height, data.Stride, pixels, visited, queue, ref tail);
                TryEnqueue(bitmap.Width - 1, y, bitmap.Width, bitmap.Height, data.Stride, pixels, visited, queue, ref tail);
            }

            while (head < tail)
            {
                int index = queue[head++];
                int x = index % bitmap.Width;
                int y = index / bitmap.Width;
                int pixelIndex = y * data.Stride + x * 4;
                pixels[pixelIndex + 3] = 0;
                TryEnqueue(x - 1, y, bitmap.Width, bitmap.Height, data.Stride, pixels, visited, queue, ref tail);
                TryEnqueue(x + 1, y, bitmap.Width, bitmap.Height, data.Stride, pixels, visited, queue, ref tail);
                TryEnqueue(x, y - 1, bitmap.Width, bitmap.Height, data.Stride, pixels, visited, queue, ref tail);
                TryEnqueue(x, y + 1, bitmap.Width, bitmap.Height, data.Stride, pixels, visited, queue, ref tail);
            }

            for (int y = 0; y < bitmap.Height; y++)
            {
                for (int x = 0; x < bitmap.Width; x++)
                {
                    int pixelIndex = y * data.Stride + x * 4;
                    if (IsInteriorCheckerPixel(pixels[pixelIndex], pixels[pixelIndex + 1], pixels[pixelIndex + 2]))
                    {
                        pixels[pixelIndex + 3] = 0;
                    }
                }
            }

            System.Runtime.InteropServices.Marshal.Copy(pixels, 0, data.Scan0, length);
        }
        finally
        {
            bitmap.UnlockBits(data);
        }
        return bitmap;
    }

    private static Rectangle VisibleBounds(Bitmap bitmap, Rectangle search)
    {
        int left = search.Right;
        int top = search.Bottom;
        int right = search.Left - 1;
        int bottom = search.Top - 1;
        var fullImage = new Rectangle(0, 0, bitmap.Width, bitmap.Height);
        var data = bitmap.LockBits(fullImage, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
        try
        {
            int length = Math.Abs(data.Stride) * bitmap.Height;
            var pixels = new byte[length];
            System.Runtime.InteropServices.Marshal.Copy(data.Scan0, pixels, 0, length);
            for (int y = search.Top; y < search.Bottom; y++)
            {
                for (int x = search.Left; x < search.Right; x++)
                {
                    int pixelIndex = y * data.Stride + x * 4;
                    if (pixels[pixelIndex + 3] <= 8) continue;
                    left = Math.Min(left, x);
                    right = Math.Max(right, x);
                    top = Math.Min(top, y);
                    bottom = Math.Max(bottom, y);
                }
            }
        }
        finally
        {
            bitmap.UnlockBits(data);
        }
        return right < left || bottom < top
            ? Rectangle.Empty
            : Rectangle.FromLTRB(left, top, right + 1, bottom + 1);
    }

    private static Rectangle Padded(Rectangle bounds, int padding, int width, int height)
    {
        int left = Math.Max(0, bounds.Left - padding);
        int top = Math.Max(0, bounds.Top - padding);
        int right = Math.Min(width, bounds.Right + padding);
        int bottom = Math.Min(height, bounds.Bottom + padding);
        return Rectangle.FromLTRB(left, top, right, bottom);
    }

    private static void Save(Bitmap bitmap, string output)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(output));
        if (File.Exists(output)) File.Delete(output);
        bitmap.Save(output, ImageFormat.Png);
    }

    public static void ProcessCutout(string input, string output, int padding)
    {
        using (var source = RestoreAlpha(input))
        {
            var bounds = VisibleBounds(source, new Rectangle(0, 0, source.Width, source.Height));
            if (bounds.IsEmpty) throw new InvalidOperationException("No visible pixels found in " + input);
            bounds = Padded(bounds, padding, source.Width, source.Height);
            using (var result = source.Clone(bounds, PixelFormat.Format32bppArgb)) Save(result, output);
        }
    }

    public static void SplitClusters(string input, string outputPattern, int clusterCount, int padding)
    {
        using (var source = RestoreAlpha(input))
        {
            for (int index = 0; index < clusterCount; index++)
            {
                int left = (int)Math.Floor(source.Width * index / (double)clusterCount);
                int right = (int)Math.Floor(source.Width * (index + 1) / (double)clusterCount);
                var region = Rectangle.FromLTRB(left, 0, right, source.Height);
                var bounds = VisibleBounds(source, region);
                if (bounds.IsEmpty) throw new InvalidOperationException("No visible pixels found in cluster " + index);
                bounds = Padded(bounds, padding, source.Width, source.Height);
                bounds = Rectangle.Intersect(bounds, region);
                using (var result = source.Clone(bounds, PixelFormat.Format32bppArgb))
                {
                    Save(result, String.Format(outputPattern, index + 1));
                }
            }
        }
    }

    public static void NormalizeSheet(string input, string output, int frameCount, int verticalPadding)
    {
        using (var source = RestoreAlpha(input))
        {
            int top = source.Height;
            int bottom = -1;
            var regions = new Rectangle[frameCount];
            for (int index = 0; index < frameCount; index++)
            {
                int left = (int)Math.Floor(source.Width * index / (double)frameCount);
                int right = (int)Math.Floor(source.Width * (index + 1) / (double)frameCount);
                regions[index] = Rectangle.FromLTRB(left, 0, right, source.Height);
                var bounds = VisibleBounds(source, regions[index]);
                if (!bounds.IsEmpty)
                {
                    top = Math.Min(top, bounds.Top);
                    bottom = Math.Max(bottom, bounds.Bottom - 1);
                }
            }
            if (bottom < top) throw new InvalidOperationException("No visible frames found in " + input);

            top = Math.Max(0, top - verticalPadding);
            bottom = Math.Min(source.Height - 1, bottom + verticalPadding);
            int cellWidth = (int)Math.Ceiling(source.Width / (double)frameCount);
            int cellHeight = bottom - top + 1;
            using (var result = new Bitmap(cellWidth * frameCount, cellHeight, PixelFormat.Format32bppArgb))
            using (var graphics = Graphics.FromImage(result))
            {
                graphics.Clear(Color.Transparent);
                graphics.CompositingMode = System.Drawing.Drawing2D.CompositingMode.SourceCopy;
                graphics.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.NearestNeighbor;
                for (int index = 0; index < frameCount; index++)
                {
                    var region = Rectangle.FromLTRB(regions[index].Left, top, regions[index].Right, bottom + 1);
                    int destinationX = index * cellWidth + (cellWidth - region.Width) / 2;
                    graphics.DrawImage(source, new Rectangle(destinationX, 0, region.Width, cellHeight), region, GraphicsUnit.Pixel);
                }
                Save(result, output);
            }
        }
    }
}
'@
}

$sourceFiles = @($Panorama, $PavilionWillow, $WaterwheelWaterfall, $LotusRocks, $SlashSheet, $ImpactSheet)
foreach ($sourceFile in $sourceFiles) {
  if (-not (Test-Path -LiteralPath $sourceFile -PathType Leaf)) {
    throw "Asset not found: $sourceFile"
  }
}

$resolvedOutput = [System.IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Path $resolvedOutput -Force | Out-Null
Copy-Item -LiteralPath $Panorama -Destination (Join-Path $resolvedOutput "panorama.png") -Force

[MoonlitCanalAssetProcessor]::ProcessCutout(
  $PavilionWillow,
  (Join-Path $resolvedOutput "pavilion-willow.png"),
  12
)
[MoonlitCanalAssetProcessor]::ProcessCutout(
  $WaterwheelWaterfall,
  (Join-Path $resolvedOutput "waterwheel-waterfall.png"),
  12
)
[MoonlitCanalAssetProcessor]::SplitClusters(
  $LotusRocks,
  (Join-Path $resolvedOutput "lotus-rock-{0:D2}.png"),
  4,
  10
)
[MoonlitCanalAssetProcessor]::NormalizeSheet(
  $SlashSheet,
  (Join-Path $resolvedOutput "gold-slash-8x.png"),
  8,
  12
)
[MoonlitCanalAssetProcessor]::NormalizeSheet(
  $ImpactSheet,
  (Join-Path $resolvedOutput "water-impact-8x.png"),
  8,
  12
)

Get-ChildItem -LiteralPath $resolvedOutput -Filter "*.png" |
  Sort-Object Name |
  ForEach-Object {
    $bitmap = [System.Drawing.Bitmap]::new($_.FullName)
    try {
      [PSCustomObject]@{
        Asset = $_.Name
        Width = $bitmap.Width
        Height = $bitmap.Height
        PixelFormat = $bitmap.PixelFormat.ToString()
        Bytes = $_.Length
      }
    }
    finally {
      $bitmap.Dispose()
    }
  } |
  Format-Table -AutoSize
