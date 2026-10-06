"""Non-destructive adverse photos of independently sourced scores (no AI images).
Original downloads are local; no user photograph is copied into the repository.
"""
import argparse, hashlib, json
from pathlib import Path
from PIL import Image, ImageFilter

p=argparse.ArgumentParser()
p.add_argument('--root',default='artifacts/external-ocr-20261005')
p.add_argument('--camera',action='append',default=[])
p.add_argument('--camera-audit',help='Optional manual oracle keyed by the original photo SHA-256')
a=p.parse_args(); root=Path(a.root); originals=root/'originals'; variants=root/'variants'; variants.mkdir(parents=True,exist_ok=True)
def event(duration,*notes,rest=False): return dict(duration=str(duration),notes=sorted([list(n) for n in notes]),**({'rest':True} if rest else {}))
def melody(notes,durations): return [event(d,n) for n,d in zip(notes,durations)]
sources=json.loads((Path(__file__).resolve().parent.parent/'tests/fixtures/external-score/sources.json').read_text(encoding='utf8'))
for s in sources:
 if hashlib.sha256((originals/s['file']).read_bytes()).hexdigest()!=s['sha256']:raise ValueError(f"Changed source bytes: {s['id']}")
oracles={
 'lick':dict(scope='All 2 bars manually read from original pixels, including tied continuation; no OCR-derived truth',bars=[
 dict(number=1,events=[event(2,rest=True)]+melody([(2,5),(1,2),(1,3),(1,5)],[8]*4)),
 dict(number=2,events=melody([(1,2),(2,3),(2,5),(2,5)],[4,8,8,4])+[event(4,rest=True)])]),
 'picking':dict(scope='Only first 5 bars manually read from original PDF; not overall accuracy',bars=[
 dict(number=1,events=[event(1,(1,0),(2,1),(3,0),(4,2),(5,3))]),
 dict(number=2,events=melody([(5,3),(4,2),(3,0),(2,1),(1,0)],[8,8,8,8,2])),
 dict(number=3,events=melody([(1,0),(2,1),(3,0),(4,2),(5,3)],[8,8,8,8,2])),
 dict(number=4,events=melody([(5,3),(4,2),(3,0),(2,1),(1,0),(2,1),(3,0),(4,2)],[8]*8)),
 dict(number=5,events=melody([(1,0),(2,1),(3,0),(4,2),(5,3),(4,2),(3,0),(2,1)],[8]*8))])}
cases=[dict(id='lick-original',group='original',path=str(originals/'lick.png'),image=True,expectedBars=2,oracle='lick'),dict(id='picking-pdf',group='original',path=str(originals/'picking.pdf'),expectedBars=25,oracle='picking'),dict(id='carcassi-pdf',group='original',path=str(originals/'carcassi.pdf'),mode='staff',expectedBars=43,timeout=480000)]
audit=json.loads(Path(a.camera_audit).read_text(encoding='utf8')) if a.camera_audit else {}
oracles.update(audit.get('oracles',{}))
for i,path in enumerate(a.camera):
 truth=audit.get('byHash',{}).get(hashlib.sha256(Path(path).read_bytes()).hexdigest(),{})
 cases.append(dict(id=f'camera-{i+1}-original',group='original',path=path,image=True,expectedBars=truth.get('expectedBars'),oracle=truth.get('oracle')))

def shade(im,minimum):
 pixels=im.load();w,h=im.size
 for y in range(h):
  for x in range(w):
   f=minimum+(1-minimum)*(x/w)*.8
   pixels[x,y]=tuple(round(c*f) for c in pixels[x,y])
 return im

for name in ['lick','picking']:
 im=Image.open(originals/f'{name}.png').convert('RGB');im.thumbnail((1800,1800))
 # Reserved variants are evaluated only after a candidate fix, never tuned upon.
 for tag,angle,shadow,blur,quality,scale in [
  ('raster',0,1,0,95,1),('tilt',1.5,1,0,95,1),('shadow',0,.40,0,90,1),
  ('compression',0,1,.4,25,.75),('combined',-2,.55,.45,40,.85),
  ('holdout-opposite',-1.1,.72,.3,55,.90),('holdout-heavy',3.5,.35,.8,20,.60)]:
  photo=im.copy()
  if shadow<1:photo=shade(photo,shadow)
  if scale!=1:photo=photo.resize((round(photo.width*scale),round(photo.height*scale)),Image.Resampling.LANCZOS)
  if angle:photo=photo.rotate(angle,Image.Resampling.BICUBIC,expand=True,fillcolor='white')
  if blur:photo=photo.filter(ImageFilter.GaussianBlur(blur))
  file=variants/f'{name}-{tag}.jpg';photo.save(file,quality=quality)
  cases.append(dict(id=f'{name}-{tag}',group='holdout' if tag.startswith('holdout') else 'adverse',path=str(file),image=True,expectedBars=2 if name=='lick' else 25,oracle=name,conditions=dict(angle=angle,minimumBrightness=shadow,blurRadius=blur,jpegQuality=quality,scale=scale)))
blank=variants/'blank.jpg';Image.new('RGB',(1200,1600),'white').save(blank)
broken=variants/'broken.jpg';broken.write_bytes(b'not an image')
for name in ['blank','broken']:cases.append(dict(id=name,group='negative',path=str(variants/f'{name}.jpg'),image=True,expectedError=True,expectedBars=0))
if a.camera:
 im=Image.open(a.camera[0]).convert('RGB')
 photo=shade(im.copy(),.75).rotate(-.8,Image.Resampling.BICUBIC,expand=True,fillcolor='white').filter(ImageFilter.GaussianBlur(.25))
 file=variants/'camera-heldout.jpg';photo.save(file,quality=60)
 source=next(c for c in cases if c['id']=='camera-1-original')
 cases.append(dict(id='camera-heldout',group='holdout',path=str(file),image=True,expectedBars=source['expectedBars'],oracle=source['oracle'],conditions=dict(angle=-.8,minimumBrightness=.75,blurRadius=.25,jpegQuality=60)))
(root/'manifest.json').write_text(json.dumps(dict(version=1,sources=sources,oracles=oracles,cases=cases),indent=2),encoding='utf8')
print(json.dumps(dict(cases=len(cases),manifest=str(root/'manifest.json'))))
