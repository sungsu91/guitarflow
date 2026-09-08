"""Build stable master and runtime sheets for the silver barley cat pet."""

from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
PET_DIR = ROOT / "public/assets/pets/silver-barley-cat"
SOURCE_COLUMNS = 6
SOURCE_ROWS = 4
FRAME_COUNT = SOURCE_COLUMNS * SOURCE_ROWS
FRAME_SIZE = 192
SOURCE_RENDER_SIZE = 184
GROUND_Y = 187
RUNTIME_TIMELINE = (
    # Calm idle with readable pauses between the two head tilts.
    0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 0,
    # Notice, bat, catch, and release the barley-grass stalk.
    6, 6, 7, 7, 8, 8, 8, 9, 9, 9, 10, 10, 10, 10, 11, 11,
    # Alternating raised-paw and pressed-paw kneading holds.
    12, 12, 13, 13, 13, 14, 14, 14, 15, 15, 15, 16, 16, 16, 17, 17, 17, 12,
    # Paw lick, face wash, chest lick, and recovery.
    18, 18, 19, 19, 19, 20, 20, 21, 21, 21, 22, 22, 23, 23,
)
SOURCE = PET_DIR / "source/silver-barley-cat-actions-imagegen-fixed-checkerboard.png"
MASTER = PET_DIR / "silver-barley-cat-actions-master-6x4.png"
RUNTIME = PET_DIR / "silver-barley-cat-actions-sheet-60x1.png"


def is_cat_seed(red: int, green: int, blue: int) -> bool:
    chroma = max(red, green, blue) - min(red, green, blue)
    return chroma >= 18 or (chroma >= 7 and red - blue >= 2)


def extract_subject(frame: Image.Image) -> Image.Image:
    width, height = frame.size
    solid = bytearray(
        1 if is_cat_seed(*pixel) else 0
        for pixel in frame.convert("RGB").get_flattened_data()
    )
    visited = bytearray(width * height)
    largest: list[int] = []
    for start in range(width * height):
        if not solid[start] or visited[start]:
            continue
        component: list[int] = []
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

    if not largest:
        raise RuntimeError("Generated cat frame has no extractable subject")
    component_pixels = bytearray(width * height)
    for index in largest:
        component_pixels[index] = 255
    barrier = Image.frombytes("L", frame.size, bytes(component_pixels)).filter(ImageFilter.MaxFilter(3))
    barrier_pixels = bytearray(1 if value >= 128 else 0 for value in barrier.get_flattened_data())
    exterior = bytearray(width * height)
    queue: deque[int] = deque()
    for x in range(width):
        for index in (x, (height - 1) * width + x):
            if not barrier_pixels[index] and not exterior[index]:
                exterior[index] = 1
                queue.append(index)
    for y in range(height):
        for index in (y * width, y * width + width - 1):
            if not barrier_pixels[index] and not exterior[index]:
                exterior[index] = 1
                queue.append(index)
    while queue:
        index = queue.popleft()
        x, y = index % width, index // width
        for neighbor in (index - 1, index + 1, index - width, index + width):
            if neighbor < 0 or neighbor >= width * height or exterior[neighbor] or barrier_pixels[neighbor]:
                continue
            nx, ny = neighbor % width, neighbor // width
            if abs(nx - x) + abs(ny - y) != 1:
                continue
            exterior[neighbor] = 1
            queue.append(neighbor)
    mask = Image.frombytes(
        "L",
        frame.size,
        bytes(0 if exterior[index] else 255 for index in range(width * height)),
    ).filter(ImageFilter.GaussianBlur(0.65))
    subject = frame.convert("RGBA")
    subject.putalpha(mask)
    clean = Image.new("RGBA", frame.size, (0, 0, 0, 0))
    clean.alpha_composite(subject)
    return clean


