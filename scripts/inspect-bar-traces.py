import json, math
from pathlib import Path
from PIL import Image
root=Path('artifacts/ocr-followup-20261005/boundaries')
for name,row,left,right in [('academy-3',6,600,675),('academy-5',0,1410,1480)]:
    g=json.loads((root/(name+'.json')).read_text())[0]['geometry']; s=g['staffs'][row]
    img=Image.open(root/(name+'-2083-clean.png')).convert('L'); pix=img.load(); top=s['lines'][0];bottom=s['lines'][-1];gap=s['spacing'];mid=(top+bottom)/2
    img.crop((left-25,top-40,right+25,bottom+40)).resize(((right-left+50)*4,(bottom-top+80)*4)).save(root/(name+'-bar-detail.png'))
    def dark(x,y): return int(pix[math.floor(x+.5),math.floor(y+.5)]<180)
    print('rules',name,s['thickness'],[round(sum(any(dark(x,line+dy) for dy in range(-math.ceil(s['thickness']/2),math.ceil(s['thickness']/2)+1)) for x in range(s['x'],s['x']+s['width']+1))/(s['width']+1),3) for line in s['lines']])
    hits=[]
    for x in range(left,right):
      for drift in range(-gap,gap+1):
        at=lambda y:x+(y-mid)*drift/(bottom-top)
        cov=sum(dark(at(y),y) for y in range(top,bottom+1))/(bottom-top+1)
        if cov<.93: continue
        ext=0
        for edge,sign in [(bottom,1),(top,-1)]:
          for k in range(2,math.ceil(gap*.75)):
            if not dark(at(edge+k*sign),edge+k*sign): break
            ext+=1
        side=[]
        for y in range(top+2,bottom-2):
          if any(abs(line-y)<gap*.22 for line in s['lines']):continue
          for dx in range(math.ceil(gap*.15),math.ceil(gap*.43)):
            for sign in [-1,1]:side.append(dark(at(y)+sign*dx,y))
        hits.append((round(cov,3),x,drift,ext,round(sum(side)/len(side),3)))
    print(name,s['lines'],sorted(hits,reverse=True)[:12])
