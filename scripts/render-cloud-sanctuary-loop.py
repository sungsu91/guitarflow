"""Render an eight-second periodic cinemagraph; original architecture stays fixed.

Usage: python render-cloud-sanctuary-loop.py reference.jpg output.mp4
Requires Pillow, NumPy and ffmpeg. No image-generation service is used.
"""
import json
import math
from pathlib import Path
import shutil
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

WIDTH, HEIGHT, FPS, SECONDS = 1920, 1080, 24, 8


def polygon_mask(polygons, blur=0):
    mask = Image.new('L', (WIDTH, HEIGHT))
    draw = ImageDraw.Draw(mask)
    for points in polygons:
        draw.polygon([(round(x * WIDTH), round(y * HEIGHT)) for x, y in points], fill=255)
    if blur:
        mask = mask.filter(ImageFilter.GaussianBlur(blur))
    return np.asarray(mask, dtype=np.float32) / 255


def render(source, output):
    original = Image.open(source).convert('RGB').resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)
    rgb = np.asarray(original, dtype=np.float32)
    yy, xx = np.mgrid[:HEIGHT, :WIDTH].astype(np.float32)
    x, y = xx / WIDTH, yy / HEIGHT
    sky = polygon_mask([[(.055, 0), (.95, 0), (.96, .72), (.85, .75), (.14, .75), (.03, .71)]], 12)
    architecture = polygon_mask([
        [(0, .08), (.084, .10), (.12, .72), (0, .84)],
        [(1, .07), (.954, .10), (.943, .30), (.905, .30), (.886, .66), (.87, .74), (1, .84)],
        [(0, .695), (.328, .683), (.337, .766), (0, .85)],
        [(.67, .683), (1, .672), (1, .85), (.66, .77)],
        [(.043, .465), (.10, .446), (.12, .507), (.162, .473), (.171, .405), (.184, .454), (.205, .422), (.215, .484), (.24, .470), (.264, .531), (.245, .598), (.21, .669), (.17, .641), (.123, .632), (.082, .592)],
        [(.711, .499), (.752, .467), (.767, .431), (.785, .495), (.811, .463), (.823, .529), (.90, .52), (.925, .611), (.853, .683), (.735, .66)],
        [(.83, .478), (.844, .423), (.866, .454), (.871, .478), (.854, .507)],
        [(.279, .567), (.29, .525), (.31, .536), (.315, .558), (.30, .603)],
        [(.453, .614), (.46, .58), (.47, .58), (.475, .60), (.468, .645)],
        [(.650, .607), (.660, .542), (.666, .531), (.672, .576), (.681, .592), (.672, .624)],
        [(.525, .655), (.556, .642), (.565, .615), (.577, .64), (.614, .631), (.626, .669), (.597, .71), (.553, .703)],
        [(0, .765), (1, .765), (1, 1), (0, 1)],
    ], 4)
    # Dilated protection keeps building silhouettes stable under the cloud field.
    architecture = np.asarray(Image.fromarray((architecture * 255).astype('uint8')).filter(ImageFilter.MaxFilter(21)).filter(ImageFilter.GaussianBlur(4)), dtype=np.float32) / 255
    clouds = sky * (1 - architecture)
    edge_plants = ((x < .11) | (x > .92)) & (y > .1) & (y < .74)
    green = (rgb[:, :, 1] > rgb[:, :, 0] * .92) & (rgb[:, :, 1] > rgb[:, :, 2] * .77) & (rgb.mean(axis=2) < 110)
    foliage = np.asarray(Image.fromarray((edge_plants & green).astype('uint8') * 255).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(2)), dtype=np.float32) / 255
    falls = polygon_mask([
        [(.791, .581), (.802, .583), (.799, .652), (.788, .651)],
        [(.838, .585), (.862, .588), (.854, .654), (.834, .652)],
    ], 3)
    water = falls * np.clip((rgb.mean(axis=2) - 112) / 74, 0, 1)
    sky_depth = .55 + 1.1 * y
    spatial = x * 3.1 + y * 5.2

    def frame(index):
        phase = math.tau * (index % (FPS * SECONDS)) / (FPS * SECONDS)
        # Integer-frequency fields give identical pixels at t=0 and t=duration.
        dx = clouds * sky_depth * (17 * np.sin(phase + y * 2.4) + 6 * np.sin(phase * 2 + spatial))
        dy = clouds * (4.8 * np.sin(phase + x * 4.5) + 2.8 * np.cos(phase * 2 + spatial))
        dx += foliage * (2.7 * np.sin(phase * 3 + y * 19) + .8 * np.sin(phase * 7 + x * 20))
        dy += foliage * 1.5 * np.cos(phase * 3 + y * 11)
        mx = np.clip(xx + dx, 0, WIDTH - 1.001)
        my = np.clip(yy + dy, 0, HEIGHT - 1.001)
        x0, y0 = mx.astype(np.int32), my.astype(np.int32)
        fx, fy = (mx - x0.astype(np.float32))[:, :, None], (my - y0.astype(np.float32))[:, :, None]
        top = rgb[y0, x0] * (1 - fx) + rgb[y0, x0 + 1] * fx
        bottom = rgb[y0 + 1, x0] * (1 - fx) + rgb[y0 + 1, x0 + 1] * fx
        result = top * (1 - fy) + bottom * fy
        shimmer = water * (3.6 * np.sin(y * 210 - phase * 6) + 1.8 * np.sin(y * 389 - phase * 9))
        result += shimmer[:, :, None]
        return np.clip(result, 0, 255).astype(np.uint8)

    output = Path(output)
    output.parent.mkdir(parents=True, exist_ok=True)
    ffmpeg_binary = shutil.which('ffmpeg')
    if not ffmpeg_binary:
        import imageio_ffmpeg
        ffmpeg_binary = imageio_ffmpeg.get_ffmpeg_exe()
    # Near-lossless quantization avoids an I/P texture reset; one GOP covers the loop.
    ffmpeg = subprocess.Popen([ffmpeg_binary, '-y', '-loglevel', 'error', '-f', 'rawvideo', '-vcodec', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{WIDTH}x{HEIGHT}', '-r', str(FPS), '-i', '-', '-an', '-c:v', 'libx264', '-preset', 'medium', '-qp', '8', '-g', str(FPS * SECONDS), '-keyint_min', str(FPS * SECONDS), '-x264-params', 'aq-mode=0:mbtree=0:scenecut=0', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(output)], stdin=subprocess.PIPE)
    first = frame(0)
    assert np.array_equal(first, frame(FPS * SECONDS)), 'Loop boundary must match exactly'
    sample_paths = []
    for index in range(FPS * SECONDS):
        pixels = first if index == 0 else frame(index)
        ffmpeg.stdin.write(pixels.tobytes())
        if index in [0, 1, 48, 96, 144, 190, 191]:
            sample = output.with_name(f'cloud-frame-{index:03d}.jpg')
            Image.fromarray(pixels).save(sample, quality=92)
            sample_paths.append(str(sample))
        if index % FPS == 0:
            print(f'rendered {index // FPS}/{SECONDS}s', flush=True)
    ffmpeg.stdin.close()
    if ffmpeg.wait() != 0:
        raise RuntimeError('ffmpeg encoding failed')
    print(json.dumps({'width': WIDTH, 'height': HEIGHT, 'fps': FPS, 'duration': SECONDS, 'bytes': output.stat().st_size, 'exact_periodic_boundary': True, 'frames': sample_paths}), flush=True)


if __name__ == '__main__':
    render(sys.argv[1], sys.argv[2])
