"""Prepare a fixed park fountain body plus seamless water-only animation frames.

The source montage contains eight authored full-fountain water states across
its first row.  This script keeps the first fountain as one immutable base,
extracts only changing blue/white water pixels from all eight states, and
in-betweens every transition (including the last-to-first transition) to make
a 32-frame seamless loop.  Every output uses the same canvas and foot anchor.
"""

from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter


SOURCE_SIZE = (1536, 1024)
SOURCE_ROW_HEIGHT = 288
OUTPUT_SIZE = (400, 576)
OUTPUT_SCALE = 2
VISIBLE_ALPHA_THRESHOLD = 80
AUTHORED_FRAME_COUNT = 8
INBETWEENS_PER_TRANSITION = 4
TOP_WATER_REGION = (150, 64, 250, 220)
TOP_WATER_CONNECTION_Y = 184
TOP_FINIAL_REGION = (174, 28, 226, 190)
TOP_JET_ACTIVITY_BOX = (165, 88, 235, 178)
TOP_JET_ACTIVITY_PIXELS = 24


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
    core = Image.new("L", image.size, 0)
    core_pixels = core.load()
    for index in component:
        core_pixels[index % image.width, index // image.width] = 255
    edge_mask = core.filter(ImageFilter.MaxFilter(5))
    isolated = image.copy()
    isolated.putalpha(ImageChops.multiply(image.getchannel("A"), edge_mask))
    return isolated


def align_to_output(image: Image.Image, bounds: tuple[int, int, int, int]) -> Image.Image:
    left, top, right, bottom = bounds
    cropped = image.crop((left, top, right, bottom))
    resized = cropped.resize(
        (cropped.width * OUTPUT_SCALE, cropped.height * OUTPUT_SCALE),
        Image.Resampling.LANCZOS,
    )
    target_x = (OUTPUT_SIZE[0] - resized.width) // 2
    target_y = OUTPUT_SIZE[1] - resized.height
    output = Image.new("RGBA", OUTPUT_SIZE, (0, 0, 0, 0))
    output.alpha_composite(resized, (target_x, target_y))
    return output


def remove_floating_top_components(mask: Image.Image) -> None:
    """Drop blue jewel blobs while preserving water connected to the top bowl.

    A rectangular exclusion leaves the rising jet with a visibly square cut.
    Connectivity keeps the authored water silhouette intact and removes only
    isolated blue ornament pixels that would otherwise look like rising balls.
    """
    left, top, right, bottom = TOP_WATER_REGION
    pixels = mask.load()
    visited: set[tuple[int, int]] = set()

    for start_y in range(top, bottom):
        for start_x in range(left, right):
            if (start_x, start_y) in visited or pixels[start_x, start_y] <= 8:
                continue

            queue: deque[tuple[int, int]] = deque([(start_x, start_y)])
            visited.add((start_x, start_y))
            component: list[tuple[int, int]] = []
            connected_to_fountain = False
            while queue:
                x, y = queue.popleft()
                component.append((x, y))
                connected_to_fountain = connected_to_fountain or y >= TOP_WATER_CONNECTION_Y
                for next_x, next_y in (
                    (x - 1, y - 1), (x, y - 1), (x + 1, y - 1),
                    (x - 1, y), (x + 1, y),
                    (x - 1, y + 1), (x, y + 1), (x + 1, y + 1),
                ):
                    if not (left <= next_x < right and top <= next_y < bottom):
                        continue
                    if (next_x, next_y) in visited or pixels[next_x, next_y] <= 8:
                        continue
                    visited.add((next_x, next_y))
                    queue.append((next_x, next_y))

            if not connected_to_fountain:
                for x, y in component:
                    pixels[x, y] = 0


def split_static_finial(static_base: Image.Image) -> tuple[Image.Image, Image.Image]:
    """Keep the authored finial fixed, but outside the permanently visible base."""
    body = static_base.copy()
    body_alpha = body.getchannel("A")
    body_alpha.paste(0, TOP_FINIAL_REGION)
    body.putalpha(body_alpha)

    finial = Image.new("RGBA", OUTPUT_SIZE, (0, 0, 0, 0))
    finial.alpha_composite(static_base.crop(TOP_FINIAL_REGION), TOP_FINIAL_REGION[:2])
    return body, finial


def add_idle_finial(frame: Image.Image, finial: Image.Image) -> Image.Image:
    """Show the original ornament only when the rising top jet is inactive."""
    left, top, right, bottom = TOP_JET_ACTIVITY_BOX
    alpha = frame.getchannel("A")
    active_water_pixels = sum(
        alpha.getpixel((x, y)) > 8
        for y in range(top, bottom)
        for x in range(left, right)
    )
    output = frame.copy()
    if active_water_pixels < TOP_JET_ACTIVITY_PIXELS:
        output.alpha_composite(finial)
    return output


def extract_authored_fountains(sheet: Image.Image) -> list[Image.Image]:
    first_row = sheet.crop((0, 0, sheet.width, SOURCE_ROW_HEIGHT))
    fountain_components = sorted(
        (component for component in visible_components(first_row) if len(component) >= 15_000),
        key=lambda component: component_bounds(component, first_row.width)[0],
    )
    if len(fountain_components) != AUTHORED_FRAME_COUNT:
        raise ValueError(
            f"Expected {AUTHORED_FRAME_COUNT} first-row fountains, found {len(fountain_components)}",
        )
    return [
        align_to_output(
            isolate_component(first_row, component),
            component_bounds(component, first_row.width),
        )
        for component in fountain_components
    ]


def water_overlay(frame: Image.Image, static_base: Image.Image) -> Image.Image:
    frame_rgba = frame.convert("RGBA")
    frame_pixels = frame_rgba.load()
    base_pixels = static_base.convert("RGBA").load()
    blue_seed = Image.new("L", OUTPUT_SIZE, 0)
    blue_pixels = blue_seed.load()

    for y in range(70, min(510, OUTPUT_SIZE[1])):
        for x in range(24, OUTPUT_SIZE[0] - 24):
            red, green, blue, alpha = frame_pixels[x, y]
            base_red, base_green, base_blue, _ = base_pixels[x, y]
            difference = max(
                abs(red - base_red),
                abs(green - base_green),
                abs(blue - base_blue),
            )
            is_blue_water = (
                blue >= 135
                and blue >= red + 18
                and green >= red + 6
                and blue >= green - 8
            )
            if alpha > 36 and difference >= 12 and is_blue_water:
                blue_pixels[x, y] = 255

    nearby_water = blue_seed.filter(ImageFilter.MaxFilter(13))
    nearby_pixels = nearby_water.load()
    mask = Image.new("L", OUTPUT_SIZE, 0)
    mask_pixels = mask.load()

    for y in range(64, min(520, OUTPUT_SIZE[1])):
        for x in range(18, OUTPUT_SIZE[0] - 18):
            red, green, blue, alpha = frame_pixels[x, y]
            base_red, base_green, base_blue, _ = base_pixels[x, y]
            difference = max(
                abs(red - base_red),
                abs(green - base_green),
                abs(blue - base_blue),
            )
            is_blue = (
                blue >= 128
                and blue >= red + 12
                and green >= red + 3
                and blue >= green - 8
            )
            is_white_water = (
                min(red, green, blue) >= 188
                and blue >= red + 2
                and green >= red
            )
            near_seed = nearby_pixels[x, y] > 0
            in_front_jewel = 178 <= x <= 222 and 492 <= y <= 558
            if (
                alpha > 24
                and difference >= 10
                and (is_blue or (is_white_water and near_seed))
                and not in_front_jewel
            ):
                mask_pixels[x, y] = alpha

    overlay = frame_rgba.copy()
    # Source alpha already contains antialiased water edges.  Avoid blurring
    # this mask because it would bleed animated pixels onto the fixed stone,
    # gold trim, and plants around the streams.
    remove_floating_top_components(mask)
    overlay.putalpha(mask)

    return overlay


def build_seamless_frames(overlays: list[Image.Image]) -> list[Image.Image]:
    frames: list[Image.Image] = []
    for index, current in enumerate(overlays):
        following = overlays[(index + 1) % len(overlays)]
        for step in range(INBETWEENS_PER_TRANSITION):
            frames.append(Image.blend(current, following, step / INBETWEENS_PER_TRANSITION))
    return frames


def prepare_fountain(source: Path, destination: Path) -> None:
    sheet = Image.open(source).convert("RGBA")
    if sheet.size != SOURCE_SIZE:
        raise ValueError(f"Unexpected fountain source size: {sheet.size}")

    authored_fountains = extract_authored_fountains(sheet)
    static_base = authored_fountains[0]
    overlays = [water_overlay(frame, static_base) for frame in authored_fountains]
    static_body, static_finial = split_static_finial(static_base)
    seamless_frames = [
        add_idle_finial(frame, static_finial)
        for frame in build_seamless_frames(overlays)
    ]

    destination.mkdir(parents=True, exist_ok=True)
    static_body.save(destination / "park-fountain-base.png", optimize=True)
    for index, frame in enumerate(seamless_frames, start=1):
        frame.save(destination / f"park-fountain-water-{index:02d}.png", optimize=True)

    if len(seamless_frames) != AUTHORED_FRAME_COUNT * INBETWEENS_PER_TRANSITION:
        raise ValueError(f"Unexpected seamless frame count: {len(seamless_frames)}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    prepare_fountain(args.source, args.destination)


if __name__ == "__main__":
    main()
