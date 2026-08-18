"""Render the saved River Garden layout to flattened 390x756 and Retina PNGs.

The export mirrors the runtime renderer: the background uses CSS-like cover,
asset widths are relative to the map width, and normalized x/y values describe
each object's centre. The layered runtime remains the editable source of truth.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image


REFERENCE_WIDTH = 390
REFERENCE_HEIGHT = 756

ASSETS = {
    "rock-bank-large-left": ("rocks/rock-bank-large-left.png", 0.72),
    "rock-bank-wide": ("rocks/rock-bank-wide.png", 0.86),
    "rock-bank-tall-right": ("rocks/rock-bank-tall-right.png", 0.42),
    "rock-island-round-large": ("rocks/rock-island-round-large.png", 0.48),
    "rock-island-flat-top": ("rocks/rock-island-flat-top.png", 0.44),
    "rock-island-low-left": ("rocks/rock-island-low-left.png", 0.42),
    "rock-island-low-right": ("rocks/rock-island-low-right.png", 0.42),
    "rock-island-small-round": ("rocks/rock-island-small-round.png", 0.27),
    "rock-island-three": ("rocks/rock-island-three.png", 0.38),
    "rock-island-flat-wide": ("rocks/rock-island-flat-wide.png", 0.5),
    "lily-pad-large-round": ("lily-pads/lily-pad-large-round.png", 0.36),
    "lily-pad-large-layered": ("lily-pads/lily-pad-large-layered.png", 0.35),
    "lily-pad-medium-round": ("lily-pads/lily-pad-medium-round.png", 0.29),
    "lily-pad-medium-notched": ("lily-pads/lily-pad-medium-notched.png", 0.25),
    "lily-pad-small-round": ("lily-pads/lily-pad-small-round.png", 0.19),
    "lily-pad-wide-notched": ("lily-pads/lily-pad-wide-notched.png", 0.27),
    "stone-bridge-crossing": ("bridges/stone-bridge-crossing.png", 1.12),
    "guitar-dock-platform": ("platforms/guitar-dock-platform.png", 1.16),
    "ambient-frog": ("creatures/frog/frog_idle.png", 0.18),
    "ambient-diving-frog": ("creatures/frog/frog_idle.png", 0.15),
    "lotus-flower-open-top": ("lotus/lotus-open-top.png", 0.3),
    "lotus-flower-open-side": ("lotus/lotus-open-side.png", 0.32),
    "lotus-flower-bud": ("lotus/lotus-bud.png", 0.25),
}


def cover(image: Image.Image, width: int, height: int) -> Image.Image:
    scale = max(width / image.width, height / image.height)
    size = (round(image.width * scale), round(image.height * scale))
    resized = image.resize(size, Image.Resampling.LANCZOS)
    left = (resized.width - width) // 2
    top = (resized.height - height) // 2
    return resized.crop((left, top, left + width, top + height))


def render(project_root: Path, scale: int) -> Image.Image:
    asset_root = project_root / "public/assets/maps/river"
    layout_path = project_root / "src/shooter/maps/skins/river-layout.json"
    placements = json.loads(layout_path.read_text(encoding="utf-8"))
    width = REFERENCE_WIDTH * scale
    height = REFERENCE_HEIGHT * scale
    background = Image.open(asset_root / "river-background.png").convert("RGBA")
    canvas = cover(background, width, height)

    for placement in sorted(placements, key=lambda item: item["layer"]):
        asset_id = placement["assetId"]
        if asset_id not in ASSETS:
            raise KeyError(f"Missing export asset registration: {asset_id}")
        relative_path, base_width = ASSETS[asset_id]
        sprite = Image.open(asset_root / relative_path).convert("RGBA")
        display_width = max(1, round(width * base_width * placement["scale"]))
        display_height = max(1, round(sprite.height * display_width / sprite.width))
        sprite = sprite.resize((display_width, display_height), Image.Resampling.LANCZOS)
        rotation = placement.get("rotation", 0)
        if rotation:
            sprite = sprite.rotate(-rotation, resample=Image.Resampling.BICUBIC, expand=True)
        centre_x = round(width * placement["x"])
        centre_y = round(height * placement["y"])
        canvas.alpha_composite(sprite, (centre_x - sprite.width // 2, centre_y - sprite.height // 2))

    return canvas


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("project_root", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    args.destination.mkdir(parents=True, exist_ok=True)

    for scale, suffix in ((1, ""), (3, "@3x")):
        image = render(args.project_root, scale).convert("RGB")
        image.save(args.destination / f"river-garden-full-map{suffix}.png", optimize=True)


if __name__ == "__main__":
    main()
