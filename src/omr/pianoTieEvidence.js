import {runs,binaryPage} from '../pdf/tab-import/geometry.js';
import {parseStaffTokens} from './staffTokens.js';
import {ticksOf} from '../etudes/scoreModel.js';

const sameChord=(a,b)=>!a.rest&&!b.rest&&a.notes.length>0&&a.notes.length===b.notes.length&&a.notes.every((n,i)=>n.midi===b.notes[i].midi);
function headY(note,system,clef){
 const p=note.spelling;if(!p)return null;
 const degree=p.octave*7+'CDEFGAB'.indexOf(p.letter),bottom=clef==='clef-F4'?18:30;
 return system.staff.lines.at(-1)-system.rect.y-(degree-bottom)*system.staff.spacing/2;
}
function locateHeads(ink,width,height,system,bar,index,clef,audit){
 const g=system.staff.spacing,box=system.measures[index],left=Math.max(0,Math.ceil(box.x-system.rect.x+(index?g*.6:g*4))),right=Math.min(width-1,Math.floor(box.x+box.width-system.rect.x-g*.5));
 const noteDuration=(e,n)=>n.writtenRhythm?.duration??e.duration;
 const cache=new Map(),sounding=bar.events.filter(e=>!e.rest),keyOf=e=>`${e.notes.map(n=>`${n.midi}:${['1','2'].includes(noteDuration(e,n))?'hollow':'filled'}`).join(',')}`;
 for(const e of sounding){
  const key=keyOf(e);if(cache.has(key))continue;
  const ys=e.notes.map(n=>headY(n,system,clef));if(!ys.length||ys.some(y=>y===null))return null;
  const xs=[];
  for(let x=left;x<=right;x++){
   const supported=ys.every((y,noteIndex)=>{
    const duration=noteDuration(e,e.notes[noteIndex]);
    // Adjacent diatonic notes share a stem but sit on opposite sides of it.
    const displaced=ys.some(other=>Math.abs(Math.abs(other-y)-g/2)<g*.1);
    const offsets=duration==='1'?[1.25,1.5]:[1.25];
    const positions=displaced?[x,...offsets.flatMap(dx=>[Math.round(x-g*dx),Math.round(x+g*dx)])]:[x];
    return positions.some(x=>{
    if(['1','2'].includes(duration)){
     const onLine=yy=>system.staff.lines.some(line=>Math.abs(line-system.rect.y-yy)<system.staff.thickness/2+1);
     let white=0,centre=0;
     for(const dx of [-.12,0,.12])for(const dy of [-.15,0,.15]){const yy=Math.round(y+dy*g),xx=Math.round(x+dx*g);if(onLine(yy))continue;centre++;white+=!ink[yy*width+xx]?1:0;}
     if(centre<3||white/centre<.65)return false;
     // Whole heads are wider than half heads; their printed width depends on
     // the notation font. Verify a complete hollow ring for each candidate.
     return (duration==='1'?[.55,.7,.8]:[.55]).some(radius=>{
     let ring=0,tested=0;
     for(let a=0;a<12;a++){
      const dx=Math.cos(a*Math.PI/6)*g*radius,dy=Math.sin(a*Math.PI/6)*g*.35-(duration==='2'?dx*.3:0),yy=Math.round(y+dy),xx=Math.round(x+dx);
      if(onLine(yy))continue;tested++;let found=false;
      for(let ox=-1;ox<=1;ox++)for(let oy=-1;oy<=1;oy++)if(!onLine(yy+oy)&&ink[(yy+oy)*width+xx+ox])found=true;
      ring+=found?1:0;
     }
     return tested>=6&&ring/tested>=.8;
     });
    }
    let dark=0,total=0;
    for(let dy=-Math.floor(g*.25);dy<=g*.25;dy++)for(let dx=-Math.floor(g*.3);dx<=g*.3;dx++){
     if((dx/(g*.3))**2+(dy/(g*.25))**2>1)continue;
     const yy=Math.round(y+dy);if(yy<0||yy>=height||system.staff.lines.some(line=>Math.abs(line-system.rect.y-yy)<system.staff.thickness/2+1))continue;
     total++;dark+=ink[yy*width+x+dx]??0;
    }
    if(!total||dark/total<=.83)return false;
    if(ys.length>1)return true;
    // A filled head is short vertically. Time-signature numerals can fill the
    // inner ellipse too, but continue through the space above/below its centre.
    let clear=0,edge=0;
    for(const side of [-1,1])for(const dy of [.65,.75,.85])for(const dx of [-.1,0,.1]){
     const yy=Math.round(y+side*g*dy),xx=Math.round(x+g*dx);
     if(yy<0||yy>=height||system.staff.lines.some(line=>Math.abs(line-system.rect.y-yy)<system.staff.thickness/2+1))continue;
     edge++;clear+=!ink[yy*width+xx]?1:0;
    }
    return edge<6||clear/edge>=.75;
    });
   });
   if(supported)xs.push(x);
  }
  const clusters=[];
  for(const group of runs(xs)){
   const previous=clusters.at(-1);
   if(['1','2'].includes(e.duration)&&previous&&group[0]-previous.at(-1)<=g*.15)previous.push(...group);else clusters.push(group);
  }
  cache.set(key,clusters.filter(xs=>xs.length>=g*.18&&xs.at(-1)-xs[0]<g*1.8).map(xs=>(xs[0]+xs.at(-1))/2));
 }
 // Require a unique left-to-right association. An extra head or unreadable
 // chord cannot be silently skipped just to attach a plausible-looking tie.
 const solutions=[];
 const search=chosen=>{if(solutions.length>1)return;if(chosen.length===sounding.length){solutions.push(chosen);return;}const e=sounding[chosen.length];for(const x of cache.get(keyOf(e))??[])if(!chosen.length||x-chosen.at(-1)>g)search([...chosen,x]);};
 search([]);audit.candidates=Object.fromEntries(cache);audit.solutions=solutions.length;if(solutions.length!==1)return null;
 let n=0;return bar.events.map(e=>e.rest?null:solutions[0][n++]);
}
export function visiblePianoTie(ink,width,height,{x1,x2,y,spacing:g,staffLines=[],maxSpan=9}){
 if(x2-x1<g*1.5||x2-x1>g*maxSpan)return false;
 const pixel=(x,y)=>{const xx=Math.round(x),yy=Math.round(y);return xx>=0&&xx<width&&yy>=0&&yy<height?ink[yy*width+xx]:0;};
 // Engravers shorten inner chord ties much more than outer ties. Search their
 // endpoints as well as curvature; require a thin curved stroke throughout.
 for(const padLeft of [.1,.25,.4,.55,.7,.85,1,1.15,1.3,1.45])for(const padRight of [.1,.25,.4,.55,.7,.85,1,1.15,1.3,1.45]){
 const left=x1+g*padLeft,right=x2-g*padRight;if(right-left<g*.65)continue;
 for(const side of [-1,1])for(const offset of [.15,.25,.4,.5,.55,.6,.7,.75,.85,.9,1,1.05])for(const rise of [.25,.35,.4,.45,.55,.65,.7,.85]){
  let hit=0,total=0,contrast=0;
  for(let i=0;i<=24;i++){
   const u=i/24,x=left+(right-left)*u,yy=y+side*g*(offset+rise*4*u*(1-u));
   if(staffLines.some(line=>Math.abs(yy-line)<g*.13))continue;
   let found=false;for(let dy=-Math.max(1,Math.round(g*.08));dy<=Math.max(1,Math.round(g*.08));dy++)found||=Boolean(pixel(x,yy+dy));
   hit+=found?1:0;total++;
   contrast+=!pixel(x,yy+side*g*.28)&&!pixel(x,yy-side*g*.28)?1:0;
  }
  if(total>=12&&hit/total>=.9&&contrast/total>=.65)return true;
 }
 }
 return false;
}
export function pianoPrintedHeadPositions(system,bar,index,clef){
 const width=system.width,height=system.height+(system.extensionHeight??0),rgba=new Uint8ClampedArray(width*height*4);
 rgba.set(new Uint8ClampedArray(system.rgba));if(system.extension)rgba.set(new Uint8ClampedArray(system.extension),system.width*system.height*4);
 return locateHeads(binaryPage(rgba,width,height,180),width,height,system,bar,index,clef,{});
}
export function attachPianoTieEvidence(system,parsed){
 const width=system.width,height=system.height+(system.extensionHeight??0),rgba=new Uint8ClampedArray(width*height*4);
 rgba.set(new Uint8ClampedArray(system.rgba));if(system.extension)rgba.set(new Uint8ClampedArray(system.extension),system.width*system.height*4);
 const ink=binaryPage(rgba,width,height,180),g=system.staff.spacing,staffLines=system.staff.lines.map(y=>y-system.rect.y);
 const evidence=[],audits=[],written=parseStaffTokens(parsed.raw,{key:parsed.key,meter:parsed.meter,polyphonic:true}).measures;
 const measures=parsed.measures.map((bar,index)=>{
  // These ties encode independently written sustained notes. Their later
  // slices do not have new printed heads to locate in the original pixels.
  if(bar.pianoPolyphony){
   const audit={measure:index+1,polyphonicSlices:true};audits.push(audit);
   const original=written[index];if(!original)return bar;
   const timing=writtenAttacks(original,[]),events=bar.events.map(({pianoTiePitchesFromPreviousBar,...e})=>({...e,pianoTiePitchesFromPrevious:timing.filter(n=>n.start<e.onset&&n.end>e.onset).map(n=>n.midi)}));
   const positions=locateHeads(ink,width,height,system,original,index,parsed.clef,audit);audit.writtenPositions=positions;
   if(!positions)return {...bar,events};
   const attacks=writtenAttacks(original,positions);
   for(const next of attacks)for(const prior of attacks){
    if(prior.midi!==next.midi||prior.end!==next.start||!Number.isFinite(prior.x)||!Number.isFinite(next.x))continue;
    if(!visiblePianoTie(ink,width,height,{x1:prior.x,x2:next.x,y:headY(next.note,system,parsed.clef),spacing:g,staffLines,maxSpan:14}))continue;
    const event=events.find(e=>e.onset===next.start);if(!event)continue;
    if(!event.pianoTiePitchesFromPrevious.includes(next.midi))event.pianoTiePitchesFromPrevious.push(next.midi);
    evidence.push({measure:index+1,midi:next.midi,onset:next.start,method:'written-polyphonic-heads-visible-arc'});
   }
   return {...bar,events};
  }
  if(parsed.pianoTies)bar={...bar,events:bar.events.map(({tieFromPrevious,tieFromPreviousBar,pianoTiePitchesFromPreviousBar,...event})=>event)};
  const audit={measure:index+1};audits.push(audit);const positions=locateHeads(ink,width,height,system,bar,index,parsed.clef,audit);audit.positions=positions;if(!positions)return bar;
  const events=bar.events.map((e,i)=>({...e,...(Number.isFinite(positions[i])?{x:system.rect.x+positions[i]}:{})}));
  for(let i=1;i<events.length;i++){
   const a=events[i-1],b=events[i];if(!sameChord(a,b))continue;
   const ties=a.notes.map(n=>visiblePianoTie(ink,width,height,{x1:positions[i-1],x2:positions[i],y:headY(n,system,parsed.clef),spacing:g,staffLines}));
   (audit.pairs??=[]).push({from:i-1,to:i,ties,ys:a.notes.map(n=>headY(n,system,parsed.clef))});
   if(ties.every(Boolean)){b.tieFromPrevious=true;evidence.push({measure:index+1,from:i-1,to:i,method:'all-chord-heads-visible-arcs'});}
  }
  return {...bar,events,positioned:positions.some(Number.isFinite)};
 });
 for(let index=1;index<measures.length;index++){
  const previous=measures[index-1],bar=measures[index],a=previous.events.at(-1),b=bar.events[0],x1=audits[index-1].positions?.at(-1),x2=audits[index].positions?.[0];
  if(!a||!b||!sameChord(a,b)||!Number.isFinite(x1)||!Number.isFinite(x2))continue;
  if(a.notes.every(n=>visiblePianoTie(ink,width,height,{x1,x2,y:headY(n,system,parsed.clef),spacing:g,staffLines}))){bar.events[0]={...b,tieFromPreviousBar:true};evidence.push({measure:index+1,from:previous.events.length-1,to:0,crossBar:true,method:'all-chord-heads-visible-arcs'});}
 }
 // Only the subset with a visible arc is continued when another voice moves
 // independently across the barline. Slices are not new printed attacks.
 for(let index=1;index<measures.length;index++){
  if(!measures[index-1].pianoPolyphony&&!measures[index].pianoPolyphony)continue;
  const a=written[index-1],b=written[index],xs=audits[index-1].writtenPositions??audits[index-1].positions,ys=audits[index].writtenPositions??audits[index].positions;
  if(!a||!b||!xs||!ys)continue;
  const capacity=a.meter[0]*1920/a.meter[1],prior=writtenAttacks(a,xs).filter(n=>n.end===capacity),next=writtenAttacks(b,ys).filter(n=>n.start===0),pitches=[];
  for(const n of next){const p=prior.find(p=>p.midi===n.midi);if(!p||!Number.isFinite(p.x)||!Number.isFinite(n.x))continue;
   if(visiblePianoTie(ink,width,height,{x1:p.x,x2:n.x,y:headY(n.note,system,parsed.clef),spacing:g,staffLines}))pitches.push(n.midi);
  }
  if(pitches.length){measures[index].events[0]={...measures[index].events[0],pianoTiePitchesFromPreviousBar:pitches};evidence.push({measure:index+1,pitches,crossBar:true,method:'written-polyphonic-heads-visible-arc'});}
 }
 return {...parsed,measures,pianoTies:evidence,pianoTieAudit:audits};
}

function writtenAttacks(bar,positions){
 let at=0;return bar.events.flatMap((e,i)=>{const start=at;at+=ticksOf(e);return e.notes.map(note=>({note,midi:note.midi,start,end:start+ticksOf(note.writtenRhythm??e),x:positions[i]}));});
}
