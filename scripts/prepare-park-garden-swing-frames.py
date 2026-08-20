"""Build ten garden-swing frames with one pixel-stable planted support.

The source is arranged as five columns by two rows, but some antialiased art
extends beyond an even 1536 / 5 cell.  We find the quietest column near each
nominal divider, then copy each region into a fixed 384 x 512 canvas while
preserving its original grid-relative coordinates.  The centered authored
pose supplies both a fixed support and a complementary ropes-plus-seat mask.
Only that moving mask receives a pendulum transform; the planted posts, top
beam, lantern, plants, rocks, and drape stay identical in every frame.
"""

from __future__ import annotations

import argparse
from collections import deque
from math import cos, radians, tan
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter


SOURCE_SIZE = (1536, 1024)
GRID_COLUMNS = 5
GRID_ROWS = 2
ROW_HEIGHT = SOURCE_SIZE[1] // GRID_ROWS
OUTPUT_SIZE = (384, ROW_HEIGHT)
VISIBLE_ALPHA_THRESHOLD = 128
CLEAN_ALPHA_THRESHOLD = 8
DIVIDER_SEARCH_LEFT = 12
DIVIDER_SEARCH_RIGHT = 52
STATIC_REFERENCE_FRAME = 9
SWING_MOTION_ENVELOPE = [(108, 96), (245, 96), (250, 398), (104, 398)]
SWING_PIVOT_Y = 96
SWING_ANGLES = [-20, -13, -6, 2, 10, 18, 10, 2, -6, -13]


def alpha_column_energy(row: Image.Image, x: int) -> int:
    alpha = row.getchannel("A")
    return sum(1 for y in range(row.height) if alpha.getpixel((x, y)) >= VISIBLE_ALPHA_THRESHOLD)


def find_dividers(row: Image.Image) -> list[int]:
    dividers = [0]
    for divider_index in range(1, GRID_COLUMNS):
        nominal = round(divider_index * row.width / GRID_COLUMNS)
        start = max(dividers[-1] + 1, nominal - DIVIDER_SEARCH_LEFT)
        stop = min(row.width - 1, nominal + DIVIDER_SEARCH_RIGHT)
        divider = min(
            range(start, stop + 1),
            key=lambda x: (alpha_column_energy(row, x), abs(x - nominal)),
        )
        dividers.append(divider)
    dividers.append(row.width)
    return dividers


def clean_low_alpha_noise(image: Image.Image) -> Image.Image:
    cleaned = image.copy().convert("RGBA")
    pixels = cleaned.load()
    for y in range(cleaned.height):
        for x in range(cleaned.width):
            red, green, blue, alpha = pixels[x, y]
            if alpha < CLEAN_ALPHA_THRESHOLD:
                pixels[x, y] = (red, green, blue, 0)
    return cleaned


