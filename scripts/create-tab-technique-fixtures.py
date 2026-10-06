"""Independent engraving oracle for import techniques; no app renderer is used."""
import json, subprocess
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.lib.utils import ImageReader
from PIL import Image, ImageFilter
OUT=Path('artifacts/ocr-techniques-20261004/fixtures'); OUT.mkdir(parents=True,exist_ok=True)
W,H=595,720
cases=[]
for font in ['Helvetica','Times-Roman','Courier','Helvetica-Bold']:
    target=OUT/(font.lower()+'-native.pdf'); c=canvas.Canvas(str(target),pagesize=(W,H),invariant=True)
    bars=[]
    def line(x,y,xx,yy):c.line(x,H-y,xx,H-yy)
    for row in range(4):
        g,left,right,top=10,35,560,90+row*155
        for s in range(6):c.setLineWidth(.45);line(left,top+s*g,right,top+s*g)
        for x in [left,297.5,right]:line(x,top,x,top+5*g)
        for col in range(2):
            start,end=([left,297.5] if col==0 else [297.5,right]); bar=row*2+col
            xs=[start+43+i*(end-start-65)/7 for i in range(8)]
            events=[]; stemEnd=top+7.5*g
            for i,x in enumerate(xs):
                c.setStrokeGray(0);c.setLineWidth(.75);line(x,top+5*g+.8,x,stemEnd)
                if i%2==0:c.setLineWidth(2);line(x,stemEnd,xs[i+1],stemEnd)
                harmonic=bar in [2,3,4] and i in [0,4]
                if harmonic:notes=[{'string':s,'fret':[5,7,12][bar-2],'harmonic':True} for s in [1,2,3]]
                elif i==0:notes=[{'string':s,'fret':f} for s,f in [(1,0),(2,1),(3,0),(5,3)]]
                else:notes=[{'string':2+i%4,'fret':[2,0,10,12,1,3,4][i-1]}]
                event={'x':x,'duration':'8','notes':notes}
                if i==0 and bar in [0,1,2,3]:event['arpeggio']='up' if bar%2==0 else 'down'
                events.append(event)
            if bar==5:
                events[3]['notes']=[dict(n) for n in events[2]['notes']]
                events[3]['tieContinuation']=True
                x=events[2]['x'];y=top+(events[2]['notes'][0]['string']-1)*g+g*.2
                c.setLineWidth(.8);p=c.beginPath();p.moveTo(x+g*.55,H-y);p.curveTo(x+g*.8,H-y-g*.6,x+g*1.6,H-y-g*.6,x+g*1.8,H-y);c.drawPath(p,stroke=1,fill=0)
            # Spines and both arrow directions. One plain wavy sign has no
            # arrow and must not silently acquire a direction.
            if bar in [0,1,2,3,6]:
                x=xs[0]-(g*1.5 if bar in [2,3] else g)
                ys=[top-4+i*2 for i in range(25)]
                c.setLineWidth(1.3)
                for j in range(len(ys)-1):line(x+(-1 if j%2 else 1),ys[j],x+(-1 if (j+1)%2 else 1),ys[j+1])
                if bar!=6:
                    tip=top-10 if bar%2==0 else top+51; base=tip+(7 if bar%2==0 else -7)
                    p=c.beginPath();p.moveTo(x,H-tip);p.lineTo(x-3.7,H-base);p.lineTo(x+3.7,H-base);p.close();c.drawPath(p,stroke=0,fill=1)
            c.setFont(font,11)
            for e in events:
                if e.get('tieContinuation'):continue
                for n in e['notes']:
                    text=('<'+str(n['fret'])+'>') if n.get('harmonic') else str(n['fret'])
                    if n.get('harmonic') and bar==4:text='('+text+')'
                    x=e['x'];y=top+(n['string']-1)*g;tw=stringWidth(text,font,11)
                    c.setFillGray(1);c.rect(x-tw/2-.8,H-y-5,tw+1.6,10,fill=1,stroke=0)
                    c.setFillGray(0);c.drawString(x-tw/2,H-y-4,text)
            bars.append({'x':start,'y':top,'width':end-start,'events':events})
    c.showPage();c.save();cases.append({'id':target.stem,'path':str(target),'bars':bars})
    for variant,dpi,blur in [('scan',180,0),('weak',120,.25)]:
        prefix=OUT/(font.lower()+'-'+variant)
        subprocess.run(['pdftoppm','-singlefile','-r',str(dpi),'-png',str(target),str(prefix)],check=True,capture_output=True)
        im=Image.open(prefix.with_suffix('.png')).convert('RGB')
        if blur:im=im.filter(ImageFilter.GaussianBlur(blur))
        c=canvas.Canvas(str(prefix.with_suffix('.pdf')),pagesize=(W,H),invariant=True);c.drawImage(ImageReader(im),0,0,W,H);c.showPage();c.save()
        cases.append({'id':prefix.name,'path':str(prefix.with_suffix('.pdf')),'bars':bars})
(OUT/'manifest.json').write_text(json.dumps({'width':W,'height':H,'cases':cases},indent=2),encoding='utf8')
print('Created',len(cases),'independent technique cases')
