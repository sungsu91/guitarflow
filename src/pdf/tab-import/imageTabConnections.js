// Connections are measured separately from fret OCR. A diagonal is discarded
// as a digit only when it connects two distinct, printed rhythmic anchors.
const mean=values=>values.reduce((sum,value)=>sum+value,0)/values.length;

export function slideStroke(ink,width,staff,part){
 const g=staff.spacing,line=staff.lines[part.string-1];
 if(part.width<g*.3||part.width>g*1.6||part.height<g*.4||part.height>g*.75||part.stringDistance>.16)return null;
 const rows=[];
 for(let y=part.y;y<part.y+part.height;y++){
  if(Math.abs(y-line)<=Math.ceil(staff.thickness/2)+1)continue;
  const xs=[];for(let x=part.x;x<part.x+part.width;x++)if(ink[y*width+x])xs.push(x);
  if(xs.length)rows.push({y,x:mean(xs),span:xs.at(-1)-xs[0]+1});
 }
 const unmasked=part.height-(2*(Math.ceil(staff.thickness/2)+1)+1);
 if(rows.length<Math.max(4,unmasked*.8)||rows.at(-1).y-rows[0].y<part.height*.65||rows.some(row=>row.span>g*.36))return null;
 const centerY=mean(rows.map(r=>r.y)),centerX=mean(rows.map(r=>r.x));
 const slope=rows.reduce((sum,r)=>sum+(r.y-centerY)*(r.x-centerX),0)/rows.reduce((sum,r)=>sum+(r.y-centerY)**2,0);
 if(Math.abs(slope)<.5||Math.abs(slope)>2.5||rows.some(r=>Math.abs(r.x-centerX-slope*(r.y-centerY))>g*.09))return null;
 return slope<0?'up':'down';
}

export function markSlideParts(ink,width,staff,parts){
 const g=staff.spacing;
 for(const part of parts){
  if(part.nonFretSymbol)continue;
  const direction=slideStroke(ink,width,staff,part);if(!direction)continue;
  const measure=staff.measures.find(m=>part.cx>m.x&&part.cx<m.x+m.width);if(!measure)continue;
  const next=measure.rhythm.find(r=>r.x>part.cx),prior=measure.rhythm.findLast(r=>r.x<part.cx);
  if(!prior||!next||prior.rest||next.rest||next.x-prior.x>g*3.5||part.x<prior.x+g*.25||part.x+part.width>next.x-g*.2)continue;
  const anchored=r=>parts.filter(p=>p!==part&&!p.nonFretSymbol&&p.string===part.string&&p.height>=g*.65&&Math.abs(p.cx-r.x)<g*.2);
  if(anchored(prior).length!==1||anchored(next).length!==1)continue;
  part.nonFretSymbol='slide-connector';
  (prior.connections??=[]).push({kind:'slide',string:part.string,toX:next.x,direction,method:'diagonal-between-printed-frets',bounds:{x:part.x,y:part.y,width:part.width,height:part.height}});
 }
}

// Search a bounded strip for a complete arch. Staff rules are excluded but
// their known row occlusion may be bridged; no note or duration is inferred.
export function tabArc(ink,width,height,staff,from,to,string,{wide=false}={}){
 const g=staff.spacing,line=staff.lines[string-1],span=to-from;
 if(span<g*.65||span>g*(wide?7:4))return null;
 const mask=Math.ceil(staff.thickness/2)+1;
 for(const side of [-1,1]){
  const x0=Math.ceil(from+g*.10),x1=Math.floor(to-g*.10),y0=Math.max(0,Math.ceil(line+(side<0?-1.3:.52)*g)),y1=Math.min(height-1,Math.floor(line+(side<0?-.52:1.3)*g));
  const ruleRows=new Set();
  for(let y=y0;y<=y1;y++)if(staff.lines.some(l=>Math.abs(l-y)<=mask)){let count=0;for(let x=x0;x<=x1;x++)count+=ink[y*width+x];if(count/(x1-x0+1)>.9)ruleRows.add(y);}
  const columns=[];
  for(let x=x0;x<=x1;x++){
   const ys=[];for(let y=y0;y<=y1;y++)if(!ruleRows.has(y)&&ink[y*width+x])ys.push(y);
   if(ys.length&&ys.at(-1)-ys[0]<=g*.35)columns.push({x,y:mean(ys)});
  }
  if(columns.length<Math.max(8,(x1-x0+1)*.45))continue;
  const left=columns.filter(p=>p.x<from+span*.22),right=columns.filter(p=>p.x>to-span*.22),middle=columns.filter(p=>p.x>from+span*.4&&p.x<from+span*.6);
  if(!left.length||!right.length)continue;
  const a=mean(left.map(p=>p.y)),b=mean(right.map(p=>p.y)),c=mean(middle.map(p=>p.y));
  if(Math.abs(a-b)>g*.15||middle.length&&side*(c-(a+b)/2)<g*.07)continue;
  // Fit the complete arch, including its steep ends. Estimating curvature
  // from the mean of an edge band flattens narrow engraved H/P arches.
  const points=columns.map(p=>({t:2*(p.x-from)/span-1,y:p.y}));
  const matrix=Array.from({length:3},(_,row)=>[...Array.from({length:3},(_,col)=>points.reduce((n,p)=>n+p.t**(row+col),0)),points.reduce((n,p)=>n+p.y*p.t**row,0)]);
  for(let row=0;row<3;row++){const divisor=matrix[row][row];for(let col=row;col<4;col++)matrix[row][col]/=divisor;for(let other=0;other<3;other++)if(other!==row){const factor=matrix[other][row];for(let col=row;col<4;col++)matrix[other][col]-=factor*matrix[row][col];}}
  const [base,tilt,curve]=matrix.map(row=>row[3]);
  if(!Number.isFinite(curve)||side*curve>=-g*.2||Math.abs(tilt/(2*curve))>.25||Math.abs(curve)>g*1.3)continue;
  if(points.filter(p=>Math.abs(p.y-(base+tilt*p.t+curve*p.t*p.t))<g*.14).length<points.length*.9)continue;
  let supported=columns.length;
  for(let x=x0;x<=x1;x++)if(!columns.some(p=>p.x===x)){const t=2*(x-from)/span-1,y=base+tilt*t+curve*t*t;if([...ruleRows].some(l=>Math.abs(l-y)<=g*.1))supported++;}
  if(supported<(x1-x0+1)*.9)continue;
  return {side,fromX:from,toX:to,string,method:'visible-tab-arc',bounds:{x:x0,y:y0,width:x1-x0+1,height:y1-y0+1}};
 }
 return null;
}

