"""Read-only asset audit; never rewrites supplied PNGs."""
import hashlib
import json
import sys
import zipfile
from pathlib import Path
from PIL import Image, ImageChops

root = Path(__file__).resolve().parents[1]
pack = root / 'public/assets/pets/fretiva_pet_sprite_pack_v1'
archive = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.home() / 'Downloads/FRETIVA_PET_SPRITE_PACK_V1.zip'
manifest_path = root / 'src/shooter/pets.manifest.json'
manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
report = {'unchangedFiles': 0, 'frames': 0, 'pets': []}
with zipfile.ZipFile(archive) as source:
    for entry in source.infolist():
        if entry.is_dir():
            continue
        relative = Path(*Path(entry.filename).parts[1:])
        target = manifest_path if relative.as_posix() == 'pets.manifest.json' else pack / relative
        assert hashlib.sha256(source.read(entry)).digest() == hashlib.sha256(target.read_bytes()).digest(), str(relative)
        report['unchangedFiles'] += 1

for pet in manifest['pets']:
    atlas = Image.open(pack / pet['atlas'])
    assert atlas.mode == 'RGBA' and atlas.size == (2048, 768)
    result = {'id': pet['id'], 'actions': []}
    for name, action in pet['actions'].items():
        bounds = []
        for index in range(action['frameCount']):
            frame = Image.open(pack / Path(pet['atlas']).parent / name / f'frame_{index:02d}.png')
            cell = atlas.crop((index * 256, action['row'] * 256, (index + 1) * 256, (action['row'] + 1) * 256))
            assert frame.mode == 'RGBA' and frame.size == (256, 256)
            # The source stores different RGB values in fully transparent pixels.
            # Compare alpha and visible compositing, without rewriting either asset.
            assert cell.getchannel('A').tobytes() == frame.getchannel('A').tobytes()
            for color in [(0, 0, 0, 255), (255, 255, 255, 255)]:
                background = Image.new('RGBA', frame.size, color)
                assert Image.alpha_composite(background, cell).tobytes() == Image.alpha_composite(background, frame).tobytes(), (pet['id'], name, index)
            alpha = frame.getchannel('A')
            # Some authored tails touch a corner; transparent area is the relevant check.
            assert alpha.histogram()[0] > 256 * 256 * 0.25
            bounds.append(alpha.getbbox())
            report['frames'] += 1
        result['actions'].append({'name': name, 'fps': action['fps'], 'bounds': bounds})
    report['pets'].append(result)
destination = root / 'artifacts/shooter-sprite-pets/asset-audit.json'
destination.parent.mkdir(parents=True, exist_ok=True)
destination.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({key: report[key] for key in ['unchangedFiles', 'frames']}))
