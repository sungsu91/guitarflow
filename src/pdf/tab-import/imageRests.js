// Image TAB rests sit between strings, unlike fret digits centered on a line.
// Scan only the TAB interior and keep the whole symbol across ruled lines.
// No measure-total arithmetic is used to invent a missing rest or its length.
import {classifyQuarterRest,classifyBlockRest} from './rasterRestShapes.js';
export function classifyHookedRest(points,width,height,spacing,maskedRows=new Set()){
  const g=spacing;
  if(width<g*.45||width>g*1.65||height<g*.9||height>g*4.1)return null;
  const rows=Array.from({length:height},()=>[]);
  for(const p of points)rows[p.y]?.push(p.x);
  const occupied=rows.flatMap((xs,y)=>xs.length?[{y,left:Math.min(...xs),right:Math.max(...xs),count:xs.length}]:[]);
  const mean=a=>a.reduce((n,v)=>n+v,0)/a.length;
  const head=occupied.filter(r=>r.y<height*.2),tail=occupied.filter(r=>r.y>height*.8);
  if(!head.length||!tail.length)return null;
  const slope=(mean(tail.map(r=>r.right))-mean(head.map(r=>r.right)))/(mean(tail.map(r=>r.y))-mean(head.map(r=>r.y)));
  // Hooked rests descend leftward; a numeral, vertical beam or slash lacks
  // the alternating round lobes and narrow continuous slanted tail.
  if(slope<-.5||slope>.03||tail.some(r=>r.right-r.left>g*.24))return null;
  const intercept=mean(occupied.map(r=>r.right-slope*r.y));
  if(occupied.filter(r=>Math.abs(r.right-(intercept+slope*r.y))<g*.2).length<occupied.length*.85)return null;
  const lobes=[];
  for(const r of occupied){
    if(r.right-r.left<g*.32||r.count<g*.16)continue;
    const last=lobes.at(-1),missing=last?r.y-last.at(-1)-1:0;
    const masked=last&&Array.from({length:missing},(_,i)=>last.at(-1)+i+1).every(y=>maskedRows.has(y));
    const crossesBulb=masked&&(missing<=g*.15||Math.max(rows[last.at(-1)].length,r.count)>=g*.55&&Math.min(rows[last.at(-1)].length,r.count)>=g*.3);
    if(last&&(missing<=1||crossesBulb))last.push(r.y);else lobes.push([r.y]);
  }
  if(![1,2,3].includes(lobes.length)||lobes.some(rows=>rows.length<Math.max(2,g*.1)||rows.at(-1)-rows[0]>g*.7))return null;
  // Each extra hook adds about one staff space, not an arbitrary long tail.
  // A chord-spanning arpeggio arrow can otherwise look like a single-hook rest
  // after horizontal rules are masked out.
  if(height>g*(1.3+lobes.length))return null;
  if(height-lobes.at(-1).at(-1)<g*.35)return null;
  const centers=lobes.map(rows=>mean(rows)),gaps=centers.slice(1).map((y,i)=>y-centers[i]);
  // A staff rule may hide one side of a lobe, moving its visible centroid.
  // Bound that uncertainty by the actually masked adjacent rows.
  const occlusion=Math.max(0,...lobes.map(rows=>{let n=0;for(const [start,step] of [[rows[0]-1,-1],[rows.at(-1)+1,1]])for(let y=start;maskedRows.has(y)&&Math.abs(y-start)<g*.3;y+=step)n++;return n;}));
  if(gaps.some(d=>d<g*.38||d>g*1.25)||gaps.length>1&&Math.max(...gaps)-Math.min(...gaps)>g*.2+occlusion/2)return null;
  return String(4*2**lobes.length);
}

