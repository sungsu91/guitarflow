"""Split the authored 7 x 6 shooter note-monster sheet into aligned RGBA frames.

The supplied artwork is arranged on non-uniform visual centers rather than an
even pixel grid. Each cell is therefore assigned by midpoint boundaries and
translated onto a shared 256 x 256 core-centered canvas.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


NOTE_ROOTS = ("c", "d", "e", "f", "g", "a", "b")
FRAME_COUNT = 6
SOURCE_SIZE = (1536, 1024)
OUTPUT_SIZE = 256

# Hand-verified logical core / destruction centers in the supplied sheet.
SOURCE_X_ANCHORS = (154, 410, 666, 922, 1154, 1370)
SOURCE_Y_ANCHORS = (92, 225, 370, 510, 650, 794, 938)


def midpoint_edges(anchors: tuple[int, ...], extent: int) -> tuple[int, ...]:
    return (
        0,
        *(round((left + right) / 2) for left, right in zip(anchors, anchors[1:])),
        extent,
    )


ROW_BOTTOM_TRIM = {
    "c": 24,
    "d": 30,
    "e": 30,
    "f": 24,
    "g": 36,
    "a": 30,
}


def clear_touching_row_artifacts(cell: Image.Image, note_root: str, _source_top: int) -> None:
    """Remove only the narrow strip occupied by the following authored row.

    The supplied sheet deliberately overlaps decorative glows between rows, so
    alpha-component detection cannot separate them reliably. The verified trim
    depths stop after each row's fade-out and before the following row's object.
    A short alpha ramp keeps the retained edge visually soft.
    """

    trim_depth = ROW_BOTTOM_TRIM.get(note_root, 0)
    if trim_depth <= 0:
        return

    pixels = cell.load()
    fade_depth = 4
    clear_from = cell.height - trim_depth
    fade_from = max(0, clear_from - fade_depth)
    for y in range(fade_from, cell.height):
        if y >= clear_from:
            alpha_scale = 0.0
        else:
            alpha_scale = (clear_from - y) / fade_depth
        for x in range(cell.width):
            red, green, blue, alpha = pixels[x, y]
            pixels[x, y] = (red, green, blue, round(alpha * alpha_scale))


def split_sheet(source_path: Path, output_root: Path) -> list[Path]:
    sheet = Image.open(source_path).convert("RGBA")
    if sheet.size != SOURCE_SIZE:
        raise ValueError(f"Expected source size {SOURCE_SIZE}, received {sheet.size}")

    x_edges = midpoint_edges(SOURCE_X_ANCHORS, sheet.width)
    y_edges = midpoint_edges(SOURCE_Y_ANCHORS, sheet.height)
    written: list[Path] = []

    for row, note_root in enumerate(NOTE_ROOTS):
        note_dir = output_root / note_root
        note_dir.mkdir(parents=True, exist_ok=True)
        for frame_index in range(FRAME_COUNT):
            source_box = (
                x_edges[frame_index],
                y_edges[row],
                x_edges[frame_index + 1],
                y_edges[row + 1],
            )
            cell = sheet.crop(source_box)
            clear_touching_row_artifacts(cell, note_root, source_box[1])
            canvas = Image.new("RGBA", (OUTPUT_SIZE, OUTPUT_SIZE), (0, 0, 0, 0))
            paste_x = OUTPUT_SIZE // 2 + source_box[0] - SOURCE_X_ANCHORS[frame_index]
            paste_y = OUTPUT_SIZE // 2 + source_box[1] - SOURCE_Y_ANCHORS[row]
            canvas.alpha_composite(cell, (paste_x, paste_y))

            output_path = note_dir / f"frame-{frame_index}.png"
            canvas.save(output_path, format="PNG", optimize=True)
            written.append(output_path)

    if len(written) != len(NOTE_ROOTS) * FRAME_COUNT:
        raise RuntimeError(f"Expected 42 frames, wrote {len(written)}")
    for path in written:
        frame = Image.open(path)
        if frame.mode != "RGBA" or frame.size != (OUTPUT_SIZE, OUTPUT_SIZE):
            raise RuntimeError(f"Invalid exported frame: {path}")
    return written


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path, help="Path to the supplied 1536 x 1024 RGBA sheet")
    parser.add_argument("output", type=Path, help="Destination note-monster asset directory")
    args = parser.parse_args()
    written = split_sheet(args.source.resolve(), args.output.resolve())
    print(f"Exported {len(written)} aligned note-monster frames to {args.output.resolve()}")


if __name__ == "__main__":
    main()
