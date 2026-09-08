"""Build fixed-carriage runtime claw sheets while preserving the supplied originals."""

from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "public/assets/maps/gacha-arcade/spritesheets"
OUTPUT_DIR = ROOT / "public/assets/maps/gacha-arcade/runtime"

SHEETS = (
    ("claw_left_mid_sheet_6x4.png", "claw_left_mid_wire_sheet_6x4.png", 300, 280),
    ("claw_right_upper_sheet_6x4.png", "claw_right_upper_wire_sheet_6x4.png", 290, 250),
    ("claw_right_lower_sheet_6x4.png", "claw_right_lower_wire_sheet_6x4.png", 320, 310),
)

PLUSH_SOURCE = SOURCE_DIR / "claw_bunny_plush_source.png"
CLAW_RENDER_SCALE = 1.4


def broad_row_groups(alpha: Image.Image) -> list[list[int]]:
    rows = []
    for y in range(alpha.height):
        opaque_count = sum(alpha.getpixel((x, y)) > 20 for x in range(alpha.width))
        if opaque_count >= 18:
            if not rows or y > rows[-1][-1] + 1:
                rows.append([y])
            else:
                rows[-1].append(y)
    return rows


def add_tension_glint(frame: Image.Image, x: int, y: int) -> None:
    draw = ImageDraw.Draw(frame)
    pale = (255, 244, 190, 245)
    pink = (255, 143, 205, 220)
    draw.line((x - 5, y, x + 5, y), fill=pink, width=1)
    draw.line((x, y - 5, x, y + 5), fill=pink, width=1)
    draw.line((x - 2, y, x + 2, y), fill=pale, width=2)
    draw.line((x, y - 2, x, y + 2), fill=pale, width=2)


def add_claw_with_depth(frame: Image.Image, claw: Image.Image, x: int, y: int) -> None:
    alpha = claw.getchannel("A")
    shadow_alpha = alpha.filter(ImageFilter.GaussianBlur(2)).point(lambda value: round(value * 0.72))
    shadow = Image.new("RGBA", claw.size, (47, 17, 58, 0))
    shadow.putalpha(shadow_alpha)
    frame.alpha_composite(shadow, (x + 3, y + 4))

    expanded_alpha = alpha.filter(ImageFilter.MaxFilter(5))
    outline_alpha = ImageChops.subtract(expanded_alpha, alpha).point(lambda value: round(value * 0.9))
    outline = Image.new("RGBA", claw.size, (74, 24, 78, 0))
    outline.putalpha(outline_alpha)
    frame.alpha_composite(outline, (x, y))
    frame.alpha_composite(claw, (x, y))


def build_runtime_sheet(source_name: str, output_name: str, frame_width: int, frame_height: int) -> None:
    source = Image.open(SOURCE_DIR / source_name).convert("RGBA")
    output = Image.new("RGBA", source.size, (0, 0, 0, 0))
    plush_source = Image.open(PLUSH_SOURCE).convert("RGBA")
    plush_bbox = plush_source.getchannel("A").getbbox()
    if plush_bbox is None:
        raise RuntimeError("The generated bunny plush source has no visible pixels")
    plush_source = plush_source.crop(plush_bbox)
    plush_height = round(frame_width * 0.44)
    plush_width = round(plush_source.width * plush_height / plush_source.height)
    plush = plush_source.resize((plush_width, plush_height), Image.Resampling.LANCZOS)

    for frame_index in range(24):
        column = frame_index % 6
        row = frame_index // 6
        box = (
            column * frame_width,
            row * frame_height,
            (column + 1) * frame_width,
            (row + 1) * frame_height,
        )
        source_frame = source.crop(box)
        alpha = source_frame.getchannel("A")
        groups = broad_row_groups(alpha)
        if len(groups) < 2:
            raise RuntimeError(f"Could not separate carriage and claw in {source_name} frame {frame_index}")

        carriage_top = max(0, groups[0][0] - 4)
        carriage_bottom = min(frame_height, groups[0][-1] + 5)
        carriage_alpha_box = alpha.crop((0, carriage_top, frame_width, carriage_bottom)).getbbox()
        if carriage_alpha_box is None:
            raise RuntimeError(f"Missing carriage pixels in {source_name} frame {frame_index}")
        carriage_left, _, carriage_right, carriage_bottom_local = carriage_alpha_box
        carriage_crop = source_frame.crop((
            carriage_left,
            carriage_top,
            carriage_right,
            carriage_top + carriage_bottom_local,
        ))

        claw_top = max(0, groups[1][0] - 7)
        alpha_box = alpha.crop((0, claw_top, frame_width, frame_height)).getbbox()
        if alpha_box is None:
            raise RuntimeError(f"Missing claw pixels in {source_name} frame {frame_index}")
        claw_left, _, claw_right, claw_bottom_local = alpha_box
        claw_bottom = claw_top + claw_bottom_local
        center_x = round((claw_left + claw_right) / 2)
        claw_crop = source_frame.crop((claw_left, claw_top, claw_right, claw_bottom))
        claw_crop = claw_crop.resize((
            round(claw_crop.width * CLAW_RENDER_SCALE),
            round(claw_crop.height * CLAW_RENDER_SCALE),
        ), Image.Resampling.LANCZOS)
        claw_left = center_x - claw_crop.width // 2
        lift_y = -14 if frame_index == 16 else 0
        rendered_claw_top = claw_top + lift_y
        rendered_claw_bottom = rendered_claw_top + claw_crop.height

        runtime_frame = Image.new("RGBA", (frame_width, frame_height), (0, 0, 0, 0))
        draw = ImageDraw.Draw(runtime_frame)
        cable_bottom = rendered_claw_top + 4
        draw.line((center_x, 0, center_x, cable_bottom), fill=(48, 23, 30, 255), width=5)
        draw.line((center_x - 1, 0, center_x - 1, cable_bottom), fill=(170, 93, 72, 255), width=2)
        draw.line((center_x, 0, center_x, cable_bottom), fill=(247, 193, 126, 255), width=1)

        if frame_index in (15, 16, 17, 18, 19, 20):
            plush_x = center_x - plush_width // 2
            plush_y = rendered_claw_bottom - round(plush_height * 0.38)
            runtime_frame.alpha_composite(plush, (plush_x, plush_y))

        rendered_claw = claw_crop
        if frame_index == 13:
            # Add one visible articulation step without resizing the fingers.
            half = claw_crop.width // 2
            left_half = claw_crop.crop((0, 0, half + 2, claw_crop.height))
            right_half = claw_crop.crop((half - 2, 0, claw_crop.width, claw_crop.height))
            rendered_claw = Image.new("RGBA", claw_crop.size, (0, 0, 0, 0))
            rendered_claw.alpha_composite(left_half, (2, 0))
            rendered_claw.alpha_composite(right_half, (half - 4, 0))
        add_claw_with_depth(runtime_frame, rendered_claw, claw_left, rendered_claw_top)

        # The carriage follows the rail horizontally but never descends with the claw.
        runtime_frame.alpha_composite(carriage_crop, (carriage_left, 2))
        if frame_index == 16:
            add_tension_glint(runtime_frame, center_x + 13, rendered_claw_top + 9)

        output.alpha_composite(runtime_frame, (column * frame_width, row * frame_height))

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output.save(OUTPUT_DIR / output_name, optimize=True)


if __name__ == "__main__":
    for sheet in SHEETS:
        build_runtime_sheet(*sheet)
