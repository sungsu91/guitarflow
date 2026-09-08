"""Build the empty arcade, reusable objects, and manifest-driven layout preview."""

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "public/assets/maps/gacha-arcade"
RUNTIME_DIR = ASSET_DIR / "runtime"
PREVIEW_DIR = ASSET_DIR / "preview"
SOURCE_BACKGROUND = ASSET_DIR / "FRETIVA_GACHA_ARCADE_EMPTY_BAYS_SOURCE.png"
SOURCE_MACHINE = ASSET_DIR / "spritesheets/machine_cabinet_source.png"
SOURCE_MACHINE_LAVENDER = ASSET_DIR / "spritesheets/machine_cabinet_lavender_source.png"
SOURCE_MACHINE_MINT = ASSET_DIR / "spritesheets/machine_cabinet_mint_source.png"
SOURCE_PLINTH = ASSET_DIR / "spritesheets/machine_plinth_source.png"


def crop_visible(source: Image.Image, threshold: int = 6) -> Image.Image:
    rgba = source.convert("RGBA")
    alpha = rgba.getchannel("A").point(lambda value: 0 if value < threshold else value)
    rgba.putalpha(alpha)
    bbox = alpha.getbbox()
    if bbox is None:
        raise RuntimeError("The machine source has no visible pixels")
    return rgba.crop(bbox)


