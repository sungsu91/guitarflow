"""Independent seeded engraving/oracle for 4..32, tuplets and dense TAB.

ReportLab draws the music; no application model/OCR code supplies the oracle.
All exercises are newly generated and may be redistributed (CC0).
"""
import argparse, json, math, random, subprocess, io
from pathlib import Path
from PIL import Image, ImageFilter
from reportlab.pdfgen import canvas
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.lib.utils import ImageReader

p=argparse.ArgumentParser();p.add_argument('--output',default='artifacts/32nd-support/fixtures');p.add_argument('--seed',type=int,default=32051)
p.add_argument('--explore',action='store_true',help='New mixed rhythms and real JPEG/photo-batch inputs')
p.add_argument('--font',choices=['Helvetica','Times-Roman','Courier'])
a=p.parse_args();out=Path(a.output);out.mkdir(parents=True,exist_ok=True)
W,H=842,595
patterns=[('quarter',[4]*4,None),('eighth',[8]*8,None),('sixteenth',[16]*16,None),('thirty-second',[32]*32,None),
 ('mixed',[16,32,32]*8,None),('triplet-eighth',[8]*12,(3,2)),('sextuplet-sixteenth',[16]*24,(6,4)),
 ('triplet-thirty-second',[32]*48,(3,2)),('rests-ties',[8]*4+[16]*4+[32]*8,None),('quarter-triplet',[4]*6,(3,2))]
cases=[]

