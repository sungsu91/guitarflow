"""Extract and align the ten supplied coastal net-fisher animation frames.

The source is a two-row, five-column RGBA presentation sheet. Frame labels and
stray pixels are removed by keeping the largest visible component in each
generous cell crop. Every pose is then placed on one shared transparent canvas,
using the yellow hat as the horizontal character anchor and the lowest visible
pixel as the standing baseline. This keeps the fisherman steady while the net
opens across a much wider area.
"""

from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter


SOURCE_SIZE = (1536, 1024)
COLUMN_COUNT = 5
ROW_COUNT = 2
CROP_PADDING_X = 120
CROP_PADDING_Y = 22
FRAME_SIZE = (640, 512)
HAT_ANCHOR_X = 220
FOOT_BASELINE = 500
VISIBLE_ALPHA_THRESHOLD = 8


def find_components(mask: Image.Image) -> list[list[int]]:
    width, height = mask.size
    pixels = mask.load()
    visited = bytearray(width * height)
    components: list[list[int]] = []

    for start_y in range(height):
        for start_x in range(width):
            start_index = start_y * width + start_x
            if visited[start_index] or pixels[start_x, start_y] == 0:
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
                    if visited[index] or pixels[next_x, next_y] == 0:
                        continue
                    visited[index] = 1
                    queue.append((next_x, next_y))
            components.append(component)
    return components


def keep_largest_visible_component(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    alpha = rgba.getchannel("A")
    visible = alpha.point(lambda value: 255 if value > VISIBLE_ALPHA_THRESHOLD else 0)
    components = find_components(visible)
    if not components:
        raise ValueError("Net-fisher cell contains no visible component")

    width, height = rgba.size
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


def get_hat_anchor_x(image: Image.Image) -> float:
    rgba = image.convert("RGBA")
    red, green, blue, alpha = rgba.split()
    red_pixels = red.load()
    green_pixels = green.load()
    blue_pixels = blue.load()
    alpha_pixels = alpha.load()
    mask = Image.new("L", rgba.size, 0)
    mask_pixels = mask.load()

    for y in range(rgba.height):
        for x in range(rgba.width):
            if (
                alpha_pixels[x, y] > VISIBLE_ALPHA_THRESHOLD
                and red_pixels[x, y] >= 150
                and 65 <= green_pixels[x, y] <= 205
                and blue_pixels[x, y] <= 105
                and red_pixels[x, y] >= green_pixels[x, y] + 24
            ):
                mask_pixels[x, y] = 255

    components = [component for component in find_components(mask) if len(component) >= 20]
    if not components:
        bounds = rgba.getchannel("A").getbbox()
        if bounds is None:
            raise ValueError("Net-fisher pose contains no visible pixels")
        return (bounds[0] + bounds[2]) / 2

    width = rgba.width
    hat = max(components, key=len)
    return sum(index % width for index in hat) / len(hat)


def fit_to_shared_canvas(image: Image.Image) -> Image.Image:
    bounds = image.getchannel("A").getbbox()
    if bounds is None:
        raise ValueError("Net-fisher pose contains no visible pixels")
    pose = image.crop(bounds)
    hat_x = get_hat_anchor_x(image) - bounds[0]
    destination_x = round(HAT_ANCHOR_X - hat_x)
    destination_y = FOOT_BASELINE - pose.height

    if (
        destination_x < 0
        or destination_y < 0
        or destination_x + pose.width > FRAME_SIZE[0]
        or destination_y + pose.height > FRAME_SIZE[1]
    ):
        raise ValueError(
            "Aligned net-fisher pose exceeds the shared frame: "
            f"pose={pose.size}, destination=({destination_x}, {destination_y})"
        )

    frame = Image.new("RGBA", FRAME_SIZE, (0, 0, 0, 0))
    frame.alpha_composite(pose, (destination_x, destination_y))
    return frame


def extract_frames(source: Path, destination: Path) -> None:
    sheet = Image.open(source).convert("RGBA")
    if sheet.size != SOURCE_SIZE:
        raise ValueError(f"Unexpected net-fisher source size: {sheet.size}")
    destination.mkdir(parents=True, exist_ok=True)

    frame_number = 1
    for row in range(ROW_COUNT):
        cell_top = round(row * sheet.height / ROW_COUNT)
        cell_bottom = round((row + 1) * sheet.height / ROW_COUNT)
        for column in range(COLUMN_COUNT):
            cell_left = round(column * sheet.width / COLUMN_COUNT)
            cell_right = round((column + 1) * sheet.width / COLUMN_COUNT)
            crop_box = (
                max(0, cell_left - CROP_PADDING_X),
                max(0, cell_top - CROP_PADDING_Y),
                min(sheet.width, cell_right + CROP_PADDING_X),
                min(sheet.height, cell_bottom + CROP_PADDING_Y),
            )
            cell = sheet.crop(crop_box)
            frame = fit_to_shared_canvas(keep_largest_visible_component(cell))
            frame.save(destination / f"net-fisher-cast-{frame_number:02d}.png", optimize=True)
            frame_number += 1


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    extract_frames(args.source, args.destination)


if __name__ == "__main__":
    main()
