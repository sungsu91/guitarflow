"""Extract the Just Play guitar from its baked checkerboard background.

The source artwork is intentionally kept pixel-for-pixel inside the detected
guitar silhouette.  Only the alpha channel is created; no resizing, repainting,
or colour correction is applied.
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    return parser.parse_args()


def build_guitar_mask(rgb: np.ndarray) -> np.ndarray:
    channels = rgb.astype(np.int16)
    red = channels[..., 0]
    green = channels[..., 1]
    blue = channels[..., 2]
    maximum = channels.max(axis=2)
    minimum = channels.min(axis=2)
    chroma = maximum - minimum

    # The checkerboard and its baked shadows are neutral gray.  The guitar's
    # wood, gold, turquoise, and tortoiseshell surfaces all carry measurable
    # chroma, including the outer binding.  Very dark warm pixels reconnect
    # fine outline details without admitting the neutral shadow matte.
    colored_surface = chroma >= 11
    dark_warm_detail = (maximum < 118) & ((red - blue) >= 5) & (chroma >= 6)
    candidate = colored_surface | dark_warm_detail
    candidate_image = Image.fromarray((candidate * 255).astype(np.uint8), mode="L")
    candidate_image = candidate_image.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3))
    candidate = np.asarray(candidate_image) > 0

    height, width = candidate.shape
    guitar = np.zeros_like(candidate, dtype=bool)
    head_end = round(height * 0.192)
    body_transition_start = round(height * 0.468)
    body_start = round(height * 0.484)

    def row_runs(indices: np.ndarray, maximum_gap: int) -> list[tuple[int, int]]:
        if not indices.size:
            return []
        runs: list[tuple[int, int]] = []
        run_start = int(indices[0])
        previous = run_start
        for current in map(int, indices[1:]):
            if current - previous > maximum_gap:
                runs.append((run_start, previous))
                run_start = current
            previous = current
        runs.append((run_start, previous))
        return runs

    # The front-facing guitar is a continuous solid silhouette through its
    # headstock, fingerboard, and body.  Reconstruct each continuous horizontal
    # span from the coloured binding/wood edge.  This retains neutral details
    # inside the guitar while refusing the neutral checkerboard shadow outside.
    for y in range(height):
        if y < head_end:
            span_start, span_end = round(width * 0.415), round(width * 0.585)
        elif y < body_start:
            span_start, span_end = round(width * 0.435), round(width * 0.565)
        else:
            span_start, span_end = round(width * 0.14), round(width * 0.86)

        span_pixels = np.flatnonzero(candidate[y, span_start:span_end])
        runs = row_runs(span_pixels, maximum_gap=8)
        if runs:
            if y < head_end:
                local_center = width // 2 - span_start
                left_local, right_local = min(
                    runs,
                    key=lambda run: 0 if run[0] <= local_center <= run[1] else min(abs(local_center - run[0]), abs(local_center - run[1])),
                )
            else:
                left_local = int(span_pixels[0])
                right_local = int(span_pixels[-1])
            left = span_start + left_local
            right = span_start + right_local
            guitar[y, left : right + 1] = True

        if body_transition_start <= y < body_start:
            transition_start = round(width * 0.30)
            transition_end = round(width * 0.70)
            transition_indices = np.flatnonzero(candidate[y, transition_start:transition_end])
            for run_start, run_end in row_runs(transition_indices, maximum_gap=4):
                if run_end - run_start >= 1:
                    guitar[y, transition_start + run_start : transition_start + run_end + 1] = True

    # Preserve the six tuning machines and their narrow shafts as separate
    # row runs; small highlight gaps are closed without joining them to empty
    # checkerboard space around the headstock.
    tuner_start = round(width * 0.375)
    tuner_end = round(width * 0.625)
    for y in range(head_end):
        indices = np.flatnonzero(candidate[y, tuner_start:tuner_end])
        for run_start, run_end in row_runs(indices, maximum_gap=4):
            guitar[y, tuner_start + run_start : tuner_start + run_end + 1] = True

    # Remove isolated neutral checker pixels that a row run can bridge around
    # the tuning machines.  Restrict this to the headstock zone so neutral
    # interior guitar details are never altered.
    mask_image = Image.fromarray((guitar * 255).astype(np.uint8), mode="L")
    eroded = np.asarray(mask_image.filter(ImageFilter.MinFilter(3))) > 0
    boundary = guitar & ~eroded
    head_rows = np.arange(height)[:, None] < head_end
    guitar[boundary & head_rows & (chroma <= 5)] = False

    # Fill only enclosed holes (for example neutral nut highlights).  The gaps
    # between headstock and tuning machines remain connected to the exterior.
    padded = Image.new("L", (width + 2, height + 2), 0)
    padded.paste(Image.fromarray((guitar * 255).astype(np.uint8), mode="L"), (1, 1))
    ImageDraw.floodfill(padded, (0, 0), 128)
    flooded = np.asarray(padded)[1:-1, 1:-1]
    return guitar | (flooded == 0)


def main() -> None:
    args = parse_args()
    source = Image.open(args.source).convert("RGB")
    rgb = np.asarray(source)
    mask = build_guitar_mask(rgb)

    rgba = np.dstack((rgb, (mask * 255).astype(np.uint8)))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(rgba, mode="RGBA").save(args.output, optimize=True)

    y_values, x_values = np.nonzero(mask)
    if not len(x_values):
        raise RuntimeError("No guitar pixels were detected")
    bbox = (int(x_values.min()), int(y_values.min()), int(x_values.max()), int(y_values.max()))
    print(f"saved={args.output} size={source.width}x{source.height} bbox={bbox} opaque={int(mask.sum())}")


if __name__ == "__main__":
    main()
