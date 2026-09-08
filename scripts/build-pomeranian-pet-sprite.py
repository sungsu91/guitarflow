"""Convert the generated 24-frame Pomeranian action sheet to runtime assets."""

from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
PET_DIR = ROOT / "public/assets/pets/pomeranian"
SOURCE_COLUMNS = 6
SOURCE_ROWS = 4
FRAME_COUNT = SOURCE_COLUMNS * SOURCE_ROWS
RUNTIME_TIMELINE = (
    0, 1, 2, 3, 4, 5, 5, 0,
    6, 7, 8, 9, 9, 9, 9, 10, 11,
    12, 13, 14, 15, 15, 15, 15, 15, 16, 17,
    18, 18, 19, 19, 19, 20, 21, 22, 23,
)
SOURCE = PET_DIR / "source/pomeranian-actions-generated-checkerboard.png"
MASTER = PET_DIR / "pomeranian-pet-actions-master-6x4.png"
RUNTIME = PET_DIR / "pomeranian-pet-actions-sheet-36x1.png"


def remove_checkerboard(source: Image.Image) -> Image.Image:
    rgb = source.convert("RGB")
    cell_width, cell_height = rgb.width // SOURCE_COLUMNS, rgb.height // SOURCE_ROWS
    cleaned = Image.new("RGBA", rgb.size, (0, 0, 0, 0))
    for frame_index in range(FRAME_COUNT):
        column, row = frame_index % SOURCE_COLUMNS, frame_index // SOURCE_COLUMNS
        frame = rgb.crop((
            column * cell_width,
            row * cell_height,
            (column + 1) * cell_width,
            (row + 1) * cell_height,
        ))
        cleaned.alpha_composite(extract_dog(frame), (column * cell_width, row * cell_height))
    return cleaned


def extract_dog(frame: Image.Image) -> Image.Image:
    width, height = frame.size
    solid = bytearray(
        1 if max(red, green, blue) - min(red, green, blue) >= 10 and red - blue >= 5 else 0
        for red, green, blue in frame.getdata()
    )
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
    component_pixels = bytearray(width * height)
    for index in largest:
        component_pixels[index] = 255
    component_mask = Image.frombytes("L", frame.size, bytes(component_pixels))
    component_mask = component_mask.filter(ImageFilter.MaxFilter(7))

    # Preserve dark eyes, nose, mouth, and paw details enclosed by the warm fur silhouette.
    object_pixels = bytearray(1 if value >= 128 else 0 for value in component_mask.getdata())
    exterior = bytearray(width * height)
    queue = deque()
    for x in range(width):
        for index in (x, (height - 1) * width + x):
            if not object_pixels[index] and not exterior[index]:
                exterior[index] = 1
                queue.append(index)
    for y in range(height):
        for index in (y * width, y * width + width - 1):
            if not object_pixels[index] and not exterior[index]:
                exterior[index] = 1
                queue.append(index)
    while queue:
        index = queue.popleft()
        x, y = index % width, index // width
        for neighbor in (index - 1, index + 1, index - width, index + width):
            if neighbor < 0 or neighbor >= width * height or exterior[neighbor] or object_pixels[neighbor]:
                continue
            nx, ny = neighbor % width, neighbor // width
            if abs(nx - x) + abs(ny - y) != 1:
                continue
            exterior[neighbor] = 1
            queue.append(neighbor)
    filled_pixels = bytes(0 if exterior[index] else 255 for index in range(width * height))
    component_mask = Image.frombytes("L", frame.size, filled_pixels)
    component_mask = component_mask.filter(ImageFilter.GaussianBlur(0.7))

    output = frame.convert("RGBA")
    output.putalpha(component_mask)
    return output


def normalize_runtime(master: Image.Image) -> Image.Image:
    source_cell = (master.width // SOURCE_COLUMNS, master.height // SOURCE_ROWS)
    frame_size = 192
    runtime = Image.new("RGBA", (frame_size * len(RUNTIME_TIMELINE), frame_size), (0, 0, 0, 0))
    for runtime_index, frame_index in enumerate(RUNTIME_TIMELINE):
        column = frame_index % SOURCE_COLUMNS
        row = frame_index // SOURCE_COLUMNS
        frame = master.crop((
            column * source_cell[0],
            row * source_cell[1],
            (column + 1) * source_cell[0],
            (row + 1) * source_cell[1],
        ))
        if frame.getchannel("A").getbbox() is None:
            raise RuntimeError(f"Pomeranian frame {frame_index} is empty")
        frame = frame.resize((frame_size, frame_size), Image.Resampling.LANCZOS)
        visible_bounds = frame.getchannel("A").getbbox()
        alpha = frame.getchannel("A")
        alpha_pixels = alpha.load()
        contact_x = [
            x
            for y in range(max(0, visible_bounds[3] - 8), visible_bounds[3])
            for x in range(frame_size)
            if alpha_pixels[x, y] >= 128
        ]
        contact_center = (min(contact_x) + max(contact_x)) / 2 if contact_x else frame_size / 2
        grounded_frame = Image.new("RGBA", (frame_size, frame_size), (0, 0, 0, 0))
        center_offset = round(frame_size / 2 - contact_center)
        ground_offset = 187 - visible_bounds[3]
        grounded_frame.alpha_composite(frame, (center_offset, ground_offset))
        runtime.alpha_composite(grounded_frame, (runtime_index * frame_size, 0))
    return runtime


def hold_single_eye_salute(master: Image.Image) -> None:
    cell_width = master.width // SOURCE_COLUMNS
    cell_height = master.height // SOURCE_ROWS
    open_salute_index = 18
    closed_salute_index = 19
    open_column = open_salute_index % SOURCE_COLUMNS
    open_row = open_salute_index // SOURCE_COLUMNS
    open_salute = master.crop((
        open_column * cell_width,
        open_row * cell_height,
        (open_column + 1) * cell_width,
        (open_row + 1) * cell_height,
    ))
    source_column = closed_salute_index % SOURCE_COLUMNS
    source_row = closed_salute_index // SOURCE_COLUMNS
    closed_salute = master.crop((
        source_column * cell_width,
        source_row * cell_height,
        (source_column + 1) * cell_width,
        (source_row + 1) * cell_height,
    ))
    right_eye_mask = Image.new("L", (cell_width, cell_height), 0)
    ImageDraw.Draw(right_eye_mask).ellipse((86, 65, 124, 102), fill=255)
    right_eye_mask = right_eye_mask.filter(ImageFilter.GaussianBlur(2.2))
    wink_salute = Image.composite(closed_salute, open_salute, right_eye_mask)
    for frame_index in (18, 19, 20):
        column = frame_index % SOURCE_COLUMNS
        row = frame_index // SOURCE_COLUMNS
        master.paste(wink_salute, (column * cell_width, row * cell_height))


def build() -> None:
    PET_DIR.mkdir(parents=True, exist_ok=True)
    master = remove_checkerboard(Image.open(SOURCE))
    hold_single_eye_salute(master)
    master.save(MASTER, optimize=True)
    normalize_runtime(master).save(RUNTIME, optimize=True)


if __name__ == "__main__":
    build()
