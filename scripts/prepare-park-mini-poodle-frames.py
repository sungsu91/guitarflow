"""Extract fifteen row-major mini-poodle frames onto shared RGBA canvases.

The supplied sheet is arranged as five columns by three rows. Some poses cross
the fractional grid boundaries, so every cell is expanded before its largest
visible component is isolated. The original pixels and alpha are preserved,
then each pose is centered and foot-aligned without repainting the artwork.
"""

from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter


SOURCE_SIZE = (1536, 1024)
GRID_COLUMNS = 5
GRID_ROWS = 3
CELL_PADDING_X = 56
CELL_PADDING_Y = 52
FRAME_SIZE = (352, 352)
FOOT_BASELINE = 344
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
        raise ValueError("Mini-poodle cell contains no visible component")

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
        raise ValueError("Mini-poodle frame contains no visible pixels")
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
    if sheet.size != SOURCE_SIZE:
        raise ValueError(f"Unexpected mini-poodle source size: {sheet.size}")
    destination.mkdir(parents=True, exist_ok=True)

    x_edges = [round(index * sheet.width / GRID_COLUMNS) for index in range(GRID_COLUMNS + 1)]
    y_edges = [round(index * sheet.height / GRID_ROWS) for index in range(GRID_ROWS + 1)]

    frame_index = 1
    for row in range(GRID_ROWS):
        for column in range(GRID_COLUMNS):
            left = max(0, x_edges[column] - CELL_PADDING_X)
            top = max(0, y_edges[row] - CELL_PADDING_Y)
            right = min(sheet.width, x_edges[column + 1] + CELL_PADDING_X)
            bottom = min(sheet.height, y_edges[row + 1] + CELL_PADDING_Y)
            expanded_cell = sheet.crop((left, top, right, bottom))
            frame = fit_to_shared_canvas(keep_largest_visible_component(expanded_cell))
            frame.save(destination / f"mini-poodle-tilt-{frame_index:02d}.png", optimize=True)
            frame_index += 1


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    extract_frames(args.source, args.destination)


if __name__ == "__main__":
    main()
