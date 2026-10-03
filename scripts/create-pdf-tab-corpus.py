"""Independent, deterministic TAB engraving for OCR stress tests (no app imports).

Requires reportlab, Pillow and Poppler. Outputs are local test artifacts, never
application assets. The manifest is an oracle for the scorer only.
"""
import json
import random
import subprocess
from pathlib import Path

from PIL import Image, ImageFilter
from reportlab.pdfgen import canvas
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.lib.utils import ImageReader

OUT = Path('artifacts/pdf-tab-corpus')
OUT.mkdir(parents=True, exist_ok=True)
WIDTH, HEIGHT = 595, 380
FONTS = ['Helvetica', 'Times-Roman', 'Courier', 'Helvetica-Bold']
PATTERNS = [[4, 4, 4, 4], [8] * 8,
            [4, 8, 16, 16, 4, 8, 16, 16], [8, 16, 16, 8, 8, 8, 8, 4]]


def engrave(path, font, seed=11, rhythm_gray=0, direction=1):
    rng = random.Random(seed)
    c = canvas.Canvas(str(path), pagesize=(WIDTH, HEIGHT), invariant=True)
    c.setFont('Helvetica', 14)
    c.drawString(32, HEIGHT - 30, 'TAB recognition laboratory - original exercise')
    c.setFont('Helvetica', 9)
    c.drawString(32, HEIGHT - 46, '2026 / 120 / 12345 - title numbers are not frets')
    bars = []
    # Coordinates below are top-down to match the independent evaluation map.
    line = lambda x1, y1, x2, y2: c.line(x1, HEIGHT-y1, x2, HEIGHT-y2)
    for row, top in enumerate([115, 260]):
        gap, left, right = 9, 32, WIDTH - 32
        middle = (left + right) / 2
        c.setStrokeGray(0)
        c.setLineWidth(.5)
        for s in range(6):
            line(left, top+s*gap, right, top+s*gap)
        for x in [left, middle, right]:
            line(x, top, x, top+5*gap)
        for column in range(2):
            index = row*2+column
            start = left+column*(middle-left)
            width = middle-left
            durations = PATTERNS[index]
            xs = [start+27+i*(width-48)/(len(durations)-1) for i in range(len(durations))]
            events = []
            edge = top+5*gap if direction == 1 else top
            end = edge+direction*gap*2.5
            c.setStrokeGray(rhythm_gray/255)
            c.setFillGray(rhythm_gray/255)
            c.setLineWidth(.8)
            for x in xs:
                line(x, edge+direction*gap*.25, x, end)
            # Standard connected beams, broken at each quarter-note beat.
            beat = 0
            for i, (x, duration) in enumerate(zip(xs, durations)):
                if duration >= 8:
                    next_same = i+1 < len(xs) and durations[i+1] >= 8 and int(beat+4/duration+.00001) == int(beat+.00001)
                    prev_same = i > 0 and durations[i-1] >= 8 and int(beat-.00001) == int(beat+.00001)
                    target = xs[i+1] if next_same else xs[i-1] if prev_same else x+gap*1.1
                    c.setLineWidth(2)
                    line(x, end, target, end)
                    if duration == 16:
                        second_target = target if (next_same and durations[i+1] == 16) or (prev_same and durations[i-1] == 16) else x+(gap*.65 if next_same or not prev_same else -gap*.65)
                        line(x, end-direction*gap*.6, second_target, end-direction*gap*.6)
                beat += 4/duration
                # Include all strings, two-digit frets, mutes and simultaneous notes.
                strings = rng.sample(range(1, 7), 2 if i % 3 == 0 else 1)
                notes = [{'string': s, 'fret': rng.choice([0, 1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 19, 24, 'X'])} for s in strings]
                events.append({'x': x, 'duration': str(duration), 'notes': notes})
            c.setFont(font, 10)
            for event in events:
                for note in event['notes']:
                    text = str(note['fret'])
                    x, y = event['x'], top+(note['string']-1)*gap
                    w = stringWidth(text, font, 10)
                    c.setFillGray(1)
                    c.rect(x-w/2-.8, HEIGHT-y-4.7, w+1.6, 9.2, stroke=0, fill=1)
                    c.setFillGray(0)
                    c.drawString(x-w/2, HEIGHT-y-3.7, text)
            bars.append({'x': start, 'y': top, 'width': width, 'height': 45, 'events': events})
    c.showPage()
    c.save()
    return bars


def raster(source, target, dpi, blur=0, noise=False):
    prefix = target.with_suffix('')
    subprocess.run(['pdftoppm', '-singlefile', '-scale-to', str(round(WIDTH*dpi/72)), '-png', str(source), str(prefix)], check=True, capture_output=True)
    image = Image.open(prefix.with_suffix('.png')).convert('RGB')
    if blur:
        image = image.filter(ImageFilter.GaussianBlur(blur))
    if noise:
        rng = random.Random(1927)
        pixels = image.load()
        for _ in range(image.width*image.height//200):
            x, y = rng.randrange(image.width), rng.randrange(image.height)
            pixels[x, y] = (185, 185, 185)
    image.save(prefix.with_suffix('.png'))
    c = canvas.Canvas(str(target), pagesize=(WIDTH, HEIGHT), invariant=True)
    c.drawImage(ImageReader(image), 0, 0, WIDTH, HEIGHT)
    c.showPage()
    c.save()


cases = []
for font in FONTS:
    stem = font.lower()
    source = OUT / f'{stem}-native.pdf'
    bars = engrave(source, font)
    cases.append({'id': source.stem, 'path': str(source), 'font': font, 'variant': 'native', 'bars': bars})
    for variant, dpi, blur, noise in [('200dpi', 200, 0, False), ('110dpi', 110, 0, False), ('75dpi', 75, 0, False), ('blur', 110, .45, False), ('noise', 110, 0, True)]:
        target = OUT / f'{stem}-{variant}.pdf'
        raster(source, target, dpi, blur, noise)
        cases.append({'id': target.stem, 'path': str(target), 'font': font, 'variant': variant, 'bars': bars})
for name, gray, direction in [('faint-rhythm', 175, 1), ('upward-holdout', 0, -1)]:
    source = OUT / f'{name}-vector.pdf'
    bars = engrave(source, 'Helvetica', seed=97, rhythm_gray=gray, direction=direction)
    target = OUT / f'{name}.pdf'
    raster(source, target, 160)
    cases.append({'id': name, 'path': str(target), 'font': 'Helvetica', 'variant': name, 'holdout': True, 'bars': bars})
(OUT / 'manifest.json').write_text(json.dumps({'version': 1, 'width': WIDTH, 'height': HEIGHT, 'cases': cases}, indent=2), encoding='utf8')
print(f'Created {len(cases)} cases / {len(cases)*4} bars; oracle never enters the recognizer.')
