"""Extract the authored Munchkin montage into 49 transparent frames.

The cleaned sheet has six irregular rows (9/7/7/7/9/10 poses). Several
neighbors touch through tails, dust trails, or action accents, so authored row
cuts keep each pose intact while preserving the small dust and splash details.
"""

from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter


SOURCE_SIZE = (1536, 1024)
FRAME_SIZE = (384, 256)
VISIBLE_ALPHA_THRESHOLD = 80
POSE_SCALE = 1.3

ROW_BANDS = (
    (0, 191),
    (190, 349),
    (349, 505),
    (505, 655),
    (650, 815),
    (790, 1024),
)

ROW_CUTS = (
    (0, 155, 295, 442, 677, 855, 1025, 1205, 1356, 1536),
    (0, 226, 421, 629, 846, 1062, 1282, 1536),
    (0, 215, 430, 640, 920, 1140, 1335, 1536),
    (0, 202, 400, 603, 826, 1020, 1280, 1536),
    (0, 188, 335, 494, 671, 841, 1013, 1189, 1350, 1536),
    (0, 146, 290, 464, 610, 748, 915, 1062, 1203, 1346, 1536),
)


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


def select_pose_components(image: Image.Image, components: list[list[int]]) -> list[list[int]]:
    substantial = [component for component in components if len(component) >= 20]
    if not substantial:
        return []
    main = max(substantial, key=len)
    main_left, main_top, main_right, main_bottom = component_bounds(main, image.width)
    selected = [main]
    for component in substantial:
        if component is main:
            continue
        left, top, right, bottom = component_bounds(component, image.width)
        touches_slot_edge = (
            left <= 1
            or top <= 1
            or right >= image.width - 1
            or bottom >= image.height - 1
        )
        # Irregular montage cuts occasionally catch a paw, tail tip, or dust
        # fleck from the neighboring pose.  Real multi-part dust trails are
        # much larger, so retain those while dropping small edge fragments.
        if touches_slot_edge and len(component) < 1000:
            continue
        center_y = (top + bottom) / 2
        horizontal_gap = max(0, main_left - right, left - main_right)
        if main_top - 28 <= center_y <= main_bottom + 28 and horizontal_gap <= 64:
            selected.append(component)
    return selected


def isolate_components(image: Image.Image, components: list[list[int]]) -> Image.Image:
    width, _ = image.size
    core = Image.new("L", image.size, 0)
    core_pixels = core.load()
    for component in components:
        for index in component:
            core_pixels[index % width, index // width] = 255

    closed_core = core.filter(ImageFilter.MaxFilter(11)).filter(ImageFilter.MinFilter(9))
    edge_safe_mask = closed_core.filter(ImageFilter.MaxFilter(7))
    isolated = image.copy()
    filled_alpha = ImageChops.lighter(isolated.getchannel("A"), closed_core)
    isolated.putalpha(ImageChops.multiply(filled_alpha, edge_safe_mask))
    return isolated


def combined_bounds(components: list[list[int]], width: int) -> tuple[int, int, int, int]:
    bounds = [component_bounds(component, width) for component in components]
    return (
        min(bound[0] for bound in bounds),
        min(bound[1] for bound in bounds),
        max(bound[2] for bound in bounds),
        max(bound[3] for bound in bounds),
    )


def fit_pose_to_frame(pose: Image.Image, bounds: tuple[int, int, int, int]) -> Image.Image:
    left, top, right, bottom = bounds
    padding = 7
    cropped = pose.crop((
        max(0, left - padding),
        max(0, top - padding),
        min(pose.width, right + padding),
        min(pose.height, bottom + padding),
    ))
    scale = min(
        POSE_SCALE,
        (FRAME_SIZE[0] - 8) / cropped.width,
        (FRAME_SIZE[1] - 8) / cropped.height,
    )
    resized = cropped.resize(
        (round(cropped.width * scale), round(cropped.height * scale)),
        Image.Resampling.LANCZOS,
    )
    target_x = (FRAME_SIZE[0] - resized.width) // 2
    target_y = FRAME_SIZE[1] - resized.height - 3
    frame = Image.new("RGBA", FRAME_SIZE, (0, 0, 0, 0))
    frame.alpha_composite(resized, (target_x, target_y))
    return frame


def extract_frames(source: Path, destination: Path) -> None:
    sheet = Image.open(source)
    if sheet.size != SOURCE_SIZE:
        raise ValueError(f"Unexpected Munchkin source size: {sheet.size}")
    has_useful_alpha = "A" in sheet.getbands() and sheet.getchannel("A").getextrema()[0] == 0
    sheet = sheet.convert("RGBA") if has_useful_alpha else extract_light_checkerboard_alpha(sheet)
    destination.mkdir(parents=True, exist_ok=True)

    frame_index = 1
    for row_index, ((row_top, row_bottom), row_cuts) in enumerate(zip(ROW_BANDS, ROW_CUTS)):
        for column_index, (left, right) in enumerate(zip(row_cuts, row_cuts[1:])):
            slot = sheet.crop((left, row_top, right, row_bottom))
            components = select_pose_components(slot, visible_components(slot))
            if not components:
                raise ValueError(
                    f"No Munchkin pose found in row {row_index + 1}, column {column_index + 1}",
                )
            # The final low slide pose begins immediately after the preceding
            # runner's blue speed droplets; those droplets belong to frame 22.
            if frame_index == 23:
                components = [max(components, key=len)]
            isolated = isolate_components(slot, components)
            bounds = combined_bounds(components, slot.width)
            frame = fit_pose_to_frame(isolated, bounds)
            frame.save(destination / f"munchkin-play-{frame_index:02d}.png", optimize=True)
            frame_index += 1

    expected_frames = sum(len(cuts) - 1 for cuts in ROW_CUTS)
    if frame_index - 1 != expected_frames:
        raise ValueError(f"Expected {expected_frames} frames, wrote {frame_index - 1}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    extract_frames(args.source, args.destination)


if __name__ == "__main__":
    main()
