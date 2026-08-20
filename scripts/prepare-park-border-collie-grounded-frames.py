"""Extract a 4/4/5/5/4 border-collie action montage into 22 RGBA frames.

The cleaned source uses five horizontal action bands with a variable number of
poses. Connected alpha components identify each dog without relying on a false
uniform grid. Source-row vertical placement is retained so grounded paws,
airborne poses, rolling, and landing recovery keep their authored heights.
"""

from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter


SOURCE_SIZE = (1536, 1024)
ROW_COUNTS = (4, 4, 5, 5, 4)
FRAME_SIZE = (384, 256)
VISIBLE_ALPHA_THRESHOLD = 16
POSE_SCALE = 1.1


def extract_light_checkerboard_alpha(image: Image.Image) -> Image.Image:
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


def visible_components(image: Image.Image) -> list[list[int]]:
    width, height = image.size
    alpha_pixels = image.getchannel("A").load()
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
    return components


def component_bounds(component: list[int], width: int) -> tuple[int, int, int, int]:
    xs = [index % width for index in component]
    ys = [index // width for index in component]
    return min(xs), min(ys), max(xs) + 1, max(ys) + 1


def isolate_component(image: Image.Image, component: list[int]) -> Image.Image:
    width, _ = image.size
    core = Image.new("L", image.size, 0)
    core_pixels = core.load()
    for index in component:
        core_pixels[index % width, index // width] = 255
    closed_core = core.filter(ImageFilter.MaxFilter(11)).filter(ImageFilter.MinFilter(9))
    edge_safe_mask = closed_core.filter(ImageFilter.MaxFilter(5))
    isolated = image.copy()
    filled_alpha = ImageChops.lighter(isolated.getchannel("A"), closed_core)
    isolated.putalpha(ImageChops.multiply(filled_alpha, edge_safe_mask))
    return isolated


def fit_pose_to_frame(
    pose: Image.Image,
    source_bounds: tuple[int, int, int, int],
    row_top: int,
    row_bottom: int,
) -> Image.Image:
    left, top, right, bottom = source_bounds
    cropped = pose.crop((left, top, right, bottom))
    scale = min(
        POSE_SCALE,
        (FRAME_SIZE[0] - 6) / cropped.width,
        (FRAME_SIZE[1] - 6) / cropped.height,
    )
    resized = cropped.resize(
        (round(cropped.width * scale), round(cropped.height * scale)),
        Image.Resampling.LANCZOS,
    )
    row_height = row_bottom - row_top
    scaled_row_height = row_height * scale
    row_offset_y = (FRAME_SIZE[1] - scaled_row_height) / 2
    target_y = round(row_offset_y + (top - row_top) * scale)
    target_y = min(max(0, target_y), FRAME_SIZE[1] - resized.height)
    target_x = (FRAME_SIZE[0] - resized.width) // 2
    frame = Image.new("RGBA", FRAME_SIZE, (0, 0, 0, 0))
    frame.alpha_composite(resized, (target_x, target_y))
    return frame


def extract_frames(source: Path, destination: Path) -> None:
    sheet = Image.open(source)
    if sheet.size != SOURCE_SIZE:
        raise ValueError(f"Unexpected grounded border-collie source size: {sheet.size}")
    has_useful_alpha = "A" in sheet.getbands() and sheet.getchannel("A").getextrema()[0] == 0
    sheet = sheet.convert("RGBA") if has_useful_alpha else extract_light_checkerboard_alpha(sheet)
    destination.mkdir(parents=True, exist_ok=True)

    row_edges = [round(index * sheet.height / len(ROW_COUNTS)) for index in range(len(ROW_COUNTS) + 1)]
    all_components = visible_components(sheet)
    frame_index = 1

    for row_index, expected_count in enumerate(ROW_COUNTS):
        row_top = row_edges[row_index]
        row_bottom = row_edges[row_index + 1]
        candidates = []
        for component in all_components:
            bounds = component_bounds(component, sheet.width)
            center_y = (bounds[1] + bounds[3]) / 2
            if row_top <= center_y < row_bottom:
                candidates.append((component, bounds))
        selected = sorted(candidates, key=lambda entry: len(entry[0]), reverse=True)[:expected_count]
        if len(selected) != expected_count:
            raise ValueError(
                f"Expected {expected_count} poses in row {row_index + 1}, found {len(selected)}",
            )
        selected.sort(key=lambda entry: (entry[1][0] + entry[1][2]) / 2)
        for component, bounds in selected:
            pose = isolate_component(sheet, component)
            frame = fit_pose_to_frame(pose, bounds, row_top, row_bottom)
            frame.save(destination / f"border-collie-grounded-roll-{frame_index:02d}.png", optimize=True)
            frame_index += 1


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    extract_frames(args.source, args.destination)


if __name__ == "__main__":
    main()
