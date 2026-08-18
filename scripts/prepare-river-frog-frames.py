"""Extract six foot-anchored frog frames from the supplied sprite sheet.

The source illustration is preserved pixel-for-pixel. Only the baked light
checkerboard connected to the sheet edge is removed, then each selected pose is
trimmed and aligned to a shared transparent canvas with a common foot baseline.
"""

from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

from PIL import Image


FRAME_SIZE = (300, 220)
FOOT_BASELINE = 210
FRAME_CROPS = {
    "frog_idle.png": (35, 195, 200, 385),
    "frog_blink.png": (310, 735, 485, 940),
    "frog_crouch.png": (465, 245, 720, 390),
    "frog_takeoff.png": (730, 165, 1010, 345),
    "frog_air.png": (1005, 90, 1235, 300),
    "frog_land.png": (240, 195, 450, 390),
}


def is_backdrop(pixel: tuple[int, int, int, int]) -> bool:
    red, green, blue, _ = pixel
    return min(red, green, blue) >= 225 and max(red, green, blue) - min(red, green, blue) <= 22


def remove_connected_backdrop(image: Image.Image) -> Image.Image:
    output = image.convert("RGBA")
    width, height = output.size
    pixels = output.load()
    visited = bytearray(width * height)
    queue: deque[tuple[int, int]] = deque()

    def enqueue(x: int, y: int) -> None:
        index = y * width + x
        if visited[index] or not is_backdrop(pixels[x, y]):
            return
        visited[index] = 1
        queue.append((x, y))

    for x in range(width):
        enqueue(x, 0)
        enqueue(x, height - 1)
    for y in range(height):
        enqueue(0, y)
        enqueue(width - 1, y)

    while queue:
        x, y = queue.popleft()
        if x:
            enqueue(x - 1, y)
        if x + 1 < width:
            enqueue(x + 1, y)
        if y:
            enqueue(x, y - 1)
        if y + 1 < height:
            enqueue(x, y + 1)

    for index, remove in enumerate(visited):
        if remove:
            x = index % width
            y = index // width
            red, green, blue, _ = pixels[x, y]
            pixels[x, y] = (red, green, blue, 0)
    return output


def keep_largest_visible_component(image: Image.Image) -> Image.Image:
    """Discard detached source shadows/motion streaks, keeping the frog only."""
    width, height = image.size
    alpha = image.getchannel("A")
    alpha_pixels = alpha.load()
    visited = bytearray(width * height)
    components: list[list[int]] = []

    for start_y in range(height):
        for start_x in range(width):
            start_index = start_y * width + start_x
            if visited[start_index] or alpha_pixels[start_x, start_y] == 0:
                continue
            visited[start_index] = 1
            queue: deque[tuple[int, int]] = deque([(start_x, start_y)])
            component: list[int] = []
            while queue:
                x, y = queue.popleft()
                component.append(y * width + x)
                for next_x, next_y in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                    if next_x < 0 or next_x >= width or next_y < 0 or next_y >= height:
                        continue
                    index = next_y * width + next_x
                    if visited[index] or alpha_pixels[next_x, next_y] == 0:
                        continue
                    visited[index] = 1
                    queue.append((next_x, next_y))
            components.append(component)

    if not components:
        return image
    keep = set(max(components, key=len))
    output = image.copy()
    pixels = output.load()
    for index in range(width * height):
        if index not in keep:
            x = index % width
            y = index // width
            red, green, blue, _ = pixels[x, y]
            pixels[x, y] = (red, green, blue, 0)
    return output


def extract_frames(source: Path, destination: Path) -> None:
    transparent_sheet = remove_connected_backdrop(Image.open(source))
    destination.mkdir(parents=True, exist_ok=True)

    for filename, crop_box in FRAME_CROPS.items():
        pose = keep_largest_visible_component(transparent_sheet.crop(crop_box))
        bounds = pose.getchannel("A").getbbox()
        if bounds is None:
            raise ValueError(f"No visible pixels found for {filename}")
        pose = pose.crop(bounds)
        if pose.width > FRAME_SIZE[0] or pose.height > FOOT_BASELINE:
            raise ValueError(f"Frame does not fit shared canvas: {filename} {pose.size}")
        frame = Image.new("RGBA", FRAME_SIZE, (0, 0, 0, 0))
        frame.alpha_composite(pose, ((FRAME_SIZE[0] - pose.width) // 2, FOOT_BASELINE - pose.height))
        frame.save(destination / filename, optimize=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    extract_frames(args.source, args.destination)


if __name__ == "__main__":
    main()
