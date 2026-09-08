"""Build a true horizontal carousel mobile without rotating the image plane."""

from math import cos, pi, sin
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "public/assets/maps/gacha-arcade/spritesheets"
OUTPUT_DIR = ROOT / "public/assets/maps/gacha-arcade/runtime"
FRAME_SIZE = (460, 364)
FRAME_COUNT = 24
ORBIT_COUNT = 5


def crop_visible(source: Image.Image) -> Image.Image:
    rgba = source.convert("RGBA")
    bbox = rgba.getchannel("A").getbbox()
    if bbox is None:
        raise RuntimeError("The mobile pendant source has no visible pixels")
    return rgba.crop(bbox)


def contain(source: Image.Image, width: int, height: int) -> Image.Image:
    scale = min(width / source.width, height / source.height)
    return source.resize(
        (max(1, round(source.width * scale)), max(1, round(source.height * scale))),
        Image.Resampling.LANCZOS,
    )


def draw_gold_line(draw: ImageDraw.ImageDraw, points, width: int = 2) -> None:
    draw.line(points, fill=(71, 30, 45, 235), width=width + 2)
    draw.line(points, fill=(241, 174, 84, 255), width=width)
    draw.line(points, fill=(255, 232, 166, 235), width=1)


def build_mobile_sheet() -> None:
    ring_source = Image.open(SOURCE_DIR / "star_mobile_ring_source.png")
    pendant_source = Image.open(SOURCE_DIR / "star_mobile_pendant_source.png")
    ring = contain(crop_visible(ring_source), 430, 174)
    pendant = crop_visible(pendant_source)

    frame_width, frame_height = FRAME_SIZE
    sheet = Image.new("RGBA", (frame_width * 6, frame_height * 4), (0, 0, 0, 0))
    ring_x = (frame_width - ring.width) // 2
    ring_y = 7
    hub = (frame_width // 2, 81)
    orbit_radius_x = 169
    orbit_radius_y = 30
    string_lengths = (82, 112, 145, 110, 84)

    for frame_index in range(FRAME_COUNT):
        frame = Image.new("RGBA", FRAME_SIZE, (0, 0, 0, 0))
        back_layer = Image.new("RGBA", FRAME_SIZE, (0, 0, 0, 0))
        back_draw = ImageDraw.Draw(back_layer)
        front_layer = Image.new("RGBA", FRAME_SIZE, (0, 0, 0, 0))
        front_draw = ImageDraw.Draw(front_layer)
        ornaments = []

        rotation = (frame_index / FRAME_COUNT) * 2 * pi
        for pendant_index in range(ORBIT_COUNT):
            angle = rotation + (pendant_index / ORBIT_COUNT) * 2 * pi
            depth = sin(angle)
            attachment = (
                round(hub[0] + orbit_radius_x * cos(angle)),
                round(hub[1] + orbit_radius_y * depth),
            )
            string_bottom = attachment[1] + string_lengths[pendant_index]
            scale = 0.70 + ((depth + 1) / 2) * 0.25
            star_height = round(48 * scale)
            star = contain(pendant, star_height, star_height)
            star_position = (
                attachment[0] - star.width // 2,
                string_bottom - round(star.height * 0.10),
            )
            ornaments.append((depth, attachment, string_bottom, star, star_position))

            # The radial support changes direction around the fixed horizontal ring.
            draw_gold_line(back_draw, (hub, attachment), 2)

        for depth, attachment, string_bottom, _, _ in ornaments:
            target = back_draw if depth < 0 else front_draw
            draw_gold_line(target, (attachment, (attachment[0], string_bottom)), 1)

        frame.alpha_composite(back_layer)
        frame.alpha_composite(ring, (ring_x, ring_y))
        frame.alpha_composite(front_layer)

        for _, _, _, star, position in sorted(ornaments, key=lambda item: item[0]):
            frame.alpha_composite(star, position)

        column = frame_index % 6
        row = frame_index // 6
        sheet.alpha_composite(frame, (column * frame_width, row * frame_height))

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    sheet.save(OUTPUT_DIR / "star_mobile_horizontal_sheet_6x4.png", optimize=True)


if __name__ == "__main__":
    build_mobile_sheet()
