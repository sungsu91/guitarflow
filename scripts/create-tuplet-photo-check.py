from pathlib import Path
from PIL import Image
root=Path('artifacts/ocr-followup-20261005/roundtrip')
for version in ['before','after']:
    im=Image.open(root/('before-render.png' if version=='before' else 'pdf-render.png')).convert('RGB')
    im=im.resize((900,round(im.height*900/im.width)),Image.Resampling.LANCZOS)
    pixels=im.load()
    # Smooth illumination gradient changes contrast without erasing symbols.
    for y in range(im.height):
        for x in range(im.width):
            shadow=.64+.32*x/im.width
            pixels[x,y]=tuple(round(v*shadow) for v in pixels[x,y])
    im.rotate(.8,resample=Image.Resampling.BICUBIC,expand=True,fillcolor=(220,220,220)).save(root/(version+'-stress.jpg'),quality=50)
