import {binaryPage,detectStaffs,detectBarlines} from './geometry.js';
import {staffBarMarks} from '../../omr/staffBarMarks.js';
import {notationStaffConnections} from './notationConnections.js';

export function chordTextRow(components,g,width,height){
 const text=components.filter(p=>p.height>=g*1.35&&p.width>=p.height*.45&&p.y>height*.25&&p.y+p.height<height-g*.6);
 // Small bar numbers, clef fragments and "D.C. al Coda" can outnumber the
 // chord labels. Prefer the repeated text size across the system, rather
 // than counting every small component as an equally strong baseline vote.
 const rows=text.map(p=>text.filter(q=>Math.abs(q.y+q.height-p.y-p.height)<g*.35))
  .filter(row=>row.length>=3&&Math.max(...row.map(p=>p.x))-Math.min(...row.map(p=>p.x))>width*.4);
 const weight=row=>row.reduce((sum,p)=>sum+Math.min(p.height,g*2.5)**2,0);
 const row=rows.sort((a,b)=>weight(b)-weight(a))[0];
 if(!row)return {components,rhythmComponents:[]};
 const baseline=row.reduce((n,p)=>n+p.y+p.height,0)/row.length;
 const typical=[...row].sort((a,b)=>a.height-b.height)[Math.floor(row.length/2)].height;
 // Engravers raise individual names to clear high notes. A competing name
 // of the same printed size means there is no single chord baseline; retain
 // the original region instead of dropping those labels.
 if(components.some(p=>p.height>=typical*.8&&p.y+p.height<height-g*.6&&Math.abs(p.y+p.height-baseline)>=g*.5))return {components,rhythmComponents:[]};
 const chords=components.filter(p=>Math.abs(p.y+p.height-baseline)<g*.5&&p.height>=typical*.7);
 // Triplet numerals sit lower and are smaller than chord names. Filtering
 // the chord row must not discard the separate rhythmic evidence.
 const rhythmComponents=components.filter(p=>!chords.includes(p)&&p.height>=g*.7&&p.height<=g*1.65&&p.width>=p.height*.3&&p.width<=p.height*1.1);
 return {baseline,components:chords,rhythmComponents};
}

export function textComponents(rgba,width,height,g){
 const ink=binaryPage(rgba,width,height,180),parts=[];
 for(let at=0;at<ink.length;at++){
  if(!ink[at])continue;const todo=[at];ink[at]=0;
  let left=width,right=0,top=height,bottom=0,count=0;
  while(todo.length){const n=todo.pop(),x=n%width,y=Math.floor(n/width);count++;left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
   for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]){const xx=x+dx,yy=y+dy,j=yy*width+xx;if(xx>=0&&xx<width&&yy>=0&&yy<height&&ink[j]){ink[j]=0;todo.push(j);}}
  }
  const w=right-left+1,h=bottom-top+1;
  // Filled rehearsal labels (white A/B on a dark square) are not chord roots.
  // Check the border as well as density, so a bold letter remains eligible.
  const dark=(x,y)=>{const p=(y*width+x)*4;return rgba[p]*.299+rgba[p+1]*.587+rgba[p+2]*.114<180;};
  let border=0,total=0;
  if(count/(w*h)>.55&&h>g*1.3&&w/h>.5&&w/h<1.4){
   for(let x=left;x<=right;x++)for(const y of [top,bottom]){total++;border+=dark(x,y);}
   for(let y=top;y<=bottom;y++)for(const x of [left,right]){total++;border+=dark(x,y);}
  }
  if(total&&border/total>.7)continue;
  if(bottom-top>=g*.65&&bottom-top<=g*3.3&&right-left>=g*.12&&right-left<g*12)parts.push({x:left,y:top,width:w,height:h});
 }
 const groups=[];
 for(const p of parts.sort((a,b)=>a.x-b.x)){
  // A diagram above the name can interleave in x order. Match by baseline,
  // rather than letting that unrelated component split C + add2 or E + m.
  const prev=groups.findLast(q=>p.x-(q.x+q.width)<g*.9&&p.x>=q.x&&Math.min(q.y+q.height,p.y+p.height)-Math.max(q.y,p.y)>Math.min(q.height,p.height)*.4);
  if(prev){const right=Math.max(prev.x+prev.width,p.x+p.width),bottom=Math.max(prev.y+prev.height,p.y+p.height);prev.y=Math.min(prev.y,p.y);prev.width=right-prev.x;prev.height=bottom-prev.y;}
  else groups.push({...p});
 }
 return groups.filter(p=>p.width<g*12);
}

