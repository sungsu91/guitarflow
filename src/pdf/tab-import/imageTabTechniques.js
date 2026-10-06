// Geometric evidence is separate from digit OCR. Technique signs must never
// become an extra fret or change a confidently detected rhythm column.
export function angleDirection(clean,width,part,g){
 if(part.width<g*.3||part.width>g*.85||part.height<g*.35||part.height>g*.8)return null;
 const rows=[];
 for(let y=part.y;y<part.y+part.height;y++){
  const xs=[];for(let x=part.x;x<part.x+part.width;x++)if(clean[y*width+x])xs.push(x-part.x);
  if(xs.length)rows.push({y:(y-part.y)/(part.height-1),x:xs.reduce((a,b)=>a+b,0)/xs.length});
 }
 if(rows.length<part.height*.85)return null;
 const edge=rows.filter(r=>r.y<.2||r.y>.8),middle=rows.filter(r=>r.y>.4&&r.y<.6);
 const mean=rs=>rs.reduce((a,b)=>a+b.x,0)/rs.length;
 if(!middle.length||Math.abs(mean(edge)-mean(middle))<part.width*.48)return null;
 const direction=mean(edge)>mean(middle)?'left':'right';
 const groups=[rows.filter(r=>r.y<.25),rows.filter(r=>r.y>.75)];
 if(Math.abs(mean(groups[0])-mean(groups[1]))>part.width*.25)return null;
 return direction;
}

export function markHarmonicParts(clean,width,staff,parts){
 const g=staff.spacing,angles=new Map(parts.map(p=>[p,angleDirection(clean,width,p,g)]));
 for(let i=0;i<parts.length;i++){
  const left=parts[i];if(angles.get(left)!=='left')continue;
  for(let count=1;count<=2;count++){
   const digits=parts.slice(i+1,i+1+count),right=parts[i+1+count];
   if(!right||angles.get(right)!=='right'||right.string!==left.string||digits.some(p=>p.string!==left.string||p.nonFretSymbol||angles.get(p)||p.height<g*.6))continue;
   const gapA=digits[0].x-left.x-left.width,gapB=right.x-digits.at(-1).x-digits.at(-1).width;
   if(gapA<0||gapB<0||gapA>g*.25||gapB>g*.25||digits.at(-1).x+digits.at(-1).width-digits[0].x>g*1.35||Math.abs(left.cy-right.cy)>g*.15)continue;
   left.nonFretSymbol=right.nonFretSymbol='harmonic-bracket';
   for(const digit of digits)digit.harmonic=true;
   break;
  }
 }
}

function arrowHead(ink,width,height,x,from,to,g,direction){
 const row=y=>{
  if(y<0||y>=height)return null;
  const xs=[];for(let dx=-Math.ceil(g*.5);dx<=g*.5;dx++)if(ink[Math.round(y)*width+Math.round(x+dx)])xs.push(dx);
  return xs.length?{width:xs.at(-1)-xs[0]+1,center:(xs.at(-1)+xs[0])/2}:null;
 };
 for(let tip=Math.ceil(from);tip<=to;tip++)for(const length of [.45,.6,.75]){
  const a=row(tip+direction*g*length*.12),b=row(tip+direction*g*length*.8);
  if(!a||!b||a.width>g*.28||b.width<g*.38||b.width>g*.9||b.width-a.width<g*.2||Math.abs(a.center)>g*.13||Math.abs(b.center)>g*.13)continue;
  let supported=0,total=0;
  for(let k=0;k<g*length;k++){const r=row(tip+direction*k);total++;if(r&&Math.abs(r.center)<g*.18&&r.width>=Math.max(1,g*.1))supported++;}
  if(supported/total>.85)return true;
 }
 return false;
}

