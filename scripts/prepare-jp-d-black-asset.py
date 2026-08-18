"""Extract the JP D. Black guitar from its baked checkerboard background.

The checkerboard is uniformly near-white while every exterior guitar pixel is
darker.  The mask is built without
resizing or repainting the source; RGB is preserved exactly inside the
silhouette and cleared only where alpha becomes zero.
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw


BACKGROUND_MIN_CHANNEL = 225


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    return parser.parse_args()


def build_guitar_mask(rgb: np.ndarray) -> np.ndarray:
    channels = rgb.astype(np.int16)
    minimum = channels.min(axis=2)
    background = minimum >= BACKGROUND_MIN_CHANNEL
    guitar_seed = ~background

    height, width = guitar_seed.shape
    padded = Image.new("L", (width + 2, height + 2), 0)
    padded.paste(Image.fromarray((guitar_seed * 255).astype(np.uint8), mode="L"), (1, 1))
    ImageDraw.floodfill(padded, (0, 0), 128, thresh=0)
    flooded = np.asarray(padded)[1:-1, 1:-1]

    # Neutral details such as the ivory pickguard and white binding can match
    # one checker tile.  They are enclosed by the darker guitar surface, so
    # only enclosed zero regions are restored; exterior tuner gaps stay open.
    enclosed_detail = flooded == 0
    return guitar_seed | enclosed_detail


def main() -> None:
    args = parse_args()
    source = Image.open(args.source).convert("RGB")
    rgb = np.asarray(source)
    mask = build_guitar_mask(rgb)

    rgba = np.zeros((source.height, source.width, 4), dtype=np.uint8)
    rgba[mask, :3] = rgb[mask]
    rgba[mask, 3] = 255

    y_values, x_values = np.nonzero(mask)
    if not len(x_values):
        raise RuntimeError("No guitar pixels were detected")

    args.output.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(rgba, mode="RGBA").save(args.output, optimize=True)

    bbox = (
        int(x_values.min()),
        int(y_values.min()),
        int(x_values.max()),
        int(y_values.max()),
    )
    print(
        f"saved={args.output} size={source.width}x{source.height} "
        f"bbox={bbox} transparent={int((~mask).sum())} opaque={int(mask.sum())}"
    )


if __name__ == "__main__":
    main()