export function classifyImageRest(points,width,height,spacing){
  const section=(lo,hi)=>{
    const ps=points.filter(p=>p.y/height>=lo&&p.y/height<hi);
    if(!ps.length)return null;
    return {center:ps.reduce((sum,p)=>sum+p.x,0)/ps.length/width,width:(Math.max(...ps.map(p=>p.x))-Math.min(...ps.map(p=>p.x))+1)/width};
  };
  const head=section(0,.2),middle=section(.3,.6),tail=section(.8,1);
  if(!head||!middle||!tail)return null;
  if(height>=spacing*.42&&height<=spacing*.95&&width>=spacing*.32&&width<=spacing*.85){
    if(head.width>=.75&&tail.width<=.65&&middle.center>head.center&&tail.center<middle.center)return '8';
    return null;
  }
  if(height<spacing*1.55||height>spacing*2.15)return null;
  if(width>=spacing*.6&&width<=spacing*1.05&&head.width>=.45&&middle.width>=.65&&tail.width<=.4&&head.center-tail.center>=.18)return '16';
  if(width>=spacing*.4&&width<=spacing*.7&&head.center<.45&&middle.center>head.center+.06&&middle.center>tail.center+.05&&middle.width>=.85&&tail.width>=.5)return '4';
  return null;
}

export function attachImageRests(ink,width,height,staff){
  const g=staff.spacing,top=Math.max(0,Math.floor(staff.y+g*.5)),bottom=Math.min(height-1,Math.ceil(staff.lines.at(-1)-g*.5));
  const isInk=(x,y)=>!staff.lines.some(line=>Math.abs(y-line)<=Math.ceil(staff.thickness/2)+1)&&ink[y*width+x];
  for(const measure of staff.measures){
    const columns=[];
    for(let x=Math.ceil(measure.x+g*.6);x<measure.x+measure.width-g*.6;x++){
      if(measure.rhythm.some(r=>Math.abs(r.x-x)<g*.55))continue;
      for(let y=top;y<=bottom;y++)if(isInk(x,y)){columns.push(x);break;}
    }
    const groups=[];for(const x of columns){const last=groups.at(-1);if(last&&x-last.at(-1)<=2)last.push(x);else groups.push([x]);}
    for(const xs of groups){
      const x0=xs[0],x1=xs.at(-1),w=x1-x0+1;if(w<g*.25||w>g*1.65)continue;
      const points=[];for(let y=top;y<=bottom;y++)for(let x=x0;x<=x1;x++)if(isInk(x,y))points.push({x,y});
      const y0=Math.min(...points.map(p=>p.y)),y1=Math.max(...points.map(p=>p.y)),h=y1-y0+1,center=(y0+y1)/2;
      if(Math.abs(center-((staff.lines[0]+staff.lines.at(-1))/2))>g*.55)continue;
      if(staff.nativeText&&staff.candidates.some(c=>c.cx>=x0-g*.2&&c.cx<=x1+g*.2))continue;
      // A neighboring fret chord or a second symbol in this column makes the
      // isolated-rest reading unsafe, even if its center has a rest-like shape.
      if(staff.candidates.some(c=>c.cx>=x0-g*.15&&c.cx<=x1+g*.15&&c.stringDistance<=.22&&(c.cy<y0-g*.2||c.cy>y1+g*.2)))continue;
      const local=points.map(p=>({x:p.x-x0,y:p.y-y0}));
      const masked=new Set(Array.from({length:h},(_,y)=>y).filter(y=>staff.lines.some(line=>Math.abs(y+y0-line)<=Math.ceil(staff.thickness/2)+1)));
      const duration=classifyQuarterRest(local,w,h,g)??classifyBlockRest(local,w,h,g,y0,staff.lines,staff.thickness)??classifyHookedRest(local,w,h,g,masked)??(!staff.nativeText&&Math.abs(center-((staff.lines[0]+staff.lines.at(-1))/2))<=g*.18?classifyImageRest(local,w,h,g):null);if(!duration)continue;
      const x=(x0+x1)/2;
      measure.rhythm.push({x,y:center,duration,rest:true,confidence:.96,method:'image-tab-rest',symbolBounds:{x:x0,y:y0,width:w,height:h}});
      for(const c of staff.candidates)if(c.cx>=x0-g*.15&&c.cx<=x1+g*.15&&c.cy>=y0-g*.2&&c.cy<=y1+g*.2)c.restSymbol=true;
    }
    measure.rhythm.sort((a,b)=>a.x-b.x);
  }
}
