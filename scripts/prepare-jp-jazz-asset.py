"""Prepare the JP Jazz player sprite without repainting the source artwork.

The supplied PNG already contains alpha, but its opaque artwork peaks below
255 and a very-low-alpha fringe expands the apparent canvas.  This script
changes only alpha and fully transparent RGB pixels: the guitar colours,
geometry, lettering, and texture remain byte-for-byte unchanged.
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image


ALPHA_FRINGE_CUTOFF = 7
ALPHA_OPAQUE_THRESHOLD = 250
EXPECTED_SIZE = (1024, 1536)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    return parser.parse_args()


def clean_alpha(source: Image.Image) -> np.ndarray:
    rgba = np.asarray(source.convert("RGBA"), dtype=np.uint8).copy()
    alpha = rgba[..., 3].astype(np.float32)

    cleaned = np.zeros(alpha.shape, dtype=np.uint8)
    edge = (alpha > ALPHA_FRINGE_CUTOFF) & (alpha < ALPHA_OPAQUE_THRESHOLD)
    cleaned[edge] = np.rint(
        (alpha[edge] - ALPHA_FRINGE_CUTOFF)
        * 255
        / (ALPHA_OPAQUE_THRESHOLD - ALPHA_FRINGE_CUTOFF)
    ).astype(np.uint8)
    cleaned[alpha >= ALPHA_OPAQUE_THRESHOLD] = 255

    rgba[..., 3] = cleaned
    rgba[cleaned == 0, :3] = 0
    return rgba


def main() -> None:
    args = parse_args()
    source = Image.open(args.source)
    if source.size != EXPECTED_SIZE:
        raise ValueError(f"Expected {EXPECTED_SIZE[0]}x{EXPECTED_SIZE[1]}, got {source.size}")
    if "A" not in source.getbands():
        raise ValueError("JP Jazz source must contain an alpha channel")

    rgba = clean_alpha(source)
    alpha = rgba[..., 3]
    y_values, x_values = np.nonzero(alpha)
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
    transparent = int((alpha == 0).sum())
    opaque = int((alpha == 255).sum())
    print(
        f"saved={args.output} size={source.width}x{source.height} "
        f"bbox={bbox} transparent={transparent} opaque={opaque}"
    )


if __name__ == "__main__":
    main()
