"""Extract the authored British Shorthair montage into 61 transparent frames.

The cleaned montage has seven irregular rows (9/10/7/9/8/10/8 poses).
Several neighboring poses touch, so the script uses authored row cuts instead
of connected-component ordering alone. Each pose is then isolated, cleaned,
bottom-aligned, and fitted to a shared 384x256 runtime canvas.
"""

from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter


SOURCE_SIZE = (1536, 1024)
FRAME_SIZE = (384, 256)
VISIBLE_ALPHA_THRESHOLD = 80
POSE_SCALE = 1.35

# Inclusive row top and exclusive row bottom. Slight overlap preserves ears,
# tails, and paws that cross the visual row gutters.
ROW_BANDS = (
    (0, 176),
    (176, 329),
    (325, 473),
    (475, 572),
    (572, 716),
    (699, 858),
    (848, 1024),
)

# X boundaries between poses in each row. ImageGen preserved the authored
# layout, including a few touching tails and shadows, so explicit valleys keep
# those neighboring poses from becoming one connected component.
ROW_CUTS = (
    (0, 184, 346, 505, 643, 790, 948, 1101, 1256, 1536),
    (0, 153, 292, 436, 568, 734, 860, 995, 1147, 1320, 1536),
    (0, 198, 407, 629, 835, 1050, 1275, 1536),
    (0, 167, 354, 540, 693, 863, 1040, 1220, 1370, 1536),
    (0, 182, 383, 615, 812, 992, 1177, 1375, 1536),
    (0, 140, 270, 424, 552, 681, 826, 1121, 1246, 1371, 1536),
    (0, 146, 296, 548, 761, 923, 1168, 1375, 1536),
)


def extract_light_checkerboard_alpha(image: Image.Image) -> Image.Image:
    """Convert the baked light checkerboard to alpha without losing white fur."""

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

    # Close small checkerboard holes inside the white chest and paws, while the
    # expanded edge mask retains fur antialiasing without reviving the backdrop.
    closed_core = core.filter(ImageFilter.MaxFilter(11)).filter(ImageFilter.MinFilter(9))
    edge_safe_mask = closed_core.filter(ImageFilter.MaxFilter(7))
    isolated = image.copy()
    filled_alpha = ImageChops.lighter(isolated.getchannel("A"), closed_core)
    isolated.putalpha(ImageChops.multiply(filled_alpha, edge_safe_mask))
    return isolated


def fit_pose_to_frame(pose: Image.Image, bounds: tuple[int, int, int, int]) -> Image.Image:
    left, top, right, bottom = bounds
    padding = 7
    crop_box = (
        max(0, left - padding),
        max(0, top - padding),
        min(pose.width, right + padding),
        min(pose.height, bottom + padding),
    )
    cropped = pose.crop(crop_box)
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
        raise ValueError(f"Unexpected British Shorthair source size: {sheet.size}")
    has_useful_alpha = "A" in sheet.getbands() and sheet.getchannel("A").getextrema()[0] == 0
    sheet = sheet.convert("RGBA") if has_useful_alpha else extract_light_checkerboard_alpha(sheet)
    destination.mkdir(parents=True, exist_ok=True)

    frame_index = 1
    for row_index, ((row_top, row_bottom), row_cuts) in enumerate(zip(ROW_BANDS, ROW_CUTS)):
        for column_index, (left, right) in enumerate(zip(row_cuts, row_cuts[1:])):
            slot = sheet.crop((left, row_top, right, row_bottom))
            components = visible_components(slot)
            substantial = [component for component in components if len(component) >= 800]
            if not substantial:
                raise ValueError(
                    f"No cat pose found in row {row_index + 1}, column {column_index + 1}",
                )
            component = max(substantial, key=len)
            isolated = isolate_component(slot, component)
            bounds = component_bounds(component, slot.width)
            frame = fit_pose_to_frame(isolated, bounds)
            frame.save(
                destination / f"british-shorthair-play-{frame_index:02d}.png",
                optimize=True,
            )
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
