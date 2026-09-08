from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


def connected_from_center(candidate: np.ndarray) -> np.ndarray:
    height, width = candidate.shape
    center_x = width // 2
    seed = None
    for radius in range(max(width, height)):
        top = max(0, height // 2 - radius)
        bottom = min(height, height // 2 + radius + 1)
        left = max(0, center_x - radius)
        right = min(width, center_x + radius + 1)
        points = np.argwhere(candidate[top:bottom, left:right])
        if points.size:
            y, x = points[0]
            seed = (int(y + top), int(x + left))
            break
    if seed is None:
        raise RuntimeError("No foreground seed found")

    selected = np.zeros_like(candidate, dtype=bool)
    queue = deque([seed])
    selected[seed] = True
    while queue:
        y, x = queue.popleft()
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if not (dx or dy):
                    continue
                ny, nx = y + dy, x + dx
                if 0 <= ny < height and 0 <= nx < width and candidate[ny, nx] and not selected[ny, nx]:
                    selected[ny, nx] = True
                    queue.append((ny, nx))
    return selected


def fill_silhouette(barrier: np.ndarray) -> np.ndarray:
    height, width = barrier.shape
    exterior = np.zeros_like(barrier, dtype=bool)
    queue: deque[tuple[int, int]] = deque()

    def add(y: int, x: int) -> None:
        if not barrier[y, x] and not exterior[y, x]:
            exterior[y, x] = True
            queue.append((y, x))

    for x in range(width):
        add(0, x)
        add(height - 1, x)
    for y in range(height):
        add(y, 0)
        add(y, width - 1)

    while queue:
        y, x = queue.popleft()
        if x > 0:
            add(y, x - 1)
        if x + 1 < width:
            add(y, x + 1)
        if y > 0:
            add(y - 1, x)
        if y + 1 < height:
            add(y + 1, x)
    return ~exterior


def extract(input_path: Path, output_path: Path) -> None:
    source = Image.open(input_path).convert("RGB")
    rgb = np.asarray(source, dtype=np.int16)
    chroma = rgb.max(axis=2) - rgb.min(axis=2)
    mean = rgb.mean(axis=2)

    # The generated matte is neutral gray. Pink, gold, rosewood, and the dark
    # sound hole form one connected instrument component around canvas center.
    candidate = (chroma >= 48) | (mean <= 72)
    instrument = connected_from_center(candidate)
    barrier = np.asarray(
        Image.fromarray(instrument.astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(3))
    ) > 0
    silhouette = fill_silhouette(barrier)
    alpha = silhouette.astype(np.uint8) * 255
    rgba = np.dstack((rgb.astype(np.uint8), alpha))
    rgba[~silhouette, :3] = 0
    output_path.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(rgba, "RGBA").save(output_path)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    extract(args.input, args.output)


if __name__ == "__main__":
    main()