export function notationBarBounds(ink,width,staff,connectedBars=[]){
 const g=staff.spacing;
 const detected=detectBarlines(ink,width,staff).bars;
 const bars=[...detected,...connectedBars.filter(x=>!detected.some(other=>Math.abs(x-other)<g*.5))].sort((a,b)=>a-b).filter(x=>{
  // A continuous line across both hands is independently established even
  // when a tied notehead touches it on this staff.
  if(connectedBars.some(other=>Math.abs(x-other)<g*.5))return true;
  const ruled=new Set();
  for(let xx=Math.floor(x-g);xx<=x+g;xx++){
   let full=0;for(let yy=staff.y;yy<=staff.y+staff.height;yy++)full+=ink[yy*width+xx]??0;
   if(full/(staff.height+1)>.97)ruled.add(xx);
  }
  // A note stem touching all five lines is not a barline. Noteheads form a
  // thick horizontal patch immediately beside it; thin staff rules do not.
  for(let y=staff.y-Math.ceil(g*.5);y<=staff.y+staff.height+g*.5;y++)for(const sign of [-1,1]){
   let count=0,total=0;
   for(let dy=-Math.ceil(g*.22);dy<=Math.ceil(g*.22);dy++)for(let dx=Math.ceil(g*.2);dx<=g*.7;dx++){const xx=Math.round(x+sign*dx);if(ruled.has(xx))continue;count+=ink[(y+dy)*width+xx]??0;total++;}
   if(total&&count/total>.84)return false;
  }
  return true;
 });
 // An opening repeat after the clef delimits the first real measure; the
 // narrow clef-only strip before it is not another bar.
 if(!bars.length||bars[0]-staff.x>g*6&&!staffBarMarks(ink,width,staff,bars[0]).repeatStart)bars.unshift(staff.x);
 if(staff.x+staff.width-bars.at(-1)>g)bars.push(staff.x+staff.width);
 return bars.slice(0,-1).flatMap((x,i)=>bars[i+1]-x>g*3?[{x,y:staff.y,width:bars[i+1]-x,height:staff.height}]:[]);
}

// Only the band immediately above the relevant system is eligible. For paired
// staff+TAB pages use the upper notation staff, not the gap above the TAB digits.
export function chordRegions(rgba,width,height,targets){
 const ink=binaryPage(rgba,width,height,230),notation=detectStaffs(ink,width,height,undefined,5).filter(s=>!targets.some(t=>t.kind==='tab'&&t.lines.length===5&&Math.abs(t.y-s.y)<t.spacing*.5));
 const connections=notationStaffConnections(ink,width,notation);
 return targets.map(target=>{
  const above=notation.filter(s=>s.y<target.y&&target.y-s.y<target.spacing*20&&Math.abs(s.x-target.x)<target.spacing*5).at(-1);
  const staff=(target.kind==='tab'||target.lines.length===6)&&above?above:target,g=staff.spacing;
  const prior=notation.filter(s=>s.y<staff.y).at(-1);
  // A last-beat label may extend past the closing barline (Cmaj7, slash bass).
  // The staff boundary limits musical time, not the width of its printed text.
  const x=Math.max(0,Math.floor(staff.x-g*1.5)),right=Math.min(width,Math.ceil(staff.x+staff.width+g*6));
  const y=Math.max(0,Math.floor(staff.y-g*6),prior?Math.ceil(prior.y+prior.height+g*2):0),bottom=Math.max(y+1,Math.floor(staff.y-g*.55));
  const w=right-x,h=bottom-y,pixels=new Uint8ClampedArray(w*h*4);
  for(let row=0;row<h;row++)pixels.set(rgba.subarray(((y+row)*width+x)*4,((y+row)*width+right)*4),row*w*4);
  // Small bar numbers sit at the clef, below the larger chord-name row.
  // Keep rhythm numerals over the notes; only exclude this opening margin.
  const components=textComponents(pixels,w,h,g).filter(p=>!(p.x+p.width<staff.x-x+g*2.5&&p.height<g*1.3));
  const row=chordTextRow(components,g,w,h);
  const staffIndex=notation.findIndex(s=>Math.abs(s.y-staff.y)<g*.5),bars=[...new Set(connections.filter(c=>c.upper===staffIndex||c.lower===staffIndex).flatMap(c=>c.bars))];
  return {staff:target.id,x,y,width:w,height:h,spacing:g,staffY:staff.y,...(row.baseline!==undefined?{textBaseline:y+row.baseline}:{}),measures:staff.lines.length===5&&staff.kind!=='tab'?notationBarBounds(ink,width,staff,bars):detectBarlines(ink,width,staff).measures,components:row.components,rhythmComponents:row.rhythmComponents,rgba:pixels.buffer};
 });
}
