"""Extract the five park wood-plank floor tiles from the supplied source sheet.

The source PNG has a baked light checkerboard rather than transparency.  This
script detects the five long painted objects, keeps their original RGB pixels,
and builds a feathered alpha silhouette without asking an image model to redraw
the art.  Every output uses the same 768 x 360 canvas so map-editor placement
does not jump between variants.
"""

from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


OUTPUT_SIZE = (768, 360)
MIN_ROW_FOREGROUND = 30
EXPECTED_TILE_COUNT = 5


def contiguous_ranges(indices: np.ndarray) -> list[tuple[int, int]]:
    if indices.size == 0:
        return []
    split_points = np.where(np.diff(indices) > 1)[0] + 1
    return [(int(group[0]), int(group[-1])) for group in np.split(indices, split_points)]


def largest_component(mask: np.ndarray) -> np.ndarray:
    height, width = mask.shape
    visited = np.zeros_like(mask, dtype=bool)
    best: list[tuple[int, int]] = []

    for start_y, start_x in zip(*np.where(mask & ~visited), strict=True):
        if visited[start_y, start_x]:
            continue
        queue: deque[tuple[int, int]] = deque([(int(start_y), int(start_x))])
        visited[start_y, start_x] = True
        component: list[tuple[int, int]] = []

        while queue:
            y, x = queue.popleft()
            component.append((y, x))
            for next_y, next_x in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                if (
                    0 <= next_y < height
                    and 0 <= next_x < width
                    and mask[next_y, next_x]
                    and not visited[next_y, next_x]
                ):
                    visited[next_y, next_x] = True
                    queue.append((next_y, next_x))

        if len(component) > len(best):
            best = component

    result = np.zeros_like(mask, dtype=bool)
    if best:
        ys, xs = zip(*best, strict=True)
        result[np.asarray(ys), np.asarray(xs)] = True
    return result


def decontaminate_translucent_rgb(rgba: Image.Image) -> Image.Image:
    """Replace matte-colored translucent pixels with the nearest opaque color."""
    pixels = np.asarray(rgba).copy()
    alpha = pixels[:, :, 3]
    active = alpha > 0
    known = alpha >= 250
    height, width = alpha.shape
    queue: deque[tuple[int, int]] = deque(
        (int(y), int(x)) for y, x in zip(*np.where(known), strict=True)
    )

    while queue:
        y, x = queue.popleft()
        for next_y, next_x in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if (
                0 <= next_y < height
                and 0 <= next_x < width
                and active[next_y, next_x]
                and not known[next_y, next_x]
            ):
                pixels[next_y, next_x, :3] = pixels[y, x, :3]
                known[next_y, next_x] = True
                queue.append((next_y, next_x))

    return Image.fromarray(pixels, mode="RGBA")


def detect_foreground(rgb: np.ndarray) -> np.ndarray:
    values = rgb.astype(np.int16)
    maximum = values.max(axis=2)
    minimum = values.min(axis=2)
    chroma = maximum - minimum
    luminance = values.mean(axis=2)

    # The baked checker and the soft shadow painted onto it are both neutral.
    # Saturated edge pixels belong to the art; only genuinely dark neutral
    # pixels are retained as well (wood seams and shaded stone details).
    return (chroma > 8) | (luminance < 205)


def create_tile(source: Image.Image, foreground: np.ndarray, row_range: tuple[int, int]) -> Image.Image:
    width, height = source.size
    top = max(0, row_range[0] - 10)
    bottom = min(height, row_range[1] + 11)

    local_mask = foreground[top:bottom]
    closed = Image.fromarray(local_mask.astype(np.uint8) * 255, mode="L")
    closed = closed.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.MinFilter(9))
    component = largest_component(np.asarray(closed) >= 128)

    # Restore the original detailed seed at the silhouette edge.  The light
    # checker was baked into antialiased edge pixels, so only the deep interior
    # stays fully opaque and the outer seven-pixel band receives a color-based
    # confidence alpha before a sub-pixel feather.
    component |= local_mask
    component_image = Image.fromarray(component.astype(np.uint8) * 255, mode="L")
    core = np.asarray(component_image.filter(ImageFilter.MinFilter(15))) >= 128

    local_rgb = np.asarray(source)[top:bottom].astype(np.int16)
    local_chroma = local_rgb.max(axis=2) - local_rgb.min(axis=2)
    edge_confidence = np.clip((local_chroma - 5) / 45, 0, 1)
    alpha_values = np.where(core, 255, np.where(component, edge_confidence * 255, 0)).astype(np.uint8)
    alpha = Image.fromarray(alpha_values, mode="L").filter(ImageFilter.GaussianBlur(0.55))

    ys, xs = np.where(component)
    if xs.size == 0:
        raise ValueError(f"No tile silhouette detected in rows {row_range}")

    left = max(0, int(xs.min()) - 14)
    right = min(width, int(xs.max()) + 15)
    crop_box = (left, 0, right, bottom - top)

    rgba = source.crop((0, top, width, bottom)).convert("RGBA")
    rgba.putalpha(alpha)
    rgba = decontaminate_translucent_rgb(rgba)
    rgba = rgba.crop(crop_box)

    if rgba.width > OUTPUT_SIZE[0] or rgba.height > OUTPUT_SIZE[1]:
        raise ValueError(f"Detected tile {rgba.size} does not fit {OUTPUT_SIZE}")

    canvas = Image.new("RGBA", OUTPUT_SIZE, (0, 0, 0, 0))
    offset = ((OUTPUT_SIZE[0] - rgba.width) // 2, (OUTPUT_SIZE[1] - rgba.height) // 2)
    canvas.alpha_composite(rgba, offset)
    return canvas


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output_dir", type=Path)
    args = parser.parse_args()

    source = Image.open(args.source).convert("RGB")
    foreground = detect_foreground(np.asarray(source))
    row_counts = foreground.sum(axis=1)
    row_ranges = contiguous_ranges(np.where(row_counts > MIN_ROW_FOREGROUND)[0])
    if len(row_ranges) != EXPECTED_TILE_COUNT:
        raise ValueError(f"Expected {EXPECTED_TILE_COUNT} tiles, detected row ranges {row_ranges}")

    args.output_dir.mkdir(parents=True, exist_ok=True)
    tiles = [create_tile(source, foreground, row_range) for row_range in row_ranges]
    for index, tile in enumerate(tiles, start=1):
        tile.save(args.output_dir / f"park-wood-plank-{index:02d}.png", optimize=True)

    contact_sheet = Image.new("RGBA", (OUTPUT_SIZE[0], OUTPUT_SIZE[1] * len(tiles)), (0, 0, 0, 0))
    for index, tile in enumerate(tiles):
        contact_sheet.alpha_composite(tile, (0, OUTPUT_SIZE[1] * index))
    contact_sheet.save(args.output_dir / "park-wood-planks-contact-sheet.png", optimize=True)

    print(f"Detected row ranges: {row_ranges}")
    print(f"Wrote {len(tiles)} RGBA tiles at {OUTPUT_SIZE[0]}x{OUTPUT_SIZE[1]}")


if __name__ == "__main__":
    main()
