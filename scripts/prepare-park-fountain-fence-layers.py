"""Split the elliptical fountain fence into complementary depth layers.

The far/top half renders behind the fountain and the near/bottom half renders
in front.  Both outputs retain the full source canvas so identical placement
transforms reconstruct the original fence without seams or doubled pixels.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


SOURCE_SIZE = (1536, 1024)
SPLIT_Y = 512
CLEAN_ALPHA_THRESHOLD = 8


def clean_low_alpha_noise(image: Image.Image) -> Image.Image:
    cleaned = image.copy().convert("RGBA")
    pixels = cleaned.load()
    for y in range(cleaned.height):
        for x in range(cleaned.width):
            red, green, blue, alpha = pixels[x, y]
            if alpha < CLEAN_ALPHA_THRESHOLD:
                pixels[x, y] = (red, green, blue, 0)
    return cleaned


def complementary_layers(source: Image.Image) -> tuple[Image.Image, Image.Image]:
    cleaned = clean_low_alpha_noise(source)
    alpha = cleaned.getchannel("A")

    back_alpha = Image.new("L", cleaned.size, 0)
    back_alpha.paste(alpha.crop((0, 0, cleaned.width, SPLIT_Y)), (0, 0))

    front_alpha = Image.new("L", cleaned.size, 0)
    front_alpha.paste(
        alpha.crop((0, SPLIT_Y, cleaned.width, cleaned.height)),
        (0, SPLIT_Y),
    )

    back = cleaned.copy()
    back.putalpha(back_alpha)
    front = cleaned.copy()
    front.putalpha(front_alpha)

    source_pixels = alpha.load()
    back_pixels = back_alpha.load()
    front_pixels = front_alpha.load()
    for y in range(cleaned.height):
        for x in range(cleaned.width):
            back_value = back_pixels[x, y]
            front_value = front_pixels[x, y]
            if back_value and front_value:
                raise ValueError(f"Fence layers overlap at {(x, y)}")
            if max(back_value, front_value) != source_pixels[x, y]:
                raise ValueError(f"Fence layers do not reconstruct alpha at {(x, y)}")

    return back, front


def prepare_fence(source: Path, destination: Path) -> None:
    image = Image.open(source).convert("RGBA")
    if image.size != SOURCE_SIZE:
        raise ValueError(f"Unexpected fountain-fence source size: {image.size}")

    back, front = complementary_layers(image)
    destination.mkdir(parents=True, exist_ok=True)
    back.save(destination / "park-fountain-fence-back.png", optimize=True)
    front.save(destination / "park-fountain-fence-front.png", optimize=True)
    print(f"prepared complementary fence layers at {SOURCE_SIZE}, split y={SPLIT_Y}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    prepare_fence(args.source, args.destination)


if __name__ == "__main__":
    main()
