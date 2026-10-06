import {detectBarlines} from './tab-import/geometry.js';

// A beamed note can span exactly the staff height, passing the usual vertical
// coverage and extension checks. Require BOTH its attached filled notehead and
// a beam at the opposite end before rejecting it. A tie or beam beside a real
// barline alone is not enough. Staff rules do not contribute to either test.
export function isPracticeBarline(ink,width,staff,x){
 const g=staff.spacing,halfRule=Math.ceil((staff.thickness??1)/2),height=ink.length/width;
 const density=(edge,side,near,far,reach)=>{
  let dark=0,total=0;
  for(let dy=-Math.ceil(g*reach);dy<=Math.ceil(g*reach);dy++){
   const y=Math.round(edge+dy);
   if(y<0||y>=height||staff.lines.some(line=>Math.abs(line-y)<=halfRule))continue;
   for(let dx=Math.ceil(g*near);dx<=g*far;dx++){
    const col=Math.round(x+side*dx);if(col<0||col>=width)continue;
    dark+=ink[y*width+col];total++;
   }
  }
  return total?dark/total:0;
 };
 const top=staff.lines[0],bottom=staff.lines.at(-1);
 for(const [head,beam,side] of [[bottom,top,-1],[top,bottom,1]]){
  if(density(head,side,.2,1.1,.35)>.4&&Math.max(density(beam,-1,.25,1.3,.35),density(beam,1,.25,1.3,.35))>.25)return false;
 }
 return true;
}

export function detectPracticeBarlines(ink,width,staff,options={}){
 return detectBarlines(ink,width,staff,{...options,acceptBoundary:x=>isPracticeBarline(ink,width,staff,x)});
}

// Conventional notation often has no vertical line before the clef. Aligned,
// sustained horizontal rule starts plus a visible right barline establish the
// first measure just as well; don't mark every first measure as uncertain.
export function hasRuledStaffStart(ink,width,staff){
 const half=Math.ceil((staff.thickness??1)/2),g=staff.spacing;
 return staff.lines.every(y=>{
  let supported=0,total=0;
  for(let x=Math.ceil(staff.x);x<staff.x+g*2;x++){
   let dark=0;for(let dy=-half;dy<=half;dy++)dark|=ink[(y+dy)*width+x]??0;
   supported+=dark;total++;
  }
  return supported/total>.85;
 });
}
