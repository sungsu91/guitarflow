// A printed 3/6 AND bracket ends are required. Density or beat totals never
// turn ordinary notes into tuplets. Both stem directions share these gates.
export function findImageTuplets(rgba,ink,width,height,staff){
 const g=staff.spacing,found=[];
 for(const [mi,m] of staff.measures.entries())for(let i=0;i<m.rhythm.length-2;i++)for(const count of [3,6]){
  const group=m.rhythm.slice(i,i+count),a=group[0],last=group.at(-1),direction=a.direction??1;
  if(group.length!==count||!['4','8','16','32'].includes(a.duration)||group.some(s=>s.duration!==a.duration||s.direction!==direction||s.tuplet))continue;
  const gaps=group.slice(1).map((s,j)=>s.x-group[j].x);if(Math.max(...gaps)-Math.min(...gaps)>g*.6)continue;
  const end=direction===1?Math.max(...group.map(s=>s.y)):Math.min(...group.map(s=>s.y)),center=(a.x+last.x)/2;
  const x0=Math.max(0,Math.floor(center-g*.42)),x1=Math.min(width-1,Math.ceil(center+g*.42));
  const y0=Math.max(0,Math.ceil(Math.min(end+direction*g*.35,end+direction*g*1.55))),y1=Math.min(height-1,Math.ceil(Math.max(end+direction*g*.35,end+direction*g*1.55)));
  // Short brackets can enter the label search window. Isolate the central
  // connected glyph instead of treating bracket ink as part of the numeral.
  const visited=new Set(),components=[];
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
   const at=y*width+x;if(!ink[at]||visited.has(at))continue;
   const stack=[[x,y]],points=[];visited.add(at);
   while(stack.length){const [px,py]=stack.pop();points.push([px,py]);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){const nx=px+dx,ny=py+dy,n=ny*width+nx;if(nx<x0||nx>x1||ny<y0||ny>y1||!ink[n]||visited.has(n))continue;visited.add(n);stack.push([nx,ny]);}}
   components.push(points);
  }
  const labelShape=ps=>{if(!ps.length)return false;const xs=ps.map(p=>p[0]),ys=ps.map(p=>p[1]),w=Math.max(...xs)-Math.min(...xs)+1,h=Math.max(...ys)-Math.min(...ys)+1;return Math.abs((Math.min(...xs)+Math.max(...xs))/2-center)<=g*.25&&w>=g*.25&&w<=g*.8&&h>=g*.5&&h<=g*1.1;};
  // Keep the original crop when already valid: low-resolution numerals can
  // have disconnected antialiased strokes that must remain one OCR input.
  const all=components.flat(),points=labelShape(all)?all:components.find(labelShape)??[];
  if(!points.length)continue;
  const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys),w=right-left+1,h=bottom-top+1;
  if(w<g*.25||w>g*.8||h<g*.5||h>g*1.1||Math.abs((left+right)/2-center)>g*.25)continue;
  const bracket=(x,sign)=>{
   for(let bx=Math.round(x-g*.12);bx<=x+g*.12;bx++)for(let by=top;by<=bottom;by++){
    let vertical=0,horizontal=0;
    for(let dy=0;dy<=g*.22;dy++)vertical+=ink[(by-direction*dy)*width+bx]??0;
    for(let dx=0;dx<=g*.22;dx++)horizontal+=ink[by*width+bx+sign*dx]??0;
    if(vertical>=g*.2&&horizontal>=g*.2)return true;
   }return false;
  };
  // Engraved brackets often extend beyond the outer stems. Search outward
  // only, within half a staff space, and never across a neighboring note.
  // Both printed ends and a readable central numeral are still mandatory.
  const outerBracket=(x,sign,neighbor)=>{
   const reach=Math.min(g*.6,neighbor==null?Infinity:Math.abs(neighbor-x)*.4);
   for(let offset=0;offset<=reach;offset++)if(bracket(x-sign*offset,sign))return true;
   return false;
  };
  const fullBracket=outerBracket(a.x,1,m.rhythm[i-1]?.x)&&outerBracket(last.x,-1,m.rhythm[i+count]?.x);
  const beamAt=x=>group[0].beamYs?.some(y=>[-1,0,1].some(dy=>ink[Math.round(y+dy)*width+Math.round(x)]));
  const compactBracket=()=>{
   if(!group.every(s=>s.beamCount>0)||beamAt(a.x-g*.4)||beamAt(last.x+g*.4))return false;
   // A compact label applies to one complete connected beam group only.
   for(let x=a.x+g*.2;x<last.x-g*.2;x++)if(!beamAt(x))return false;
   for(let half=g*.65;half<=g*1.6;half++)if(bracket(center-half,1)&&bracket(center+half,-1))return true;
   return false;
  };
  if(!fullBracket&&!compactBracket())continue;
  const grayscale=new Uint8Array(w*h);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const p=((top+y)*width+left+x)*4;grayscale[y*w+x]=Math.round(rgba[p]*.299+rgba[p+1]*.587+rgba[p+2]*.114);}
  found.push({id:`triplet-${staff.id}-${mi}-${i}-${count}`,x:left,y:top,width:w,height:h,cx:center,parts:1,stringDistance:0,grayscale,measure:mi,stems:group.map(s=>s.x),count});
 }
 return found;
}
export function resolveImageTuplets(staff){
 for(const label of staff.tupletCandidates??[]){
  const count=label.count??3;
  const group=staff.measures[label.measure]?.rhythm.filter(s=>label.stems.includes(s.x));
  if(group?.length!==count||group.some(s=>s.tuplet))continue;
  if(label.ocr?.text!==String(count)||!label.ocr.agrees||label.ocr.confidence<.95){
   // The separate bracket disproves a second beam, but its unread numeral
   // cannot supply a timing ratio. Keep all frets and request rhythm review.
   if(label.rhythmOverride)group.forEach(s=>Object.assign(s,{duration:null,confidence:0,photoTupletUnverified:true,method:'unread-photo-tuplet-bracket'}));
   continue;
  }
  const tuplet={actualNotes:count,normalNotes:count===6?4:2,groupId:label.id};
  group.forEach(s=>{if(label.rhythmOverride)Object.assign(s,label.rhythmOverride,{confidence:.97});delete s.photoTupletUnverified;s.tuplet=tuplet;s.tupletEvidence={method:'bracketed-image-triplet',confidence:label.ocr.confidence};});
 }
}
