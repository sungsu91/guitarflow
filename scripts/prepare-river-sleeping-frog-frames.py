"""Prepare foot-anchored sleeping-frog frames from the supplied pose sheet.

The supplied sheet is archived byte-for-byte.  The pale checkerboard connected
to the sheet boundary is removed, detached sleep glyphs are discarded, and the
selected frog poses are aligned on one shared transparent canvas.  The nose
bubble is intentionally not baked into these frames; MapSkinRenderer adds it as
an independently tunable lightweight layer.
"""

from __future__ import annotations

import argparse
import shutil
from collections import deque
from pathlib import Path

from PIL import Image


FRAME_SIZE = (420, 340)
FOOT_BASELINE = 320

# The sheet is a 3 x 3 pose board.  Bubble-bearing poses are deliberately not
# used for body frames so the bubble can stay independent of the artwork.
POSE_CROPS = {
    "sitting": (830, 490, 1215, 845),
    "nod": (45, 875, 410, 1195),
    "flat": (820, 895, 1215, 1190),
}

FRAME_POSES = {
    "frog_sleep_idle.png": "sitting",
    "frog_sleep_nod.png": "nod",
    "frog_sleep_fall.png": "nod",
    "frog_sleep_flat.png": "flat",
    "frog_sleep_flat_breathe.png": "flat",
    "frog_sleep_wakeup.png": "sitting",
}


def is_backdrop(pixel: tuple[int, int, int, int]) -> bool:
    red, green, blue, _ = pixel
    return min(red, green, blue) >= 225 and max(red, green, blue) - min(red, green, blue) <= 24


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
        if not remove:
            continue
        x = index % width
        y = index // width
        red, green, blue, _ = pixels[x, y]
        pixels[x, y] = (red, green, blue, 0)
    return output


def keep_largest_visible_component(image: Image.Image) -> Image.Image:
    """Keep the frog while removing detached Z glyphs and thought bubbles."""
    width, height = image.size
    alpha_pixels = image.getchannel("A").load()
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
        if index in keep:
            continue
        x = index % width
        y = index // width
        red, green, blue, _ = pixels[x, y]
        pixels[x, y] = (red, green, blue, 0)
    return output


def fit_pose_to_canvas(pose: Image.Image) -> Image.Image:
    bounds = pose.getchannel("A").getbbox()
    if bounds is None:
        raise ValueError("Sleeping frog crop contains no visible pixels")
    pose = pose.crop(bounds)
    max_width = FRAME_SIZE[0] - 20
    max_height = FOOT_BASELINE - 10
    ratio = min(1.0, max_width / pose.width, max_height / pose.height)
    if ratio < 1:
        pose = pose.resize(
            (round(pose.width * ratio), round(pose.height * ratio)),
            Image.Resampling.LANCZOS,
        )
    frame = Image.new("RGBA", FRAME_SIZE, (0, 0, 0, 0))
    frame.alpha_composite(pose, ((FRAME_SIZE[0] - pose.width) // 2, FOOT_BASELINE - pose.height))
    return frame


def prepare_frames(source: Path, archive: Path, destination: Path) -> None:
    archive.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, archive)
    transparent_sheet = remove_connected_backdrop(Image.open(source))
    destination.mkdir(parents=True, exist_ok=True)
    prepared = {
        pose_name: fit_pose_to_canvas(
            keep_largest_visible_component(transparent_sheet.crop(crop_box)),
        )
        for pose_name, crop_box in POSE_CROPS.items()
    }
    for filename, pose_name in FRAME_POSES.items():
        prepared[pose_name].save(destination / filename, optimize=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("archive", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    prepare_frames(args.source, args.archive, args.destination)


if __name__ == "__main__":
    main()
