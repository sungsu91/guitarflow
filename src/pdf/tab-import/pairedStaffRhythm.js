import {detectStaffs,runs} from './geometry.js';
import {notationBarBounds} from './chordGeometry.js';
import {staffMeasureInk} from '../../omr/staffMeasureInk.js';

function openWholeHead(ink,width,staff,x){
 const g=staff.spacing,at=(x,y)=>ink[Math.round(y)*width+Math.round(x)]??0;
 for(let step=-4;step<=12;step++)for(const shift of [-.15,0,.15]){
  const cy=staff.lines.at(-1)-step*g/2,cx=x+shift*g;let ring=0,n=0,inside=0,k=0;
  for(let angle=0;angle<Math.PI*2;angle+=Math.PI/24){
   const y=cy+Math.sin(angle)*g*.32;
   if(staff.lines.some(line=>Math.abs(y-line)<=staff.thickness/2+1))continue;
   ring+=at(cx+Math.cos(angle)*g*.72,y);n++;
  }
  for(let dy=-g*.18;dy<=g*.18;dy++)for(let dx=-g*.35;dx<=g*.35;dx++){
   if(staff.lines.some(line=>Math.abs(cy+dy-line)<=staff.thickness/2+1))continue;
   inside+=at(cx+dx,cy+dy);k++;
  }
  if(n>=12&&k>=8&&ring/n>.72&&inside/k<.18)return true;
 }
 return false;
}

function hollowStemHeads(ink,width,staff,stem,x){
 const g=staff.spacing,at=(x,y)=>ink[Math.round(y)*width+Math.round(x)]??0,heads=[];
 for(let step=-4;step<=12;step++){
  const cy=staff.lines.at(-1)-step*g/2;
  if(Math.min(Math.abs(cy-stem.top),Math.abs(cy-stem.bottom))>g*.55)continue;
  let ring=0,n=0,inside=0,k=0;
  for(let angle=0;angle<Math.PI*2;angle+=Math.PI/20){
   const dx=Math.cos(angle)*g*.55,dy=Math.sin(angle)*g*.22-dx*.4,y=cy+dy;
   if(staff.lines.some(line=>Math.abs(y-line)<=staff.thickness/2+1))continue;
   let dark=0;for(let d=-1;d<=1;d++)dark|=at(x+dx,y+d);ring+=dark;n++;
  }
  for(let dx=-g*.25;dx<=g*.25;dx++)for(let dy=-g*.07;dy<=g*.07;dy++){
   const y=cy+dy-dx*.4;if(staff.lines.some(line=>Math.abs(y-line)<=staff.thickness/2+1))continue;
   inside+=at(x+dx,y);k++;
  }
  if(n>=8&&k>=3&&ring/n>.8&&inside/k<.2)heads.push({step,hollow:true});
 }
 return heads;
}

export function pairedStemDuration(ink,width,height,staff,stem){
 const g=staff.spacing,at=(x,y)=>x>=0&&x<width&&y>=0&&y<height?(ink[Math.round(y)*width+Math.round(x)]??0):0;
 const heads=stem.heads.map(h=>staff.lines.at(-1)-h.step*g/2);
 const nearTop=Math.min(...heads.map(y=>Math.abs(y-stem.top))),nearBottom=Math.min(...heads.map(y=>Math.abs(y-stem.bottom)));
 if(Math.min(nearTop,nearBottom)>g*.65||Math.abs(nearTop-nearBottom)<g)return null;
 const up=nearBottom<nearTop,tip=up?stem.top:stem.bottom,sign=up?1:-1,side=up?-1:1;
 let beamCount=0,sideInk=0;
 for(const horizontal of [-1,1]){
  const ys=[];
  for(let dy=-g*.1;dy<g*1.65;dy++){
   const y=tip+sign*dy;
   let dark=0,total=0;
   for(let dx=g*.4;dx<g*1.15;dx++){dark+=at(stem.x+horizontal*dx,y);total++;}
   if(!staff.lines.some(line=>Math.abs(y-line)<=staff.thickness/2+1))sideInk+=dark;
   if(total&&dark/total>.86)ys.push(Math.round(dy));
  }
  const bands=runs(ys).filter(b=>b.length>=Math.max(2,g*.07)&&b.length<g*.45&&b.filter(dy=>!staff.lines.some(line=>Math.abs(tip+sign*dy-line)<=staff.thickness/2+1)).length>=2);
  beamCount=Math.max(beamCount,bands.length);
 }
 if(beamCount>=1&&beamCount<=3)return String(4*2**beamCount);
 if(beamCount||sideInk>g*g*.18)return null; // flags/slurs need independent evidence
 const headY=heads.reduce((a,b)=>Math.abs(a-(up?stem.bottom:stem.top))<Math.abs(b-(up?stem.bottom:stem.top))?a:b),headX=stem.x+side*g*.5;
 let center=0,total=0;
 for(let dy=-g*.18;dy<=g*.18;dy++)for(let dx=-g*.2;dx<=g*.2;dx++){
  if(staff.lines.some(line=>Math.abs(headY+dy-line)<=staff.thickness/2+1))continue;
  center+=at(headX+dx,headY+dy);total++;
 }
 if(total&&center/total>.8)return '4';
 if(total&&center/total<.2)return '2';
 return null;
}

