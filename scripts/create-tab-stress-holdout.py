"""New, independent music/raster fixtures. Expected notes never reach OCR."""
import argparse, json, random, subprocess
from pathlib import Path
from PIL import Image, ImageFilter
from reportlab.pdfgen import canvas
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.lib.utils import ImageReader

parser=argparse.ArgumentParser()
parser.add_argument('--output',default='artifacts/ocr-stress-20261004/fixtures')
parser.add_argument('--seed-start',type=int,default=431)
parser.add_argument('--shuffle',action='store_true')
parser.add_argument('--tilt',type=float,default=1.2)
args=parser.parse_args()
OUT=Path(args.output); OUT.mkdir(parents=True,exist_ok=True)
W,H=595,480
patterns=[[(8,True),(16,False),(8,False),(8,False),(4,False),(8,False),(8,False)],
          [(4,False)]+[(16,False)]*4+[(8,False)]*4,
          [(16,False)]*4+[(8,False)]*2+[(4,False)]*2,
          [(4,True),(8,False),(4,False),(4,False)]]
cases=[]
for seed,font in enumerate(['Helvetica','Times-Roman','Courier','Helvetica-Bold'],args.seed_start):
    rng=random.Random(seed); bars=[]; target=OUT/f'mixed-{seed}-native.pdf'
    c=canvas.Canvas(str(target),pagesize=(W,H),invariant=True)
    c.setFont('Helvetica',13); c.drawString(32,H-25,'Independent mixed rhythm exercise')
    line=lambda x,y,xx,yy:c.line(x,H-y,xx,H-yy)
    for row,top in enumerate([105,235,365]):
        gap,left=9,32; right=563 if row<2 else 252
        c.setStrokeGray(0);c.setLineWidth(.5)
        for s in range(6):line(left,top+s*gap,right,top+s*gap)
        # A short ending system and a long annotation just above another system
        # expose whole-system loss without using any real score coordinates.
        if row==1:line(left,top-gap,380,top-gap)
        edges=[left,(left+right)/2,right] if row<2 else [left,right]
        for x in edges:line(x,top,x,top+gap*5)
        for col,(start,end) in enumerate(zip(edges,edges[1:])):
            pattern=list(patterns[(seed+row*2+col)%len(patterns)])
            if args.shuffle:rng.shuffle(pattern)
            xs=[start+22+i*(end-start-40)/(len(pattern)-1) for i in range(len(pattern))]
            events=[];onset=0;beam=top+gap*7.5
            for i,((duration,dotted),x) in enumerate(zip(pattern,xs)):
                c.setStrokeGray(0);c.setLineWidth(.8);line(x,top+gap*5.2,x,beam)
                if duration>=8:
                    previous=i>0 and pattern[i-1][0]>=8
                    nxt=i+1<len(xs) and pattern[i+1][0]>=8
                    dest=xs[i+1] if nxt else xs[i-1] if previous else x+8
                    c.setLineWidth(2);line(x,beam,dest,beam)
                    if duration==16:
                        dest2=xs[i+1] if nxt and pattern[i+1][0]==16 else xs[i-1] if previous and pattern[i-1][0]==16 else x+(6 if nxt or not previous else -6)
                        line(x,beam-gap*.65,dest2,beam-gap*.65)
                if dotted:c.circle(x+gap*.45,H-(beam-gap*.35),1.2,stroke=0,fill=1)
                notes=[{'string':s,'fret':rng.choice([0,1,2,3,5,7,9,10,12,'X'])} for s in rng.sample(range(1,7),2 if i%3==0 else 1)]
                events.append({'x':x,'duration':str(duration),'dotted':dotted,'notes':notes});onset+=1920/duration*(1.5 if dotted else 1)
            assert onset==1920
            c.setFont(font,10)
            for event in events:
                for note in event['notes']:
                    text=str(note['fret']);x=event['x'];y=top+(note['string']-1)*gap;tw=stringWidth(text,font,10)
                    c.setFillGray(1);c.rect(x-tw/2-.8,H-y-4.7,tw+1.6,9.2,stroke=0,fill=1)
                    c.setFillGray(0);c.drawString(x-tw/2,H-y-3.7,text)
            bars.append({'x':start,'y':top,'width':end-start,'height':45,'events':events})
    c.showPage();c.save()
    cases.append({'id':target.stem,'path':str(target),'bars':bars,'variant':'native'})
    for variant,dpi,blur,angle in [('scan',160,0,0),('blur',95,.4,0),('tilt',160,0,args.tilt)]:
        prefix=OUT/f'mixed-{seed}-{variant}'
        subprocess.run(['pdftoppm','-singlefile','-r',str(dpi),'-png',str(target),str(prefix)],check=True,capture_output=True)
        im=Image.open(prefix.with_suffix('.png')).convert('RGB')
        if blur:im=im.filter(ImageFilter.GaussianBlur(blur))
        if angle:im=im.rotate(angle,resample=Image.Resampling.BICUBIC,fillcolor='white')
        im.save(prefix.with_suffix('.png'))
        c=canvas.Canvas(str(prefix.with_suffix('.pdf')),pagesize=(W,H),invariant=True);c.drawImage(ImageReader(im),0,0,W,H);c.showPage();c.save()
        cases.append({'id':prefix.name,'path':str(prefix.with_suffix('.pdf')),'bars':bars,'variant':variant,'angle':angle})
(OUT/'manifest.json').write_text(json.dumps({'width':W,'height':H,'cases':cases},indent=2),encoding='utf8')
print('Created',len(cases),'new cases /',sum(len(c['bars']) for c in cases),'bars')
