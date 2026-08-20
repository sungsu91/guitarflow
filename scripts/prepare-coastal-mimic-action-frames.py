"""Extract the supplied mimic idle, hit, and defeat animation frames.

The source contains more transitional poses than the authored runtime spec.
This script keeps the six-pose idle row, selects four readable hit poses, and
uses seven progressively destroyed poses plus a fully transparent last frame.
Every output is bottom-aligned on the same transparent 448px canvas.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw


SOURCE_SIZE = (1536, 1024)
FRAME_SIZE = (448, 448)
FLOOR_BASELINE = 442
VISIBLE_ALPHA_THRESHOLD = 6
SOURCE_SCALE = 1.7

IDLE_CROPS = (
    (0, 0, 246, 288),
    (246, 0, 507, 288),
    (507, 0, 767, 288),
    (767, 0, 1015, 288),
    (1015, 0, 1248, 288),
    (1248, 0, 1536, 288),
)

HIT_ROW_CROPS = (
    (0, 280, 346, 530),
    (346, 280, 637, 530),
    (637, 280, 925, 530),
    (925, 280, 1193, 530),
    (1193, 280, 1536, 530),
)

DEFEAT_ROW_THREE_CROPS = (
    (0, 530, 306, 780),
    (306, 530, 590, 780),
    (590, 530, 885, 780),
    (885, 530, 1209, 780),
    (1209, 530, 1536, 780),
)

DEFEAT_ROW_FOUR_CROPS = (
    (0, 760, 324, 1024),
    (324, 760, 594, 1024),
    (594, 760, 905, 1024),
    (905, 760, 1190, 1024),
    (1190, 760, 1536, 1024),
)


def clean_alpha(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    alpha = rgba.getchannel("A")
    alpha = alpha.point(lambda value: 0 if value <= VISIBLE_ALPHA_THRESHOLD else value)
    rgba.putalpha(alpha)
    return rgba


def fit_to_shared_canvas(image: Image.Image) -> Image.Image:
    bounds = image.getchannel("A").getbbox()
    frame = Image.new("RGBA", FRAME_SIZE, (0, 0, 0, 0))
    if bounds is None:
        return frame

    pose = image.crop(bounds)
    max_width = FRAME_SIZE[0] - 8
    max_height = FLOOR_BASELINE - 6
    ratio = min(
        SOURCE_SCALE,
        max_width / pose.width,
        max_height / pose.height,
    )
    pose = pose.resize(
        (max(1, round(pose.width * ratio)), max(1, round(pose.height * ratio))),
        Image.Resampling.LANCZOS,
    )
    frame.alpha_composite(
        pose,
        ((FRAME_SIZE[0] - pose.width) // 2, FLOOR_BASELINE - pose.height),
    )
    return frame


def save_frames(
    sheet: Image.Image,
    crop_boxes: tuple[tuple[int, int, int, int], ...],
    destination: Path,
    prefix: str,
) -> None:
    destination.mkdir(parents=True, exist_ok=True)
    for index, crop_box in enumerate(crop_boxes, start=1):
        frame = fit_to_shared_canvas(clean_alpha(sheet.crop(crop_box)))
        frame.save(destination / f"mimic-{prefix}-{index:02d}.png", optimize=True)


def extract_frames(source: Path, destination: Path) -> None:
    sheet = Image.open(source).convert("RGBA")
    if sheet.size != SOURCE_SIZE:
        raise ValueError(f"Unexpected mimic action source size: {sheet.size}")

    save_frames(sheet, IDLE_CROPS, destination / "idle", "idle")

    selected_hit_crops = tuple(HIT_ROW_CROPS[index] for index in (0, 1, 3, 4))
    save_frames(sheet, selected_hit_crops, destination / "hit", "hit")

    selected_defeat_crops = (
        *DEFEAT_ROW_THREE_CROPS[:4],
        DEFEAT_ROW_FOUR_CROPS[0],
        DEFEAT_ROW_FOUR_CROPS[2],
        DEFEAT_ROW_FOUR_CROPS[4],
    )
    save_frames(sheet, selected_defeat_crops, destination / "die", "die")
    transparent = Image.new("RGBA", FRAME_SIZE, (0, 0, 0, 0))
    transparent.save(destination / "die" / "mimic-die-08.png", optimize=True)


def build_preview(destination: Path, preview_path: Path) -> None:
    frame_paths = [
        *sorted((destination / "idle").glob("*.png")),
        *sorted((destination / "hit").glob("*.png")),
        *sorted((destination / "die").glob("*.png")),
    ]
    thumb_size = 220
    label_height = 28
    preview = Image.new(
        "RGBA",
        (thumb_size * 6, (thumb_size + label_height) * 3),
        (32, 38, 44, 255),
    )
    draw = ImageDraw.Draw(preview)
    for index, frame_path in enumerate(frame_paths):
        frame = Image.open(frame_path).convert("RGBA")
        frame.thumbnail((thumb_size, thumb_size), Image.Resampling.LANCZOS)
        column = index % 6
        row = index // 6
        x = column * thumb_size + (thumb_size - frame.width) // 2
        y = row * (thumb_size + label_height) + thumb_size - frame.height
        preview.alpha_composite(frame, (x, y))
        draw.text(
            (column * thumb_size + 6, row * (thumb_size + label_height) + thumb_size + 5),
            frame_path.stem,
            fill=(255, 255, 255, 255),
        )
    preview_path.parent.mkdir(parents=True, exist_ok=True)
    preview.save(preview_path, optimize=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    parser.add_argument("--preview", type=Path)
    args = parser.parse_args()
    extract_frames(args.source, args.destination)
    if args.preview:
        build_preview(args.destination, args.preview)


if __name__ == "__main__":
    main()