export function attachRasterArpeggios(ink,width,height,staff,parts){
 const g=staff.spacing;
 for(const measure of staff.measures)for(const r of measure.rhythm){
  if(r.rest)continue;
  const chord=staff.candidates.filter(c=>!c.nonFretSymbol&&Math.abs(c.cx-r.x)<g*.35);
  if(new Set(chord.map(c=>c.string)).size<2)continue;
  const top=Math.min(...chord.map(c=>staff.lines[c.string-1])),bottom=Math.max(...chord.map(c=>staff.lines[c.string-1]));
  const spines=parts.filter(p=>p.nonFretSymbol&&r.x-p.cx>g*.5&&r.x-p.cx<g*2&&p.cy>=top-g*.5&&p.cy<=bottom+g*.5);
  const tried=[];
  for(const p of spines){
   const x=p.cx;if(tried.some(old=>Math.abs(old-x)<g*.13))continue;tried.push(x);
   if(staff.bars.some(b=>Math.abs(b-x)<g*.5))continue;
   let support=0,total=0;const centers=[];
   for(let y=Math.ceil(top);y<=bottom;y++){
    if(staff.lines.some(line=>Math.abs(line-y)<g*.18))continue;
    total++;const xs=[];for(let dx=-Math.ceil(g*.28);dx<=g*.28;dx++)if(ink[y*width+Math.round(x+dx)])xs.push(dx);
    if(xs.length){support++;centers.push(xs.reduce((a,b)=>a+b,0)/xs.length);}
   }
   if(total<g*.5||support/total<.88||Math.max(...centers)-Math.min(...centers)<g*.08)continue;
   // Arrow tips must extend beyond the chord's glyphs. The lower half of
   // stacked parenthesized harmonics can otherwise resemble a down arrow.
   const up=arrowHead(ink,width,height,x,top-g*1.35,top-g*.65,g,1);
   const down=arrowHead(ink,width,height,x,bottom+g*.65,Math.min(staff.lines.at(-1)+g*.8,bottom+g*3.3),g,-1);
   if(up===down)continue;
   r.arpeggio=up?'up':'down';r.arpeggioEvidence={method:'connected-wavy-spine-with-arrow',x,top,bottom};break;
  }
 }
}

// Some TAB engravings omit the repeated numeral at the end of a short tie.
// Keep this evidence on the existing column; only resolution may copy a single
// confirmed preceding note, and only when the destination has no digit evidence.
export function attachOmittedFretTies(ink,width,height,staff){
 const g=staff.spacing;
 for(const measure of staff.measures)for(let i=1;i<measure.rhythm.length;i++){
  const prior=measure.rhythm[i-1],next=measure.rhythm[i],gap=next.x-prior.x;
  if(prior.rest||next.rest||gap<g*.9||gap>g*3.2||staff.candidates.some(c=>!c.nonFretSymbol&&Math.abs(c.cx-next.x)<g*.4))continue;
  const notes=staff.candidates.filter(c=>!c.nonFretSymbol&&Math.abs(c.cx-prior.x)<g*.35);
  if(notes.length!==1)continue;
  const line=staff.lines[notes[0].string-1],left=notes[0].x+notes[0].width+g*.12,right=next.x-g*.2;
  if(right-left<g*.5||right-left>g*2.7)continue;
  const x0=Math.ceil(left),x1=Math.floor(right),y0=Math.max(0,Math.ceil(line+g*.12)),y1=Math.min(height-1,Math.floor(line+g*.75)),seen=new Set();let match=false;
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
   const start=y*width+x;if(!ink[start]||seen.has(start))continue;
   const stack=[start],points=[];seen.add(start);
   while(stack.length){const at=stack.pop(),xx=at%width,yy=Math.floor(at/width);points.push({x:xx,y:yy});for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=xx+dx,ny=yy+dy,next=ny*width+nx;if(nx<x0||nx>x1||ny<y0||ny>y1||seen.has(next)||!ink[next])continue;seen.add(next);stack.push(next);}}
   const xmin=Math.min(...points.map(p=>p.x)),xmax=Math.max(...points.map(p=>p.x)),ymin=Math.min(...points.map(p=>p.y)),ymax=Math.max(...points.map(p=>p.y)),w=xmax-xmin+1,h=ymax-ymin+1;
   if(xmin===x0||xmax===x1||ymax===y1||w<g*.5||h<g*.2||h>g*.65||h/w>.65)continue;
   const mean=ps=>ps.reduce((sum,p)=>sum+p.y,0)/ps.length;
   const a=mean(points.filter(p=>p.x<xmin+w*.2)),b=mean(points.filter(p=>p.x>xmax-w*.2)),middle=mean(points.filter(p=>p.x>=xmin+w*.4&&p.x<=xmin+w*.6));
   if(Math.abs(a-b)<g*.12&&middle-Math.max(a,b)>g*.14)match=true;
  }
  if(match){next.tieContinuation={string:notes[0].string,fromX:prior.x,method:'visible-tie-with-omitted-tab-fret'};}
 }
}
