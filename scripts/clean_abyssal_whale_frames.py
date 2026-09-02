"""Remove disconnected generation spill from the authored V8 whale PNG frames.

The source sequence contains a single intended whale per frame, but several PNGs
also contain a disconnected sliver of an adjacent generation near an image edge.
This tool keeps the largest opaque subject and its antialiased halo while leaving
the canvas size, colour channels, filenames, and frame order unchanged.
"""

from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


DEFAULT_FRAME_DIR = Path(
    "public/assets/maps/abyssal-moon-cathedral/objects/whale-v8/frames"
)


def connected_components(mask: np.ndarray) -> list[np.ndarray]:
    height, width = mask.shape
    visited = np.zeros_like(mask, dtype=bool)
    components: list[np.ndarray] = []

    for start_y, start_x in zip(*np.nonzero(mask & ~visited), strict=False):
        if visited[start_y, start_x]:
            continue
        queue = deque([(int(start_y), int(start_x))])
        visited[start_y, start_x] = True
        pixels: list[tuple[int, int]] = []
        while queue:
            y, x = queue.popleft()
            pixels.append((y, x))
            for next_y in range(max(0, y - 1), min(height, y + 2)):
                for next_x in range(max(0, x - 1), min(width, x + 2)):
                    if mask[next_y, next_x] and not visited[next_y, next_x]:
                        visited[next_y, next_x] = True
                        queue.append((next_y, next_x))
        components.append(np.asarray(pixels, dtype=np.int32))

    return components


def clean_frame(
    path: Path,
    *,
    output_dir: Path | None,
    write: bool,
) -> tuple[int, int]:
    image = Image.open(path).convert("RGBA")
    rgba = np.asarray(image).copy()
    alpha = rgba[:, :, 3]
    # A higher seed threshold prevents extremely faint generation noise from
    # bridging two otherwise separate subjects at a canvas edge.
    components = connected_components(alpha >= 64)
    if not components:
        return 0, 0

    components.sort(key=len, reverse=True)
    subject = components[0]
    subject_mask = np.zeros(alpha.shape, dtype=np.uint8)
    subject_mask[subject[:, 0], subject[:, 1]] = 255
    # Recover the original soft edge around the retained subject without
    # reconnecting distant edge spill.
    halo = Image.fromarray(subject_mask, mode="L").filter(ImageFilter.MaxFilter(15))
    keep = np.asarray(halo) > 0
    removed_pixels = int(np.count_nonzero(alpha[~keep]))
    if (write or output_dir is not None) and removed_pixels:
        rgba[~keep, :] = 0
        output_path = path if output_dir is None else output_dir / path.name
        output_path.parent.mkdir(parents=True, exist_ok=True)
        Image.fromarray(rgba, mode="RGBA").save(output_path, optimize=True)
    return len(components), removed_pixels


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--frame-dir", type=Path, default=DEFAULT_FRAME_DIR)
    parser.add_argument("--output-dir", type=Path)
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args()

    changed = 0
    for path in sorted(args.frame_dir.glob("*.png")):
        component_count, removed_pixels = clean_frame(
            path,
            output_dir=args.output_dir,
            write=args.write,
        )
        if removed_pixels:
            changed += 1
            print(
                f"{path.name}: {component_count} components, "
                f"{removed_pixels} spill pixels {'removed' if args.write else 'found'}"
            )
    print(f"frames with disconnected spill: {changed}")


if __name__ == "__main__":
    main()