def isolate_main_swing(image: Image.Image) -> Image.Image:
    """Keep the connected swing assembly and discard neighboring cell crumbs."""
    alpha = image.getchannel("A")
    alpha_pixels = alpha.load()
    visited = bytearray(image.width * image.height)
    components: list[list[int]] = []

    for start_y in range(image.height):
        for start_x in range(image.width):
            start_index = start_y * image.width + start_x
            if visited[start_index] or alpha_pixels[start_x, start_y] < 80:
                continue
            visited[start_index] = 1
            queue: deque[tuple[int, int]] = deque([(start_x, start_y)])
            component: list[int] = []
            while queue:
                x, y = queue.popleft()
                component.append(y * image.width + x)
                for next_x, next_y in (
                    (x - 1, y - 1), (x, y - 1), (x + 1, y - 1),
                    (x - 1, y), (x + 1, y),
                    (x - 1, y + 1), (x, y + 1), (x + 1, y + 1),
                ):
                    if not (0 <= next_x < image.width and 0 <= next_y < image.height):
                        continue
                    index = next_y * image.width + next_x
                    if visited[index] or alpha_pixels[next_x, next_y] < 80:
                        continue
                    visited[index] = 1
                    queue.append((next_x, next_y))
            components.append(component)

    if not components:
        raise ValueError("Garden-swing frame has no visible component")

    main_component = max(components, key=len)
    core = Image.new("L", image.size, 0)
    core_pixels = core.load()
    for index in main_component:
        core_pixels[index % image.width, index // image.width] = 255
    edge_mask = core.filter(ImageFilter.MaxFilter(5))
    isolated = image.copy()
    isolated.putalpha(ImageChops.multiply(image.getchannel("A"), edge_mask))
    return isolated


def build_centered_swing_mask(reference: Image.Image) -> Image.Image:
    """Select warm rope/seat pixels without taking blue fabric or planted posts."""
    envelope = Image.new("L", reference.size, 0)
    ImageDraw.Draw(envelope).polygon(SWING_MOTION_ENVELOPE, fill=255)
    envelope_pixels = envelope.load()
    pixels = reference.load()
    core = Image.new("L", reference.size, 0)
    core_pixels = core.load()
    for y in range(reference.height):
        for x in range(reference.width):
            red, green, blue, alpha = pixels[x, y]
            is_warm_rope_or_wood = (
                alpha >= 32
                and red >= 45
                and red >= green * 1.08
                and green >= blue * 1.03
            )
            if envelope_pixels[x, y] and is_warm_rope_or_wood:
                core_pixels[x, y] = 255
    return ImageChops.multiply(core.filter(ImageFilter.MaxFilter(3)), envelope)


def build_static_support(reference: Image.Image, moving_mask: Image.Image) -> Image.Image:
    """Remove the centered ropes and seat, leaving one planted support design."""
    support = reference.copy()
    alpha = ImageChops.multiply(
        support.getchannel("A"),
        ImageChops.invert(moving_mask),
    )
    support.putalpha(alpha)
    return support


def extract_centered_ropes_and_seat(reference: Image.Image, moving_mask: Image.Image) -> Image.Image:
    """Use the same complementary cutout as the fixed support—no redraw drift."""
    moving = reference.copy()
    moving.putalpha(ImageChops.multiply(reference.getchannel("A"), moving_mask))
    return moving


def swing_from_fixed_top_line(centered_swing: Image.Image, angle: float) -> Image.Image:
    """Pendulum-transform the moving art while keeping both top knots fixed."""
    angle_radians = radians(angle)
    inverse_vertical_scale = 1 / cos(angle_radians)
    inverse_shear = -tan(angle_radians)
    return centered_swing.transform(
        centered_swing.size,
        Image.Transform.AFFINE,
        (
            1,
            inverse_shear,
            -inverse_shear * SWING_PIVOT_Y,
            0,
            inverse_vertical_scale,
            SWING_PIVOT_Y * (1 - inverse_vertical_scale),
        ),
        resample=Image.Resampling.BICUBIC,
    )


def lock_support_and_animate_swing(raw_frames: list[Image.Image]) -> list[Image.Image]:
    reference = raw_frames[STATIC_REFERENCE_FRAME]
    moving_mask = build_centered_swing_mask(reference)
    static_support = build_static_support(reference, moving_mask)
    centered_swing = extract_centered_ropes_and_seat(reference, moving_mask)
    locked_frames: list[Image.Image] = []
    for angle in SWING_ANGLES:
        moving = swing_from_fixed_top_line(centered_swing, angle)
        output = Image.new("RGBA", OUTPUT_SIZE, (0, 0, 0, 0))
        if angle < 0:
            # From the lower-left camera, negative angles bring the seat toward
            # the viewer.  Draw it over the planted support so the left post
            # correctly disappears behind the foreground seat and ropes.
            output.alpha_composite(static_support)
            output.alpha_composite(moving)
        else:
            # On the return/back arc the seat passes behind the far support.
            output.alpha_composite(moving)
            output.alpha_composite(static_support)
        locked_frames.append(output)
    return locked_frames


def extract_frames(sheet: Image.Image) -> tuple[list[Image.Image], list[list[int]]]:
    frames: list[Image.Image] = []
    all_dividers: list[list[int]] = []
    horizontal_padding = (OUTPUT_SIZE[0] - round(sheet.width / GRID_COLUMNS)) // 2

    for row_index in range(GRID_ROWS):
        y0 = row_index * ROW_HEIGHT
        row = sheet.crop((0, y0, sheet.width, y0 + ROW_HEIGHT))
        dividers = find_dividers(row)
        all_dividers.append(dividers)

        for column_index in range(GRID_COLUMNS):
            left = dividers[column_index]
            right = dividers[column_index + 1]
            nominal_origin = round(column_index * sheet.width / GRID_COLUMNS)
            fragment = clean_low_alpha_noise(row.crop((left, 0, right, ROW_HEIGHT)))
            target_x = left - nominal_origin + horizontal_padding

            output = Image.new("RGBA", OUTPUT_SIZE, (0, 0, 0, 0))
            output.alpha_composite(fragment, (target_x, 0))
            frames.append(isolate_main_swing(output))

    return frames, all_dividers


def build_contact_sheet(frames: list[Image.Image]) -> Image.Image:
    contact = Image.new(
        "RGBA",
        (OUTPUT_SIZE[0] * GRID_COLUMNS, OUTPUT_SIZE[1] * GRID_ROWS),
        (30, 36, 28, 255),
    )
    for index, frame in enumerate(frames):
        x = (index % GRID_COLUMNS) * OUTPUT_SIZE[0]
        y = (index // GRID_COLUMNS) * OUTPUT_SIZE[1]
        contact.alpha_composite(frame, (x, y))
    return contact


def prepare_swing(source: Path, destination: Path, contact_sheet: Path | None) -> None:
    sheet = Image.open(source).convert("RGBA")
    if sheet.size != SOURCE_SIZE:
        raise ValueError(f"Unexpected garden-swing source size: {sheet.size}")

    raw_frames, dividers = extract_frames(sheet)
    if len(raw_frames) != GRID_COLUMNS * GRID_ROWS:
        raise ValueError(f"Unexpected frame count: {len(raw_frames)}")
    frames = lock_support_and_animate_swing(raw_frames)

    destination.mkdir(parents=True, exist_ok=True)
    for index, frame in enumerate(frames, start=1):
        frame.save(destination / f"garden-swing-{index:02d}.png", optimize=True)

    if contact_sheet:
        contact_sheet.parent.mkdir(parents=True, exist_ok=True)
        build_contact_sheet(frames).save(contact_sheet, optimize=True)

    print(f"prepared {len(frames)} frames at {OUTPUT_SIZE}")
    for row_index, row_dividers in enumerate(dividers, start=1):
        print(f"row {row_index} dividers: {row_dividers}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    parser.add_argument("--contact-sheet", type=Path)
    args = parser.parse_args()
    prepare_swing(args.source, args.destination, args.contact_sheet)


if __name__ == "__main__":
    main()
