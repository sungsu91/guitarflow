"""Adversarial PDF containers around independently engraved original TAB."""
from pathlib import Path
from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas

out = Path('artifacts/pdf-tab-release/fixtures')
out.mkdir(parents=True, exist_ok=True)
source = PdfReader('artifacts/pdf-tab-corpus/helvetica-native.pdf')
def save(writer, name):
    with (out / (name + '.pdf')).open('wb') as f:
        writer.write(f)

for count in [20, 21]:
    w = PdfWriter()
    for _ in range(count):
        w.add_page(source.pages[0])
    save(w, f'pages-{count}')
w = PdfWriter(); w.add_page(source.pages[0]); w.encrypt('test-password'); save(w, 'encrypted')
for rotation in [90, 180, 270]:
    w = PdfWriter(); w.add_page(source.pages[0]).rotate(rotation); save(w, f'rotated-{rotation}')
w = PdfWriter(); w.add_blank_page(595, 842); save(w, 'blank')
w = PdfWriter(); w.add_page(source.pages[0]); w.add_blank_page(595, 842); w.add_page(source.pages[0]); save(w, 'blank-middle')
for name, size in [('huge', (100000, 100000)), ('thin', (100000, 10)), ('tiny', (1, 1))]:
    w = PdfWriter(); w.add_blank_page(*size); save(w, name)
c = canvas.Canvas(str(out / 'staff-only.pdf'), pagesize=(595, 842))
c.setFont('Helvetica', 14); c.drawString(35, 800, 'Standard notation only - original test')
for y in [650, 480, 310]:
    for line in range(5): c.line(35, y+line*10, 560, y+line*10)
    for x in [80, 190, 310, 440]:
        c.ellipse(x, y+8, x+12, y+16, fill=1); c.line(x+12, y+12, x+12, y+45)
c.save()
(out / 'empty.pdf').write_bytes(b'')
(out / 'truncated.pdf').write_bytes(Path('artifacts/pdf-tab-corpus/helvetica-native.pdf').read_bytes()[:300])
print('Created 14 boundary fixtures')