// Couple only an adjacent notation staff with the same printed bar boundaries.
// TABs that already carry rhythm remain on the established recognition path.
// A complete simple bar must fit its printed meter; ambiguous/polyphonic bars
// are left unresolved. No beat is filled merely to make the sum come out.
export function attachPairedStaffRhythm(ink,rules,width,height,tabs){
 const eligible=tabs.filter(t=>t.measures.every(m=>!m.rhythm.some(r=>!r.rest)));
 if(!eligible.length)return;
 const notation=detectStaffs(rules,width,height,undefined,5);
 for(const tab of eligible){
  const upper=notation.filter(s=>s.y+s.height<tab.y&&tab.y-s.y-s.height<tab.spacing*16&&!tabs.some(t=>t!==tab&&t.y>s.y&&t.y<tab.y)).at(-1);
  if(!upper)continue;
  // A beam fused to a ruled line can shift its detected center/thickness and
  // hide one beam level. Do not turn that ambiguous 16th into an eighth.
  const origins=upper.lines.map((y,i)=>y-i*upper.spacing);
  if(Math.max(...origins)-Math.min(...origins)>Math.max(1,upper.spacing*.08))continue;
  const boxes=notationBarBounds(ink,width,upper),g=upper.spacing;
  for(const measure of tab.measures){
   if(measure.rhythm.length)continue;
   // Repeat-bar double strokes can put the notation and TAB boundary centers
   // on opposite sides of the same printed separator. Still require both
   // edges and a unique matching bar, never pair by bar number alone.
   const matches=boxes.filter(b=>Math.abs(b.x-measure.x)<g*1.2&&Math.abs(b.x+b.width-measure.x-measure.width)<g*1.2);
   let box=matches.length===1?matches[0]:null;
   // An opening repeat can hide a preceding whole-note bar from the notation
   // cropper. Both its ruled left edge and printed right boundary must agree.
   if(!box&&Math.abs(measure.x-upper.x)<g*.5&&boxes.some(b=>Math.abs(b.x-measure.x-measure.width)<g*.8))box={...measure,y:upper.y,height:upper.height};
   if(!box)continue;
   const columns=runs(tab.candidates.filter(c=>!c.nonFretSymbol&&!c.restSymbol&&c.stringDistance<=.22&&c.cx>measure.x&&c.cx<measure.x+measure.width).map(c=>c.cx).sort((a,b)=>a-b),tab.spacing*.38).map(xs=>xs.reduce((a,b)=>a+b,0)/xs.length);
   if(!columns.length)continue;
   const {stems}=staffMeasureInk(ink,width,height,upper,box,{first:boxes.indexOf(box)===0});
   const used=new Set(),readings=[];
   for(const x of columns){
    for(const stem of stems)if(!stem.heads.length&&Math.abs(stem.x-x)<g*1.1)stem.heads=hollowStemHeads(ink,width,upper,stem,x);
    const matches=stems.filter(s=>s.heads.length&&Math.abs(s.x-x)<g*1.1);
    let duration=null;
    if(matches.length===1&&!used.has(matches[0])){used.add(matches[0]);duration=pairedStemDuration(ink,width,height,upper,matches[0]);}
    else if(!matches.length&&columns.length===1&&openWholeHead(ink,width,upper,x))duration='1';
    readings.push({x,y:tab.y+tab.height,duration,confidence:duration ? .97 : 0,method:'aligned-notation-rhythm'});
   }
   // Until local meter/dot/tuplet evidence is implemented here, couple only
   // the explicitly supported complete 4/4 forms. No partial guessed rhythm.
   const ticks=readings.reduce((n,r)=>n+(r.duration?1920/Number(r.duration):0),0);
   if(readings.every(r=>r.duration)&&ticks===1920&&used.size===stems.filter(s=>s.heads.length&&s.x>columns[0]-g&&s.x<columns.at(-1)+g).length){measure.rhythm=readings;measure.pairedRhythm={staff:upper.id,method:'aligned-notation-rhythm',meter:[4,4]};}
  }
 }
}
