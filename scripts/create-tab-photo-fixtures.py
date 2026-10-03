"""Image-input fixtures derived only from our own synthetic TAB corpus."""
from pathlib import Path
from PIL import Image, ImageFilter

out = Path('artifacts/tab-photo/fixtures')
out.mkdir(parents=True, exist_ok=True)
source = Image.open('artifacts/pdf-tab-corpus/helvetica-200dpi.png').convert('RGB')
source.save(out / 'score.png')
source.save(out / 'score.JPG', quality=90)
source.save(out / 'compressed.jpeg', quality=35)
sideways = source.transpose(Image.Transpose.ROTATE_90)
sideways.save(out / 'sideways.png')
exif = Image.Exif()
exif[274] = 6
sideways.save(out / 'camera-exif.jpg', quality=90, exif=exif)
rgba = source.convert('RGBA')
rgba.putalpha(source.convert('L').point(lambda value: 0 if value > 245 else 255))
rgba.save(out / 'transparent.png')
source.rotate(3, expand=True, fillcolor='white').save(out / 'skewed.png')
source.filter(ImageFilter.GaussianBlur(1.3)).save(out / 'blurred.jpg', quality=55)
Image.new('RGB', (800, 600), 'white').save(out / 'blank.jpg')
(out / 'broken.png').write_bytes(b'not an image')
print(out)
