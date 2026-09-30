import {validScoreMeter} from '../../etudes/scoreMeters.js';

// Read only a stacked pair of large numerals before the first played column.
// Fret-sized digits, TAB letters and chord diagrams cannot supply a meter.
export function findPrintedMeter(ink,width,staff){
 const g=staff.spacing,first=Math.min(...staff.candidates.filter(c=>!c.nonFretSymbol).map(c=>c.cx));
 const left=Math.ceil(staff.x+g*1.7),right=Math.floor(Math.min(first-g*.8,staff.x+g*6));
 if(right-left<g*.7)return null;
 const middle=(staff.lines[0]+staff.lines[5])/2;
 const pixel=(x,y)=>{
  if(!ink[y*width+x])return 0;
  const line=staff.lines.find(line=>Math.abs(y-line)<=Math.ceil(staff.thickness/2));
  if(line===undefined)return 1;
  const offset=Math.ceil(staff.thickness/2)+1;
  return ink[(line-offset)*width+x]&&ink[(line+offset)*width+x]?1:0;
 };
 const digits=[];
 for(const [top,bottom] of [[Math.floor(middle-g*1.65),Math.floor(middle)-1],[Math.floor(middle),Math.ceil(middle+g*1.65)]]){
  const points=[];for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++)if(pixel(x,y))points.push({x,y});
  if(!points.length)return null;
  const x=Math.min(...points.map(p=>p.x)),y=Math.min(...points.map(p=>p.y)),w=Math.max(...points.map(p=>p.x))-x+1,h=Math.max(...points.map(p=>p.y))-y+1;
  if(h<g*1.05||h>g*1.65||w<g*.4||w>g*2.8)return null;
  const bitmap=new Uint8Array(w*h),grayscale=new Uint8Array(w*h).fill(255);
  for(const p of points){const at=(p.y-y)*w+p.x-x;bitmap[at]=1;grayscale[at]=0;}
  digits.push({id:`meter-${staff.id}-${digits.length}`,x,y,width:w,height:h,cx:x+w/2,cy:y+h/2,parts:w>h*1.2?2:1,stringDistance:0,bitmap,grayscale});
 }
 if(Math.abs(digits[0].cx-digits[1].cx)>g*.5||Math.abs(digits[0].height-digits[1].height)>g*.35)return null;
 return {digits,source:{x:left,y:digits[0].y,width:right-left+1,height:digits[1].y+digits[1].height-digits[0].y},status:'unresolved'};
}

export function resolvePrintedMeter(candidate,threshold=.95){
 if(!candidate)return null;
 const reads=candidate.digits.map(d=>d.ocr),meter=reads.map(r=>Number(r?.text));
 const confirmed=reads.every(r=>r?.agrees&&r.confidence>=threshold&&/^\d{1,2}$/.test(r.text))&&validScoreMeter(meter);
 return {status:confirmed?'confirmed':'unresolved',meter:confirmed?meter:null,confidence:Math.min(...reads.map(r=>r?.confidence??0)),method:'stacked-meter-ocr',source:candidate.source,readings:reads};
}
