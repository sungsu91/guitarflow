"""Independent bass TAB engraving; expected notes never enter the importer."""
import json, subprocess, random, argparse
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.pdfbase.pdfmetrics import stringWidth
from PIL import Image

parser=argparse.ArgumentParser();parser.add_argument('--output',default='artifacts/ocr-instruments-20261005');parser.add_argument('--seed',type=int,default=149)
parser.add_argument('--extended',action='store_true')
args=parser.parse_args()
out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
W,H=595,400
cases=[]
profiles=[('bass4',{'instrument':'bass','tuning':[43,38,33,28]}),('bass5',{'instrument':'bass','tuning':[43,38,33,28,23]})]
if args.extended:profiles += [
 ('guitar7',{'instrument':'guitar','tuning':[64,59,55,50,45,40,35]}),
 ('guitar7-drop-a',{'instrument':'guitar','tuning':[64,59,55,50,45,40,33]}),
 ('ukulele-high-g',{'instrument':'ukulele','tuning':[69,64,60,67]}),
 ('ukulele-low-g',{'instrument':'ukulele','tuning':[69,64,60,55]})]
for profile,instrument_target in profiles:
 count=len(instrument_target['tuning'])
 for font in ('Helvetica','Times-Roman'):
  name=f'{profile}-{font.lower()}'
  pdf=out/f'{name}.pdf'
  c=canvas.Canvas(str(pdf),pagesize=(W,H),invariant=True)
  c.setFont('Helvetica',14);c.drawString(32,H-30,'Independent bass exercise')
  line=lambda x,y,a,b:c.line(x,H-y,a,H-b)
  bars=[];rng=random.Random(args.seed+count)
  for row,top in enumerate((110,260)):
   left,right,g=32,563,9;mid=(left+right)/2;bottom=top+(count-1)*g
   c.setStrokeGray(0);c.setLineWidth(.5)
   for s in range(count):line(left,top+s*g,right,top+s*g)
   for x in (left,mid,right):line(x,top,x,bottom)
   for col in range(2):
    index=row*2+col;start=left+col*(mid-left);width=mid-left
    durations=([4]*4,[8]*8,[8,16,16,8,8,8,8,4],[4,8,16,16,4,8,16,16])[index]
    xs=[start+27+i*(width-48)/(len(durations)-1) for i in range(len(durations))]
    end=bottom+g*2.5;events=[];beat=0
    c.setFont('Helvetica',10);c.drawString(start+12,H-top-(-18),('Em','A','D','B7')[index])
    for x in xs:c.setLineWidth(.8);line(x,bottom+g*.25,x,end)
    for i,(x,d) in enumerate(zip(xs,durations)):
     if d>=8:
      after=i+1<len(xs) and durations[i+1]>=8 and int(beat+4/d+.00001)==int(beat+.00001)
      before=i>0 and durations[i-1]>=8 and int(beat-.00001)==int(beat+.00001)
      target=xs[i+1] if after else xs[i-1] if before else x+g*1.1
      c.setLineWidth(2);line(x,end,target,end)
      if d==16:
       second=target if (after and durations[i+1]==16) or (before and durations[i-1]==16) else x+(g*.65 if after or not before else -g*.65)
       line(x,end-g*.6,second,end-g*.6)
     beat+=4/d
     strings=[i%count+1] if i%3 else [1,count]
     notes=[{'string':s,'fret':rng.choice([0,2,3,5,7,10,12])} for s in strings]
     events.append({'x':x,'duration':str(d),'notes':notes})
    c.setFont(font,10)
    for e in events:
     for n in e['notes']:
      text=str(n['fret']);x,y=e['x'],top+(n['string']-1)*g;w=stringWidth(text,font,10)
      c.setFillGray(1);c.rect(x-w/2-.8,H-y-4.7,w+1.6,9.2,stroke=0,fill=1)
      c.setFillGray(0);c.drawString(x-w/2,H-y-3.7,text)
    bars.append({'x':start,'y':top,'width':width,'events':events})
  c.showPage();c.save()
  subprocess.run(['pdftoppm','-singlefile','-scale-to','2083','-png',str(pdf),str(out/name)],check=True,capture_output=True)
  im=Image.open(out/f'{name}.png').convert('RGB');im.save(out/f'{name}.jpg',quality=85)
  for ext in ('pdf','png','jpg'):cases.append({'id':name+'-'+ext,'path':str(out/f'{name}.{ext}'),'target':instrument_target,'bars':bars})
(out/'manifest.json').write_text(json.dumps({'width':W,'height':H,'cases':cases},indent=2),encoding='utf8')
print('Created',len(cases),'independent bass PDF/image fixtures')