def remove_checkerboard(source: Image.Image) -> Image.Image:
    rgb = source.convert("RGB")
    cell_width = rgb.width // SOURCE_COLUMNS
    cell_height = rgb.height // SOURCE_ROWS
    if (cell_width, cell_height) != (256, 256):
        raise RuntimeError(f"Expected 256px cells, got {cell_width}x{cell_height}")
    master = Image.new("RGBA", rgb.size, (0, 0, 0, 0))
    for frame_index in range(FRAME_COUNT):
        column = frame_index % SOURCE_COLUMNS
        row = frame_index // SOURCE_COLUMNS
        frame = rgb.crop((
            column * cell_width,
            row * cell_height,
            (column + 1) * cell_width,
            (row + 1) * cell_height,
        ))
        master.alpha_composite(extract_subject(frame), (column * cell_width, row * cell_height))
    return master


def cat_contact(frame: Image.Image) -> tuple[float, int]:
    alpha = frame.getchannel("A")
    alpha_pixels = alpha.load()
    rgba = frame.load()
    contacts: list[tuple[int, int]] = []
    for y in range(FRAME_SIZE - 1, -1, -1):
        row_contacts = []
        for x in range(FRAME_SIZE // 4, FRAME_SIZE * 3 // 4):
            red, green, blue, _ = rgba[x, y]
            if alpha_pixels[x, y] >= 128 and red >= green - 3 and red - blue >= 2:
                row_contacts.append((x, y))
        if row_contacts:
            contact_y = y
            for scan_y in range(max(0, y - 8), min(FRAME_SIZE, y + 1)):
                for x in range(FRAME_SIZE // 4, FRAME_SIZE * 3 // 4):
                    red, green, blue, _ = rgba[x, scan_y]
                    if alpha_pixels[x, scan_y] >= 128 and red >= green - 3 and red - blue >= 2:
                        contacts.append((x, scan_y))
            xs = [x for x, _ in contacts] or [x for x, _ in row_contacts]
            return (min(xs) + max(xs)) / 2, contact_y
    bounds = alpha.getbbox()
    if bounds is None:
        raise RuntimeError("Extracted cat frame is empty")
    return (bounds[0] + bounds[2]) / 2, bounds[3] - 1


def normalize_runtime(master: Image.Image) -> Image.Image:
    source_cell = (master.width // SOURCE_COLUMNS, master.height // SOURCE_ROWS)
    runtime = Image.new("RGBA", (FRAME_SIZE * len(RUNTIME_TIMELINE), FRAME_SIZE), (0, 0, 0, 0))
    for runtime_index, frame_index in enumerate(RUNTIME_TIMELINE):
        column = frame_index % SOURCE_COLUMNS
        row = frame_index // SOURCE_COLUMNS
        source_frame = master.crop((
            column * source_cell[0],
            row * source_cell[1],
            (column + 1) * source_cell[0],
            (row + 1) * source_cell[1],
        )).resize((SOURCE_RENDER_SIZE, SOURCE_RENDER_SIZE), Image.Resampling.LANCZOS)
        frame = Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE), (0, 0, 0, 0))
        frame.alpha_composite(
            source_frame,
            ((FRAME_SIZE - SOURCE_RENDER_SIZE) // 2, (FRAME_SIZE - SOURCE_RENDER_SIZE) // 2),
        )
        contact_center, contact_y = cat_contact(frame)
        grounded = Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE), (0, 0, 0, 0))
        grounded.alpha_composite(
            frame,
            (round(FRAME_SIZE / 2 - contact_center), GROUND_Y - contact_y),
        )
        grounded.paste((0, 0, 0, 0), (0, GROUND_Y + 1, FRAME_SIZE, FRAME_SIZE))
        runtime.alpha_composite(grounded, (runtime_index * FRAME_SIZE, 0))
    return runtime


def build() -> None:
    PET_DIR.mkdir(parents=True, exist_ok=True)
    master = remove_checkerboard(Image.open(SOURCE))
    master.save(MASTER, optimize=True)
    normalize_runtime(master).save(RUNTIME, optimize=True)


if __name__ == "__main__":
    build()
