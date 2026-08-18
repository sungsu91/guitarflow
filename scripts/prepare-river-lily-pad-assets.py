"""Extract top-down lily-pad objects from the supplied transparent sprite sheet.

The source pixels are preserved exactly. Each configured rectangle is cropped,
trimmed to its non-transparent bounds, padded, and saved as an RGBA PNG.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


LILY_PAD_CROPS = {
    "lily-pad-large-round.png": (22, 20, 386, 264),
    "lily-pad-large-layered.png": (394, 24, 750, 248),
    "lily-pad-medium-round.png": (31, 274, 331, 476),
    "lily-pad-medium-notched.png": (650, 272, 897, 447),
    "lily-pad-small-round.png": (36, 496, 232, 642),
    "lily-pad-wide-notched.png": (1273, 500, 1536, 650),
}


def trim_and_pad(image: Image.Image, padding: int = 8) -> Image.Image:
    alpha_bounds = image.getchannel("A").getbbox()
    if alpha_bounds is None:
        raise ValueError("Crop contains no visible pixels")
    trimmed = image.crop(alpha_bounds)
    output = Image.new(
        "RGBA",
        (trimmed.width + padding * 2, trimmed.height + padding * 2),
        (0, 0, 0, 0),
    )
    output.alpha_composite(trimmed, (padding, padding))
    return output


def extract_lily_pads(source: Path, destination: Path) -> None:
    sheet = Image.open(source).convert("RGBA")
    destination.mkdir(parents=True, exist_ok=True)
    for filename, crop_box in LILY_PAD_CROPS.items():
        asset = trim_and_pad(sheet.crop(crop_box))
        asset.save(destination / filename, optimize=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    extract_lily_pads(args.source, args.destination)


if __name__ == "__main__":
    main()
