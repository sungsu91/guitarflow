"""Extract sixteen row-major border-collie acrobat frames.

The supplied 1536x1024 sheet is a four-by-four grid. Each source cell is kept
at its original size so the authored jump height and landing baseline remain
stable. A connected-alpha pass removes the detached frame-number badge and
stray transparent-sheet fragments without repainting the dog artwork.
"""

from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter


SOURCE_SIZE = (1536, 1024)
GRID_COLUMNS = 4
GRID_ROWS = 4
FRAME_SIZE = (384, 256)
VISIBLE_ALPHA_THRESHOLD = 16


def extract_light_checkerboard_alpha(image: Image.Image) -> Image.Image:
    """Turn the generated neutral checkerboard into alpha without recoloring."""
    rgb = image.convert("RGB")
    rgba = rgb.convert("RGBA")
    alpha = Image.new("L", rgb.size, 0)
    rgb_pixels = rgb.load()
    alpha_pixels = alpha.load()

    for y in range(rgb.height):
        for x in range(rgb.width):
            red, green, blue = rgb_pixels[x, y]
            channel_min = min(red, green, blue)
            chroma = max(red, green, blue) - channel_min
            color_alpha = max(0, chroma - 2) * 18
            dark_alpha = max(0, 240 - channel_min) * 10
            alpha_pixels[x, y] = min(255, max(color_alpha, dark_alpha))

    rgba.putalpha(alpha.filter(ImageFilter.GaussianBlur(0.35)))
    return rgba


def keep_largest_visible_component(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    width, height = rgba.size
    alpha = rgba.getchannel("A")
    alpha_pixels = alpha.load()
    visited = bytearray(width * height)
    largest_component: list[int] = []

    for start_y in range(height):
        for start_x in range(width):
            start_index = start_y * width + start_x
            if visited[start_index] or alpha_pixels[start_x, start_y] <= VISIBLE_ALPHA_THRESHOLD:
                continue
            visited[start_index] = 1
            queue: deque[tuple[int, int]] = deque([(start_x, start_y)])
            component: list[int] = []
            while queue:
                x, y = queue.popleft()
                component.append(y * width + x)
                for next_x, next_y in (
                    (x - 1, y - 1), (x, y - 1), (x + 1, y - 1),
                    (x - 1, y), (x + 1, y),
                    (x - 1, y + 1), (x, y + 1), (x + 1, y + 1),
                ):
                    if next_x < 0 or next_x >= width or next_y < 0 or next_y >= height:
                        continue
                    index = next_y * width + next_x
                    if visited[index] or alpha_pixels[next_x, next_y] <= VISIBLE_ALPHA_THRESHOLD:
                        continue
                    visited[index] = 1
                    queue.append((next_x, next_y))
            if len(component) > len(largest_component):
                largest_component = component

    if not largest_component:
        raise ValueError("Border-collie cell contains no visible component")

    core = Image.new("L", rgba.size, 0)
    core_pixels = core.load()
    for index in largest_component:
        core_pixels[index % width, index // width] = 255
    edge_safe_mask = core.filter(ImageFilter.MaxFilter(5))

    cleaned_alpha = rgba.getchannel("A")
    cleaned_alpha_pixels = cleaned_alpha.load()
    mask_pixels = edge_safe_mask.load()
    for y in range(height):
        for x in range(width):
            if mask_pixels[x, y] == 0:
                cleaned_alpha_pixels[x, y] = 0
    rgba.putalpha(cleaned_alpha)
    return rgba


def extract_frames(source: Path, destination: Path) -> None:
    sheet = Image.open(source)
    if sheet.size != SOURCE_SIZE:
        raise ValueError(f"Unexpected border-collie source size: {sheet.size}")
    has_useful_alpha = "A" in sheet.getbands() and sheet.getchannel("A").getextrema()[0] == 0
    sheet = sheet.convert("RGBA") if has_useful_alpha else extract_light_checkerboard_alpha(sheet)
    destination.mkdir(parents=True, exist_ok=True)

    frame_index = 1
    for row in range(GRID_ROWS):
        for column in range(GRID_COLUMNS):
            left = column * FRAME_SIZE[0]
            top = row * FRAME_SIZE[1]
            cell = sheet.crop((left, top, left + FRAME_SIZE[0], top + FRAME_SIZE[1]))
            frame = keep_largest_visible_component(cell)
            frame.save(destination / f"border-collie-acrobat-{frame_index:02d}.png", optimize=True)
            frame_index += 1


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    extract_frames(args.source, args.destination)


if __name__ == "__main__":
    main()
