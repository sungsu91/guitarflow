"""Build the empty seven-bay arcade background and reusable cabinet assets."""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "public/assets/maps/gacha-arcade"
RUNTIME_DIR = ASSET_DIR / "runtime"
SOURCE_BACKGROUND = ASSET_DIR / "FRETIVA_GACHA_ARCADE_EMPTY_BAYS_SOURCE.png"
SOURCE_MACHINE = ASSET_DIR / "spritesheets/machine_cabinet_source.png"
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

    machine = contain(crop_visible(Image.open(SOURCE_MACHINE)), (384, 576))
    machine.save(RUNTIME_DIR / "machine_cabinet_left_runtime.png", optimize=True)
    machine.transpose(Image.Transpose.FLIP_LEFT_RIGHT).save(
        RUNTIME_DIR / "machine_cabinet_right_runtime.png",
        optimize=True,
    )

    plinth = contain(crop_visible(Image.open(SOURCE_PLINTH)), (640, 190))
    plinth.save(RUNTIME_DIR / "machine_plinth_runtime.png", optimize=True)


if __name__ == "__main__":
    build()
