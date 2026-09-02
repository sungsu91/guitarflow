"""Build phone-sized Autumn Moon sprite sheets without changing frame count.

The source sheets remain the archival/master assets.  Each frame is resized
individually so filtering never samples pixels from a neighbouring atlas cell.
"""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
MAP_ROOT = ROOT / "public" / "assets" / "maps" / "autumn-moon-temple-path"

SEQUENCES = (
    ("tree_sway", "tree_sway_48f_sheet", 6, (768, 1664), (384, 832)),
    ("leaves_mid", "leaves_mid_64f_sheet", 8, (768, 1664), (384, 832)),
    ("ground_gust", "ground_gust_32f_sheet", 4, (768, 384), (384, 192)),
    ("leaves_near", "leaves_near_48f_sheet", 6, (768, 1664), (384, 832)),
)


def build_sheet(directory, stem, sheet_index, source_cell, runtime_cell):
    source = MAP_ROOT / "animation" / directory / "sheets" / f"{stem}_{sheet_index:02d}.png"
    target_dir = MAP_ROOT / "animation-mobile" / directory / "sheets"
    target_dir.mkdir(parents=True, exist_ok=True)
    target = target_dir / source.name

    source_width, source_height = source_cell
    runtime_width, runtime_height = runtime_cell
    with Image.open(source) as atlas:
        atlas = atlas.convert("RGBA")
        runtime_atlas = Image.new("RGBA", (runtime_width * 4, runtime_height * 2), (0, 0, 0, 0))
        for row in range(2):
            for column in range(4):
                frame = atlas.crop((
                    column * source_width,
                    row * source_height,
                    (column + 1) * source_width,
                    (row + 1) * source_height,
                ))
                frame = frame.resize(runtime_cell, Image.Resampling.LANCZOS)
                runtime_atlas.alpha_composite(frame, (column * runtime_width, row * runtime_height))
        runtime_atlas.save(target, format="PNG", optimize=True, compress_level=9)


def main():
    for directory, stem, sheet_count, source_cell, runtime_cell in SEQUENCES:
        for sheet_index in range(sheet_count):
            build_sheet(directory, stem, sheet_index, source_cell, runtime_cell)


if __name__ == "__main__":
    main()
