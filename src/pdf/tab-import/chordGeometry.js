import {binaryPage,detectStaffs,detectBarlines} from './geometry.js';
import {staffBarMarks} from '../../omr/staffBarMarks.js';

function textComponents(rgba,width,height,g){
 const ink=binaryPage(rgba,width,height,180),parts=[];
 for(let at=0;at<ink.length;at++){
  if(!ink[at])continue;const todo=[at];ink[at]=0;
  let left=width,right=0,top=height,bottom=0;
  while(todo.length){const n=todo.pop(),x=n%width,y=Math.floor(n/width);left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
   for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]){const xx=x+dx,yy=y+dy,j=yy*width+xx;if(xx>=0&&xx<width&&yy>=0&&yy<height&&ink[j]){ink[j]=0;todo.push(j);}}
  }
  if(bottom-top>=g*.65&&bottom-top<=g*3.3&&right-left>=g*.12&&right-left<g*12)parts.push({x:left,y:top,width:right-left+1,height:bottom-top+1});
 }
 const groups=[];
 for(const p of parts.sort((a,b)=>a.x-b.x)){
  const prev=groups.at(-1);
  if(prev&&p.x-(prev.x+prev.width)<g*.9&&Math.min(prev.y+prev.height,p.y+p.height)-Math.max(prev.y,p.y)>Math.min(prev.height,p.height)*.4){const right=Math.max(prev.x+prev.width,p.x+p.width),bottom=Math.max(prev.y+prev.height,p.y+p.height);prev.y=Math.min(prev.y,p.y);prev.width=right-prev.x;prev.height=bottom-prev.y;}
  else groups.push({...p});
 }
 return groups.filter(p=>p.width<g*12);
}

export function notationBarBounds(ink,width,staff){
 const g=staff.spacing;
 const bars=detectBarlines(ink,width,staff).bars.filter(x=>{
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
 const ink=binaryPage(rgba,width,height,230),notation=detectStaffs(ink,width,height,undefined,5);
 return targets.map(target=>{
  const above=notation.filter(s=>s.y<target.y&&target.y-s.y<target.spacing*20&&Math.abs(s.x-target.x)<target.spacing*5).at(-1);
  const staff=target.lines.length===6&&above?above:target,g=staff.spacing;
  const prior=notation.filter(s=>s.y<staff.y).at(-1);
  const x=Math.max(0,Math.floor(staff.x)),right=Math.min(width,Math.ceil(staff.x+staff.width));
  const y=Math.max(0,Math.floor(staff.y-g*6),prior?Math.ceil(prior.y+prior.height+g*2):0),bottom=Math.max(y+1,Math.floor(staff.y-g*.55));
  const w=right-x,h=bottom-y,pixels=new Uint8ClampedArray(w*h*4);
  for(let row=0;row<h;row++)pixels.set(rgba.subarray(((y+row)*width+x)*4,((y+row)*width+right)*4),row*w*4);
  return {staff:target.id,x,y,width:w,height:h,spacing:g,staffY:staff.y,measures:staff.lines.length===5?notationBarBounds(ink,width,staff):detectBarlines(ink,width,staff).measures,components:textComponents(pixels,w,h,g),rgba:pixels.buffer};
 });
}
