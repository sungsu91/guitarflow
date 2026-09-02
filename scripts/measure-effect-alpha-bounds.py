from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image


def measure_image(path: Path, alpha_threshold: int) -> dict[str, object]:
    image = Image.open(path).convert("RGBA")
    alpha = image.getchannel("A")
    bounds = alpha.point(lambda value: 255 if value > alpha_threshold else 0).getbbox()
    if bounds is None:
        return {"file": str(path), "size": image.size, "bbox": None, "anchor": None}

    left, top, right, bottom = bounds
    return {
        "file": str(path),
        "alphaThreshold": alpha_threshold,
        "size": image.size,
        "bbox": bounds,
        "anchor": {
            "centerX": round(((left + right) / 2) / image.width, 6),
            "bottomY": round(bottom / image.height, 6),
        },
        "bboxRatio": [
            round((right - left) / image.width, 6),
            round((bottom - top) / image.height, 6),
        ],
    }


def measure_sprite_sheet(
    path: Path,
    alpha_threshold: int,
    columns: int,
    rows: int,
) -> dict[str, object]:
    image = Image.open(path).convert("RGBA")
    frame_width = image.width // columns
    frame_height = image.height // rows
    frame_bounds: list[tuple[int, int, int, int] | None] = []
    for row in range(rows):
        for column in range(columns):
            frame = image.crop((
                column * frame_width,
                row * frame_height,
                (column + 1) * frame_width,
                (row + 1) * frame_height,
            ))
            alpha = frame.getchannel("A")
            frame_bounds.append(
                alpha.point(lambda value: 255 if value > alpha_threshold else 0).getbbox()
            )

    visible_bounds = [bounds for bounds in frame_bounds if bounds is not None]
    if not visible_bounds:
        union_bounds = None
    else:
        union_bounds = (
            min(bounds[0] for bounds in visible_bounds),
            min(bounds[1] for bounds in visible_bounds),
            max(bounds[2] for bounds in visible_bounds),
            max(bounds[3] for bounds in visible_bounds),
        )

    result = {
        "file": str(path),
        "alphaThreshold": alpha_threshold,
        "sheetSize": image.size,
        "frameSize": [frame_width, frame_height],
        "frameBounds": frame_bounds,
        "unionBounds": union_bounds,
        "anchor": None,
    }
    if union_bounds is not None:
        left, _top, right, bottom = union_bounds
        result["anchor"] = {
            "centerX": round(((left + right) / 2) / frame_width, 6),
            "bottomY": round(bottom / frame_height, 6),
        }
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description="Measure non-transparent PNG artwork bounds.")
    parser.add_argument("--alpha-threshold", type=int, default=0)
    parser.add_argument("--sprite-columns", type=int)
    parser.add_argument("--sprite-rows", type=int)
    parser.add_argument("paths", nargs="+", type=Path)
    args = parser.parse_args()
    if bool(args.sprite_columns) != bool(args.sprite_rows):
        parser.error("--sprite-columns and --sprite-rows must be used together")
    if args.sprite_columns:
        def measure(path: Path) -> dict[str, object]:
            return measure_sprite_sheet(
                path,
                args.alpha_threshold,
                args.sprite_columns,
                args.sprite_rows,
            )
    else:
        def measure(path: Path) -> dict[str, object]:
            return measure_image(path, args.alpha_threshold)
    print(json.dumps(
        [measure(path) for path in args.paths],
        ensure_ascii=False,
        indent=2,
    ))


if __name__ == "__main__":
    main()