export function attachTabConnections(ink,width,height,staff){
 const g=staff.spacing,notes=r=>staff.candidates.filter(c=>!c.nonFretSymbol&&!c.restSymbol&&Math.abs(c.cx-r.x)<g*.3);
 for(const measure of staff.measures){
  for(let i=0;i<measure.rhythm.length-1;i++){
   const from=measure.rhythm[i],to=measure.rhythm[i+1],left=notes(from),right=notes(to);
   if(from.rest||to.rest||left.length!==1||right.length!==1||left[0].string!==right[0].string)continue;
   // A short two/three-note slur may cover a complete H-P group.
   let arc=tabArc(ink,width,height,staff,from.x,to.x,left[0].string);
   if(!arc&&i>0){const previous=measure.rhythm[i-1],ns=notes(previous);if(ns.length===1&&ns[0].string===left[0].string)arc=tabArc(ink,width,height,staff,previous.x,to.x,left[0].string);}
   if(!arc&&i+2<measure.rhythm.length){const following=measure.rhythm[i+2],ns=notes(following);if(ns.length===1&&ns[0].string===left[0].string)arc=tabArc(ink,width,height,staff,from.x,following.x,left[0].string);}
   if(!arc)continue;
   from.connectionArc={...arc,toX:to.x};
   // The arch over an inner string may cross the next rule and look like a
   // wide 7. Remove only a candidate wholly inside the verified arch strip.
   for(const c of staff.candidates)if(c.string!==left[0].string&&!c.nonFretSymbol&&c.x>=arc.bounds.x-g*.12&&c.x+c.width<=arc.bounds.x+arc.bounds.width+g*.12&&c.y>=arc.bounds.y&&c.y+c.height<=arc.bounds.y+arc.bounds.height&&c.width>g*.85&&c.height<g*.7)c.nonFretSymbol='connection-arc';
   // Printed H/P labels sit above the TAB. Keep this crop separate from all
   // fret candidates; it must pass independent OCR agreement before use.
   const x=Math.max(0,Math.floor(from.x-g*.15)),rightX=Math.min(width,Math.ceil(to.x+g*.3)),y=Math.max(0,Math.floor(staff.lines[0]-g*2.25)),bottom=Math.max(0,Math.floor(staff.lines[0]-g*1.36));
   const w=rightX-x,h=bottom-y;if(w<3||h<3||w>g*3.5)continue;
   const seen=new Set(),letters=[];
   for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){
    const start=yy*w+xx;if(seen.has(start)||!ink[(y+yy)*width+x+xx])continue;
    const stack=[start],points=[];seen.add(start);
    while(stack.length){const p=stack.pop(),px=p%w,py=Math.floor(p/w);points.push({x:px,y:py});for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=px+dx,ny=py+dy,id=ny*w+nx;if(nx<0||nx>=w||ny<0||ny>=h||seen.has(id)||!ink[(y+ny)*width+x+nx])continue;seen.add(id);stack.push(id);}}
    const left=Math.min(...points.map(p=>p.x)),right=Math.max(...points.map(p=>p.x)),top=Math.min(...points.map(p=>p.y)),low=Math.max(...points.map(p=>p.y));
    if(right-left<g*.25||low-top<g*.45||right-left>g*1.05||low-top>g*.95||left===0||right===w-1||top===0)continue;
    letters.push({points,left,right,top,low,distance:Math.abs(x+(left+right)/2-((from.x+to.x)/2+g*.15))});
   }
   letters.sort((a,b)=>a.distance-b.distance);const letter=letters[0];
   if(letter&&letter.distance<g*.45){const width=letter.right-letter.left+1,height=letter.low-letter.top+1,grayscale=new Uint8Array(width*height).fill(255);for(const p of letter.points)grayscale[(p.y-letter.top)*width+p.x-letter.left]=0;from.connectionLabel={x:x+letter.left,y:y+letter.top,width,height,grayscale};}
  }
 }
}

