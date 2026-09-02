"""Rebuild the clocktower astrolabe atlas around one stable centre pivot.

Several supplied atlas cells were already cropped at their left/top source edge.
The complete first frame is therefore used as the canonical ring and rotated
forward into 48 transparent 320px cells. Runtime still loads one WebP atlas with
one PNG fallback; no per-frame files are introduced.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image


ATLAS_DIR = Path("public/assets/maps/celestial-eclipse-clocktower/astrolabe")
PNG_PATH = ATLAS_DIR / "eclipse_astrolabe_48f_8x6.png"
WEBP_PATH = ATLAS_DIR / "eclipse_astrolabe_48f_8x6.webp"
CELL_SIZE = 320
COLUMNS = 8
ROWS = 6
FRAME_COUNT = COLUMNS * ROWS


def main() -> None:
    original = Image.open(PNG_PATH).convert("RGBA")
    reference = original.crop((0, 0, CELL_SIZE, CELL_SIZE))
    atlas = Image.new("RGBA", (CELL_SIZE * COLUMNS, CELL_SIZE * ROWS))

    for frame_index in range(FRAME_COUNT):
        angle = -(360 / FRAME_COUNT) * frame_index
        frame = reference.rotate(
            angle,
            center=(CELL_SIZE / 2, CELL_SIZE / 2),
            expand=False,
            fillcolor=(0, 0, 0, 0),
            resample=Image.Resampling.BICUBIC,
        )
        x = frame_index % COLUMNS * CELL_SIZE
        y = frame_index // COLUMNS * CELL_SIZE
        atlas.alpha_composite(frame, (x, y))

    atlas.save(PNG_PATH, optimize=True)
    atlas.save(WEBP_PATH, format="WEBP", lossless=True, method=6)
    print(f"rebuilt {FRAME_COUNT} centred frames: {PNG_PATH} and {WEBP_PATH}")


if __name__ == "__main__":
    main()
