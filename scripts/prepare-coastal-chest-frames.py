"""Extract aligned treasure-chest and mimic frames from the supplied RGBA sheet.

All visible components inside a cell are preserved so wobble trails, coins,
gems, droplets, and tentacles remain part of the authored animation. Frames
are bottom-aligned on a shared transparent canvas without repainting them.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


SOURCE_SIZE = (1672, 941)
FRAME_SIZE = (448, 448)
FLOOR_BASELINE = 442
VISIBLE_ALPHA_THRESHOLD = 6

FRAME_CROPS = {
    "treasure": (
        (0, 0, 310, 470),
        (310, 0, 630, 470),
        (630, 0, 950, 470),
        (950, 0, 1260, 470),
        (1260, 0, 1672, 470),
    ),
    "mimic": (
        (0, 470, 310, 941),
        (310, 470, 630, 941),
        (630, 470, 950, 941),
        (950, 470, 1255, 941),
        (1255, 470, 1672, 941),
    ),
}


def clean_alpha(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    alpha = rgba.getchannel("A")
    alpha = alpha.point(lambda value: 0 if value <= VISIBLE_ALPHA_THRESHOLD else value)
    rgba.putalpha(alpha)
    return rgba


def fit_to_shared_canvas(image: Image.Image) -> Image.Image:
    bounds = image.getchannel("A").getbbox()
    if bounds is None:
        raise ValueError("Chest frame contains no visible pixels")
    pose = image.crop(bounds)
    max_width = FRAME_SIZE[0] - 8
    max_height = FLOOR_BASELINE - 6
    ratio = min(1.0, max_width / pose.width, max_height / pose.height)
    if ratio < 1:
        pose = pose.resize(
            (round(pose.width * ratio), round(pose.height * ratio)),
            Image.Resampling.LANCZOS,
        )
    frame = Image.new("RGBA", FRAME_SIZE, (0, 0, 0, 0))
    frame.alpha_composite(pose, ((FRAME_SIZE[0] - pose.width) // 2, FLOOR_BASELINE - pose.height))
    return frame


def extract_frames(source: Path, destination: Path) -> None:
    sheet = Image.open(source).convert("RGBA")
    if sheet.size != SOURCE_SIZE:
        raise ValueError(f"Unexpected chest source size: {sheet.size}")

    for variant, crop_boxes in FRAME_CROPS.items():
        variant_destination = destination / variant
        variant_destination.mkdir(parents=True, exist_ok=True)
        for index, crop_box in enumerate(crop_boxes, start=1):
            cell = clean_alpha(sheet.crop(crop_box))
            frame = fit_to_shared_canvas(cell)
            frame.save(
                variant_destination / f"coastal-{variant}-{index:02d}.png",
                optimize=True,
            )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    extract_frames(args.source, args.destination)


if __name__ == "__main__":
    main()