def contain(source: Image.Image, size: tuple[int, int]) -> Image.Image:
    width, height = size
    scale = min(width / source.width, height / source.height)
    resized = source.resize(
        (max(1, round(source.width * scale)), max(1, round(source.height * scale))),
        Image.Resampling.LANCZOS,
    )
    output = Image.new("RGBA", size, (0, 0, 0, 0))
    output.alpha_composite(resized, ((width - resized.width) // 2, height - resized.height))
    return output


def place_on_runtime(canvas: Image.Image, image: Image.Image, placement: dict) -> None:
    size = (round(placement["width"] / 2), round(placement["height"] / 2))
    resized = image.resize(size, Image.Resampling.LANCZOS)
    canvas.alpha_composite(resized, (round(placement["x"] / 2), round(placement["y"] / 2)))


def build_grounded_plinth(source: Image.Image) -> Image.Image:
    """Keep the illuminated plinth, but add a soft floor contact shadow below it."""
    output = Image.new("RGBA", (640, 240), (0, 0, 0, 0))
    shadow = Image.new("RGBA", output.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(shadow)
    draw.ellipse((28, 150, 612, 238), fill=(46, 6, 64, 205))
    shadow = shadow.filter(ImageFilter.GaussianBlur(16))
    output.alpha_composite(shadow)
    output.alpha_composite(contain(crop_visible(source), (640, 190)), (0, 0))
    return output


def build_layout_preview(background: Image.Image, plinth: Image.Image, machines: dict[str, Image.Image]) -> None:
    manifest = json.loads((ASSET_DIR / "asset_manifest.json").read_text(encoding="utf-8"))
    rules = manifest["layout_rules"]
    slots = manifest["machine_slots"]
    canvas = background.resize((768, 1664), Image.Resampling.LANCZOS)

    resolved = []
    for slot in slots:
        machine_width = slot["machine_width"]
        machine_height = round(machine_width * rules["machine_height_ratio"])
        platform_width = round(machine_width * rules["plinth_width_ratio"])
        platform_height = round(platform_width / (640 / 240))
        machine_base_y = slot["base_y"] + round(machine_width * rules["machine_base_offset_ratio"])
        machine_placement = {
            "x": round(slot["center_x"] - machine_width / 2),
            "y": machine_base_y - machine_height,
            "width": machine_width,
            "height": machine_height,
        }
        platform_placement = {
            "x": round(slot["center_x"] - platform_width / 2),
            "y": round(machine_base_y - platform_height * rules["machine_footline_on_plinth_ratio"]),
            "width": platform_width,
            "height": platform_height,
        }
        resolved.append((slot, machine_placement, platform_placement))

    for slot, placement, platform_placement in resolved:
        machine = machines[slot["theme"]]
        cabinet = machine.transpose(Image.Transpose.FLIP_LEFT_RIGHT) if slot["side"] == "left" else machine
        place_on_runtime(canvas, plinth, platform_placement)
        place_on_runtime(canvas, cabinet, placement)

    elapsed_ms = 2700
    for slot, placement, _platform_placement in resolved:
        is_left = slot["side"] == "left"
        frame_width, frame_height = (300, 280) if is_left else (290, 250)
        sheet_name = "claw_left_mid_wire_sheet_6x4.png" if is_left else "claw_right_upper_wire_sheet_6x4.png"
        sheet = Image.open(RUNTIME_DIR / sheet_name).convert("RGBA")
        frame_index = int(((elapsed_ms + slot["phase_offset_ms"]) * 4) / 1000) % 24
        column, row = frame_index % 6, frame_index // 6
        frame = sheet.crop((
            column * frame_width,
            row * frame_height,
            (column + 1) * frame_width,
            (row + 1) * frame_height,
        ))
        claw_height = round(placement["height"] * 0.36)
        claw_width = round(claw_height * frame_width / frame_height)
        place_on_runtime(canvas, frame, {
            "x": round(placement["x"] + (placement["width"] - claw_width) / 2),
            "y": round(placement["y"] + placement["height"] * 0.245),
            "width": claw_width,
            "height": claw_height,
        })

    star = manifest["star_mobile"]
    star_sheet = Image.open(RUNTIME_DIR / "star_mobile_horizontal_sheet_6x4.png").convert("RGBA")
    star_frame = int(((elapsed_ms + star["phase_offset_ms"]) * star["fps"]) / 1000) % star["frames"]
    column, row = star_frame % star["columns"], star_frame // star["columns"]
    frame_width, frame_height = star["frame_size"]
    star_image = star_sheet.crop((
        column * frame_width,
        row * frame_height,
        (column + 1) * frame_width,
        (row + 1) * frame_height,
    ))
    place_on_runtime(canvas, star_image, star["placement_on_1536x3328"])

    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    canvas.save(PREVIEW_DIR / "FRETIVA_GACHA_ARCADE_V3_LAYOUT_PREVIEW.png", optimize=True)


def build() -> None:
    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)

    background = Image.open(SOURCE_BACKGROUND).convert("RGBA")
    background.resize((1536, 3328), Image.Resampling.LANCZOS).save(
        ASSET_DIR / "FRETIVA_GACHA_ARCADE_MAP_BASE_EMPTY_BAYS.png",
        optimize=True,
    )
    background.resize((768, 1664), Image.Resampling.LANCZOS).save(
        RUNTIME_DIR / "FRETIVA_GACHA_ARCADE_MAP_BASE_EMPTY_BAYS_RUNTIME.png",
        optimize=True,
    )

    machines = {
        "pink": contain(crop_visible(Image.open(SOURCE_MACHINE)), (384, 576)),
        "lavender": contain(crop_visible(Image.open(SOURCE_MACHINE_LAVENDER)), (384, 576)),
        "mint": contain(crop_visible(Image.open(SOURCE_MACHINE_MINT)), (384, 576)),
    }
    for theme, machine in machines.items():
        stem = "machine_cabinet" if theme == "pink" else f"machine_cabinet_{theme}"
        machine.save(RUNTIME_DIR / f"{stem}_left_runtime.png", optimize=True)
        machine.transpose(Image.Transpose.FLIP_LEFT_RIGHT).save(
            RUNTIME_DIR / f"{stem}_right_runtime.png",
            optimize=True,
        )

    plinth = build_grounded_plinth(Image.open(SOURCE_PLINTH))
    plinth.save(RUNTIME_DIR / "machine_plinth_runtime.png", optimize=True)
    build_layout_preview(background, plinth, machines)


if __name__ == "__main__":
    build()
