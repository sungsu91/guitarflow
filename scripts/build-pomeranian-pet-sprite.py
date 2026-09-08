"""Convert the generated Pomeranian sheet into transparent master/runtime assets."""

from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
PET_DIR = ROOT / "public/assets/pets/pomeranian"
SOURCE = PET_DIR / "source/pomeranian-generated-checkerboard.png"
MASTER = PET_DIR / "pomeranian-pet-master-4x2.png"
RUNTIME = PET_DIR / "pomeranian-pet-idle-sheet-8x1.png"


def remove_checkerboard(source: Image.Image) -> Image.Image:
    rgb = source.convert("RGB")
    alpha = Image.new("L", rgb.size)
    alpha_pixels = []
    for red, green, blue in rgb.getdata():
        chroma = max(red, green, blue) - min(red, green, blue)
        brightness = (red + green + blue) / 3
        color_signal = max(0, chroma - 7) * 13
        dark_signal = max(0, 182 - brightness) * 5
        alpha_pixels.append(max(0, min(255, round(max(color_signal, dark_signal)))))
    alpha.putdata(alpha_pixels)
    alpha = alpha.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(0.55))
    rgba = rgb.convert("RGBA")
    rgba.putalpha(alpha)
    cell_width, cell_height = rgba.width // 4, rgba.height // 2
    cleaned = Image.new("RGBA", rgba.size, (0, 0, 0, 0))
    for frame_index in range(8):
        column, row = frame_index % 4, frame_index // 4
        frame = rgba.crop((
            column * cell_width,
            row * cell_height,
            (column + 1) * cell_width,
            (row + 1) * cell_height,
        ))
        cleaned.alpha_composite(keep_largest_component(frame), (column * cell_width, row * cell_height))
    return cleaned


def keep_largest_component(frame: Image.Image) -> Image.Image:
    alpha = frame.getchannel("A")
    width, height = frame.size
    solid = bytearray(1 if value >= 18 else 0 for value in alpha.getdata())
    visited = bytearray(width * height)
    largest = []
    for start in range(width * height):
        if not solid[start] or visited[start]:
            continue
        component = []
        queue = deque([start])
        visited[start] = 1
        while queue:
            index = queue.popleft()
            component.append(index)
            x, y = index % width, index // width
            for neighbor in (index - 1, index + 1, index - width, index + width):
                if neighbor < 0 or neighbor >= width * height or visited[neighbor] or not solid[neighbor]:
                    continue
                nx, ny = neighbor % width, neighbor // width
                if abs(nx - x) + abs(ny - y) != 1:
                    continue
                visited[neighbor] = 1
                queue.append(neighbor)
        if len(component) > len(largest):
            largest = component
    component_mask = Image.new("L", frame.size, 0)
    component_pixels = bytearray(width * height)
    for index in largest:
        component_pixels[index] = 255
    component_mask.frombytes(bytes(component_pixels))
    component_mask = component_mask.filter(ImageFilter.MaxFilter(5))
    clean_alpha = Image.new("L", frame.size)
    clean_alpha.putdata([
        original if keep else 0
        for original, keep in zip(alpha.getdata(), component_mask.getdata())
    ])
    output = frame.copy()
    output.putalpha(clean_alpha)
    return output


def normalize_runtime(master: Image.Image) -> Image.Image:
    source_cell = (master.width // 4, master.height // 2)
    frame_size = 256
    runtime = Image.new("RGBA", (frame_size * 8, frame_size), (0, 0, 0, 0))
    for frame_index in range(8):
        column = frame_index % 4
        row = frame_index // 4
        frame = master.crop((
            column * source_cell[0],
            row * source_cell[1],
            (column + 1) * source_cell[0],
            (row + 1) * source_cell[1],
        ))
        visible_bounds = frame.getchannel("A").getbbox()
        if visible_bounds is None:
            raise RuntimeError(f"Pomeranian frame {frame_index} is empty")
        visible = frame.crop(visible_bounds)
        scale = min(220 / visible.width, 232 / visible.height)
        visible = visible.resize(
            (round(visible.width * scale), round(visible.height * scale)),
            Image.Resampling.LANCZOS,
        )
        x = frame_index * frame_size + (frame_size - visible.width) // 2
        y = 244 - visible.height
        runtime.alpha_composite(visible, (x, y))
    return runtime


def build() -> None:
    PET_DIR.mkdir(parents=True, exist_ok=True)
    master = remove_checkerboard(Image.open(SOURCE))
    master.save(MASTER, optimize=True)
    normalize_runtime(master).save(RUNTIME, optimize=True)


if __name__ == "__main__":
    build()
