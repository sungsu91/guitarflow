"""Extract seven clean, baseline-aligned hermit-crab walking frames.

The supplied RGBA source is arranged as seven columns by four rows, but some
painted pixels cross the fractional column boundaries. Each walking cell is
therefore isolated by its largest visible component before being placed on a
shared transparent canvas. This prevents neighbouring crabs from leaking into
the runtime frame while retaining the original antialiased artwork.
"""

from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter


COLUMN_COUNT = 7
SOURCE_ROW_HEIGHT = 256
FRAME_HORIZONTAL_PADDING = 48
FRAME_SIZE = (256, 256)
FOOT_BASELINE = 244
VISIBLE_ALPHA_THRESHOLD = 8


def keep_largest_visible_component(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    width, height = rgba.size
    alpha = rgba.getchannel("A")
    alpha_pixels = alpha.load()
    visited = bytearray(width * height)
    components: list[list[int]] = []

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
            components.append(component)

    if not components:
        raise ValueError("Hermit crab cell contains no visible component")

    core = Image.new("L", rgba.size, 0)
    core_pixels = core.load()
    for index in max(components, key=len):
        core_pixels[index % width, index // width] = 255
    edge_safe_mask = core.filter(ImageFilter.MaxFilter(5))

    output = rgba.copy()
    output_alpha = output.getchannel("A")
    output_alpha_pixels = output_alpha.load()
    mask_pixels = edge_safe_mask.load()
    for y in range(height):
        for x in range(width):
            if mask_pixels[x, y] == 0:
                output_alpha_pixels[x, y] = 0
    output.putalpha(output_alpha)
    return output


def fit_to_shared_canvas(image: Image.Image) -> Image.Image:
    bounds = image.getchannel("A").getbbox()
    if bounds is None:
        raise ValueError("Hermit crab frame contains no visible pixels")
    pose = image.crop(bounds)
    max_width = FRAME_SIZE[0] - 8
    max_height = FOOT_BASELINE - 6
    ratio = min(1.0, max_width / pose.width, max_height / pose.height)
    if ratio < 1:
        pose = pose.resize(
            (round(pose.width * ratio), round(pose.height * ratio)),
            Image.Resampling.LANCZOS,
        )
    frame = Image.new("RGBA", FRAME_SIZE, (0, 0, 0, 0))
    frame.alpha_composite(pose, ((FRAME_SIZE[0] - pose.width) // 2, FOOT_BASELINE - pose.height))
    return frame


def extract_frames(source: Path, destination: Path) -> None:
    sheet = Image.open(source).convert("RGBA")
    if sheet.size != (1536, 1024):
        raise ValueError(f"Unexpected hermit crab source size: {sheet.size}")
    destination.mkdir(parents=True, exist_ok=True)

    for column in range(COLUMN_COUNT):
        cell_left = round(column * sheet.width / COLUMN_COUNT)
        cell_right = round((column + 1) * sheet.width / COLUMN_COUNT)
        left = max(0, cell_left - FRAME_HORIZONTAL_PADDING)
        right = min(sheet.width, cell_right + FRAME_HORIZONTAL_PADDING)
        cell = sheet.crop((left, 0, right, SOURCE_ROW_HEIGHT))
        frame = fit_to_shared_canvas(keep_largest_visible_component(cell))
        frame.save(destination / f"hermit-crab-walk-{column + 1:02d}.png", optimize=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    extract_frames(args.source, args.destination)


if __name__ == "__main__":
    main()