export function resolveTabConnections(slots,staff){
 for(let i=0;i<slots.length-1;i++){
  const from=slots[i],to=slots[i+1];
  if(from.rest||to.rest||from.notes.length!==1||to.notes.length!==1||from.rejections.length||to.rejections.length)continue;
  const a=from.notes[0],b=to.notes[0];
  if(a.status!=='confirmed'||b.status!=='confirmed'||a.dead||b.dead||a.harmonic||b.harmonic||a.string!==b.string||a.fret===b.fret)continue;
  const slide=from.connections?.find(c=>c.kind==='slide'&&c.string===a.string&&Math.abs(c.toX-to.x)<staff.spacing*.15&&c.direction===(b.fret>a.fret?'up':'down'));
  if(slide){from.technique='S';from.techniqueEvidence=slide;if(from.connectionArc)from.slurToNext=true;continue;}
  const label=from.connectionLabelReading;
  if(!from.connectionArc||Math.abs(from.connectionArc.toX-to.x)>staff.spacing*.15||!label?.agrees)continue;
  if(label.text===(b.fret>a.fret?'H':'P')){from.technique=label.text;from.techniqueEvidence={method:'visible-arc-and-printed-label',label};}
 }
}

function shallowHarmonicArc(ink,width,height,staff,from,to,string){
 const g=staff.spacing,line=staff.lines[string-1],span=to-from,columns=[];
 if(span<g*4||span>g*12)return false;
 const x0=Math.ceil(from+g*1.35),x1=Math.floor(to-g*1.2);
 for(let x=x0;x<=x1;x++){
  if(staff.bars.some(b=>Math.abs(b-x)<g*.16))continue;
  const ys=[];for(let y=Math.max(0,Math.ceil(line-g*.7));y<=Math.min(height-1,Math.floor(line-g*.12));y++)if(ink[y*width+x])ys.push(y);
  if(ys.length&&ys.at(-1)-ys[0]<g*.28)columns.push({x,y:mean(ys)});
 }
 if(columns.length<(x1-x0+1)*.72)return false;
 const spanX=x1-x0,left=columns.filter(p=>p.x<x0+spanX*.2),right=columns.filter(p=>p.x>x1-spanX*.2),middle=columns.filter(p=>Math.abs(p.x-(x0+x1)/2)<spanX*.12);
 if(!left.length||!right.length||!middle.length)return false;
 const a=mean(left.map(p=>p.y)),b=mean(right.map(p=>p.y)),c=mean(middle.map(p=>p.y));
 if(Math.abs(a-b)>g*.16||(a+b)/2-c<g*.15)return false;
 const low=Math.min(...columns.map(p=>p.y));
 return columns.every(p=>p.x<(x0+x1)/2? p.y>=low&&p.y<=a+g*.25:p.y>=low&&p.y<=b+g*.25);
}

export function attachHarmonicTies(ink,width,height,staff){
 const g=staff.spacing,notes=r=>staff.candidates.filter(c=>!c.nonFretSymbol&&!c.restSymbol&&Math.abs(c.cx-r.x)<g*.35);
 let previous=null;
 for(const measure of staff.measures)for(const [i,r] of measure.rhythm.entries()){
  const prior=previous;previous={r,measure};if(!prior||r.rest||prior.r.rest)continue;
  const a=notes(prior.r),b=notes(r),sameMeasure=measure===prior.measure;
  // Restrict this extension to explicitly bracketed harmonic chords. Each
  // string needs its own visible arc, so empty stems never acquire a chord.
  if(a.length<2||a.some(n=>!n.harmonic)||new Set(a.map(n=>n.string)).size!==a.length)continue;
  if(sameMeasure?b.length!==0:b.length!==a.length||b.some(n=>!n.harmonic||!a.some(p=>p.string===n.string)))continue;
  if(!a.every(n=>shallowHarmonicArc(ink,width,height,staff,prior.r.x,r.x,n.string)))continue;
  if(sameMeasure)r.harmonicTieContinuation={fromX:prior.r.x,strings:a.map(n=>n.string),method:'visible-parallel-harmonic-ties'};
  else if(i===0)r.harmonicTieFromPreviousBar={strings:a.map(n=>n.string),method:'visible-parallel-harmonic-ties'};
 }
}