def engrave(target,font,seed,line_width=.5,beam_width=2,beam_gap=5.6,direction=1):
 rng=random.Random(seed);c=canvas.Canvas(str(target),pagesize=(W,H),invariant=True);bars=[];counter=0
 for bi,(kind,durations,ratio) in enumerate(patterns):
  durations=list(durations)
  if a.explore and kind in ['mixed','rests-ties']:
   rng.shuffle(durations)
  page=bi//3+1;row=bi%3;top=95+row*155;gap=9;left,right=32,W-32;edge=top+45 if direction==1 else top;end=edge+direction*25
  if row==0:c.setFont('Helvetica',13);c.drawString(32,H-28,'Original TAB duration laboratory / CC0')
  line=lambda x,y,xx,yy:c.line(x,H-y,xx,H-yy)
  c.setStrokeGray(0);c.setLineWidth(line_width)
  for s in range(6):line(left,top+s*gap,right,top+s*gap)
  for x in [left,right]:line(x,top,x,top+45)
  xs=[left+22+i*(right-left-45)/(len(durations)-1) for i in range(len(durations))]
  events=[];onset=0
  for i,(d,x) in enumerate(zip(durations,xs)):
   rest=kind=='rests-ties' and i in [0,5,11]
   frets=[counter%25] if kind=='thirty-second' else [rng.choice([1,11,2,12,0,10,5,15,7,17,9,19,24])]
   strings=[1 if kind in ['thirty-second','mixed'] else i%6+1]
   if i%7==0 and not rest:strings=[1,2,6];frets=[counter%25,(counter+1)%25,0]
   notes=[] if rest else [dict(string=s,fret=f) for s,f in zip(strings,frets if len(frets)>1 else frets*len(strings))]
   if kind=='rests-ties' and i==3:notes=events[2]['notes']
   e=dict(x=x,onset=onset,duration=str(d),notes=notes,rest=rest,tie=kind=='rests-ties' and i==2,tuplet=dict(actualNotes=ratio[0],normalNotes=ratio[1],group=i//ratio[0]) if ratio else None)
   events.append(e);onset+=1920/d*(ratio[1]/ratio[0] if ratio else 1);counter+=1
  assert onset==1920,(kind,onset)
  for i,e in enumerate(events):
   x=e['x'];d=int(e['duration']);c.setFillGray(0);c.setStrokeGray(0)
   if e['rest']:
    # Conventional hooked rests: one/two/three separated lobes and a slant stem.
    levels=int(math.log2(d/4));cy=top+22.5;low=cy+4+levels*2.7
    c.setLineWidth(.8);line(x+3,low,x+6,low-9-levels*5)
    for j in range(levels):
     yy=low-9-j*5;c.ellipse(x-3,H-yy-2,x+1,H-yy+2,stroke=0,fill=1);line(x-1,yy+1,x+5-j*.5,yy-1)
    continue
   c.setLineWidth(.8);line(x,edge+direction*2,x,end)
   for level in range(max(0,int(math.log2(d/4)))):
    threshold=8*2**level;next_ok=i+1<len(events) and not events[i+1]['rest'] and int(events[i+1]['duration'])>=threshold and (not ratio or (i+1)//ratio[0]==i//ratio[0])
    prev_ok=i>0 and not events[i-1]['rest'] and int(events[i-1]['duration'])>=threshold and (not ratio or (i-1)//ratio[0]==i//ratio[0])
    dest=xs[i+1] if next_ok else xs[i-1] if prev_ok else x+6
    c.setLineWidth(beam_width);line(x,end-direction*level*beam_gap,dest,end-direction*level*beam_gap)
   if e['tie']:
    yy=top+(e['notes'][0]['string']-1)*gap-5;path=c.beginPath();path.moveTo(x+3,H-yy);path.curveTo(x+7,H-yy+6,xs[i+1]-7,H-yy+6,xs[i+1]-3,H-yy);c.setLineWidth(.6);c.drawPath(path)
  c.setFont(font,10)
  for e in events:
   for n in e['notes']:
    text=str(n['fret']);tw=stringWidth(text,font,10);x=e['x'];y=top+(n['string']-1)*gap
    c.setFillGray(1);c.rect(x-tw/2-.7,H-y-4.7,tw+1.4,9.2,stroke=0,fill=1);c.setFillGray(0);c.drawString(x-tw/2,H-y-3.7,text)
  if ratio:
   for i in range(0,len(events),ratio[0]):
    x1,x2=xs[i],xs[i+ratio[0]-1];y=end+direction*11;center=(x1+x2)/2;c.setLineWidth(.6)
    line(x1,y,x1,y-direction*3);line(x1,y,center-5,y);line(center+5,y,x2,y);line(x2,y,x2,y-direction*3)
    c.setFont('Helvetica',8);c.drawCentredString(center,H-y-3,str(ratio[0]))
  bars.append(dict(page=page,measure=bi+1,kind=kind,x=left,y=top,width=right-left,height=45,events=events))
  if row==2 or bi==len(patterns)-1:c.showPage()
 c.save();return bars

for fi,font in enumerate(['Helvetica','Times-Roman','Courier']):
 if a.font and font!=a.font:continue
 if a.explore:
  name=f'{font.lower()}-novel';native=out/f'{name}.pdf';bars=engrave(native,font,a.seed+fi)
  cases.append(dict(id=name,path=str(native),font=font,variant='novel',lowResolution=False,heldout=True,bars=bars))
  prefix=out/f'{font.lower()}-photo-source'
  subprocess.run(['pdftoppm','-r','160','-png',str(native),str(prefix)],check=True,capture_output=True)
  for variant in ['photo-clean','photo-tilt','photo-shadow','photo-compressed','photo-combined']:
   paths=[]
   for index,png in enumerate(sorted(out.glob(prefix.name+'-*.png'))):
    im=Image.open(png).convert('RGB')
    if variant in ['photo-shadow','photo-combined']:
     # Multiplicative uneven illumination, not a painted rectangle over notes.
     ramp=Image.new('L',(im.width,1));ramp.putdata([int(255*(.50+.48*x/max(1,im.width-1))) for x in range(im.width)])
     from PIL import ImageChops
     im=ImageChops.multiply(im,ramp.resize(im.size).convert('RGB'))
    if variant in ['photo-tilt','photo-combined']:im=im.rotate(1.4,Image.Resampling.BICUBIC,fillcolor='white')
    if variant=='photo-combined':im=im.filter(ImageFilter.GaussianBlur(.35))
    path=out/f'{font.lower()}-{variant}-{index+1}.jpg';im.save(path,quality=45 if variant in ['photo-compressed','photo-combined'] else 92);paths.append(str(path))
   cases.append(dict(id=f'{font.lower()}-{variant}',paths=paths,font=font,variant=variant,sourceType='image',lowResolution=variant in ['photo-compressed','photo-combined'],heldout=True,bars=bars))
  continue
 for variant,dpi,blur,jpeg,down,linew,beamw,direction in [
  ('native',0,0,0,False,.5,2,1),('high',200,0,0,False,.5,2,1),('medium',120,0,0,False,.5,2,1),
  ('low',75,0,0,False,.5,2,1),('blur',110,.45,0,False,.5,2,1),('jpeg',110,0,40,False,.5,2,1),
  ('down-up',110,0,0,True,.5,2,1),('thick',120,0,0,False,.9,2.6,1),('thin',120,0,0,False,.3,1.4,1),
  ('up',120,0,0,False,.5,2,-1),('close-beams',120,0,0,False,.5,2,1),('heldout',140,.15,65,False,.6,1.8,1)]:
  name=f'{font.lower()}-{variant}';native=out/f'{name}-source.pdf';bars=engrave(native,font,a.seed+fi+(97 if variant=='heldout' else 0),linew,beamw,3.6 if variant=='close-beams' else 5.6,direction)
  target=out/f'{name}.pdf'
  if dpi:
   subprocess.run(['pdftoppm','-r',str(dpi),'-png',str(native),str(out/name)],check=True,capture_output=True)
   c=canvas.Canvas(str(target),pagesize=(W,H),invariant=True)
   for png in sorted(out.glob(name+'-*.png')):
    im=Image.open(png).convert('RGB')
    if down:im=im.resize((im.width//2,im.height//2)).resize(im.size,Image.Resampling.BICUBIC)
    if blur:im=im.filter(ImageFilter.GaussianBlur(blur))
    if jpeg:
     stream=io.BytesIO();im.save(stream,format='JPEG',quality=jpeg);stream.seek(0);im=Image.open(stream).copy()
    im.save(png);c.drawImage(ImageReader(im),0,0,W,H);c.showPage()
   c.save()
  else:target.write_bytes(native.read_bytes())
  cases.append(dict(id=name,path=str(target),font=font,variant=variant,lowResolution=variant in ['low','blur','jpeg','down-up'],heldout=variant=='heldout',bars=bars))
(out/'manifest.json').write_text(json.dumps(dict(width=W,height=H,seed=a.seed,license='CC0',cases=cases),indent=2),encoding='utf8')
print('Created',len(cases),'cases,',len(cases)*len(patterns),'bars')
