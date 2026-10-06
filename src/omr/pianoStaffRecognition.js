import {parseStaffTokens} from './staffTokens.js';
import {cropStaffMeasure} from './staffMeasureRecognition.js';
import {hasCompleteStaffRhythm} from './staffRecognition.js';
import {attachPianoTieEvidence,pianoPrintedHeadPositions} from './pianoTieEvidence.js';
import {binaryPage,runs} from '../pdf/tab-import/geometry.js';
import {parsePianoTokens} from './pianoPolyphony.js';
import {wholePianoRestEvidence} from './pianoRestEvidence.js';
import {refinePianoChordHeads} from './pianoHeadEvidence.js';
import {pianoCropEdges} from './pianoCropEvidence.js';

// Later bars need the entire printed clef/key/meter, not an arbitrary six-gap
// strip which can cut the clef in half. Use the first bar's uniquely matched
// first note as the right boundary; the copied pixels contain no notes/rests.
export function pianoHeaderWidth(system,parsed){
 const known=standardPianoHeaderWidth(system,parsed);if(known!==null)return known;
 if(!system.pianoTopHeight)return null;
 const rgba=new Uint8ClampedArray(system.width*(system.height+system.pianoTopHeight)*4);
 rgba.set(new Uint8ClampedArray(system.pianoTop));rgba.set(new Uint8ClampedArray(system.rgba),system.width*system.pianoTopHeight*4);
 return standardPianoHeaderWidth({...system,rgba:rgba.buffer,height:system.height+system.pianoTopHeight,rect:{...system.rect,y:system.rect.y-system.pianoTopHeight}},parsed);
}
function standardPianoHeaderWidth(system,parsed){
 const firstBar=parsed.measures[0],g=system.staff.spacing;
 if(firstBar?.events[0]?.rest){
  if(firstBar.events.length!==1||firstBar.events[0].duration!=='1')return null;
  // For an otherwise empty opening bar, locate the visible whole-rest block.
  // End the header before it, so no synthetic/duplicated rest enters later bars.
  const ink=binaryPage(new Uint8ClampedArray(system.rgba),system.width,system.height,180),box=system.measures[0],line=system.staff.lines[1]-system.rect.y,xs=[];
  for(let x=Math.ceil(box.x-system.rect.x+g*8);x<box.x+box.width-system.rect.x-g;x++){
   if([.15,.25,.35].every(dy=>ink[Math.round(line+dy*g)*system.width+x]))xs.push(x);
  }
  const blocks=runs(xs).filter(xs=>xs.length>=g*.65&&xs.length<=g*1.6);
  return blocks.length===1?Math.floor(Math.min(blocks[0][0]-g,system.staff.x-system.rect.x+g*18)):null;
 }
 if(firstBar?.pianoPolyphony){
  const written=parseStaffTokens(parsed.raw,{meter:parsed.meter,key:parsed.key,polyphonic:true}).measures[0]?.events[0];
  const positions=(written?.notes??[]).map(note=>{
   const bar={...firstBar,pianoPolyphony:false,events:[{...written,...note.writtenRhythm,notes:[note]}]};
   return attachPianoTieEvidence({...system,measures:system.measures.slice(0,1)},{...parsed,measures:[bar]}).pianoTieAudit[0]?.positions?.[0];
  }).filter(Number.isFinite);
  if(positions.length){const first=Math.min(...positions),edge=first-g*(positions.length===written.notes.length?1.1:2.8);if(edge>g*6&&edge<g*20)return Math.floor(edge);}
  return null;
 }
 const headerBar=firstBar;
 const evidence=attachPianoTieEvidence({...system,measures:system.measures.slice(0,1)},{...parsed,measures:[headerBar]});
 const audit=evidence.pianoTieAudit[0];
 // A later hollow head may be ambiguous while the first filled chord is
 // clearly located. Header framing needs only that first attack, not every
 // tie in the bar. Never copy an earlier observed note into the header.
 const candidates=Object.values(audit?.candidates??{}),start=candidates[0]?.[0];
 let first=audit?.positions?.[0]??(Number.isFinite(start)&&candidates.every(xs=>xs.every(x=>x>=start))?start:undefined);
 const openingNotes=firstBar?.events[0]?.notes??[];
 if(!Number.isFinite(first)&&openingNotes.length>1&&openingNotes.every(n=>n.spelling.letter===openingNotes[0].spelling.letter&&n.spelling.alter===openingNotes[0].spelling.alter)){
  // Very high octave chords can have a ledger-line hollow head outside the
  // ordinary crop. A uniquely located companion head still bounds the header;
  // only framing changes here, and subsequent model readings must agree.
  const event=firstBar.events[0],positions=event.notes.flatMap(note=>{
   const single={...firstBar,events:[{...event,notes:[note]}]};
   const a=attachPianoTieEvidence({...system,measures:system.measures.slice(0,1)},{...parsed,measures:[single]}).pianoTieAudit[0];
   return Number.isFinite(a?.positions?.[0])?[a.positions[0]]:[];
  });
  const earliest=Math.min(...positions);
  if(positions.length&&candidates.every(xs=>xs.every(x=>x>=earliest)))first=earliest;
 }
 return Number.isFinite(first)&&first>g*6&&first<g*20?Math.floor(first-g*(firstBar?.pianoPolyphony?1.9:1)):null;
}
export function cropPianoMeasure(system,index,padding,headerWidth,{extended=false}={}){
 if(!extended&&(!index||!headerWidth))return cropStaffMeasure(system,index,padding);
 const box=system.measures[index],g=system.staff.spacing,pad=Math.ceil(g*padding);
 const left=index?Math.floor(box.x)-system.rect.x:0,right=Math.min(system.width,Math.ceil(box.x+box.width)-system.rect.x);
 headerWidth=index?(headerWidth??Math.ceil(g*6)):0;
 const available=system.height+(system.extensionHeight??0),top=Math.max(extended==='both'?-(system.pianoTopHeight??0):0,Math.floor(system.staff.y-g*(extended==='both'?5.5:3.5))-system.rect.y),bottom=Math.min(available,Math.ceil(system.staff.y+system.staff.height+g*(extended?7.5:4))-system.rect.y);
 const h=bottom-top,width=right-left+headerWidth+2*pad,height=h+2*pad,rgba=new Uint8ClampedArray(width*height*4).fill(255);
 const main=new Uint8ClampedArray(system.rgba),extension=new Uint8ClampedArray(system.extension??0),above=new Uint8ClampedArray(system.pianoTop??0);
 for(let y=0;y<h;y++){
  const sy=y+top,pixels=sy<0?above:sy<system.height?main:extension,row=(sy<0?sy+system.pianoTopHeight:sy<system.height?sy:sy-system.height)*system.width*4,dest=((y+pad)*width+pad)*4;
  if(sy>=0)rgba.set(pixels.subarray(row,row+headerWidth*4),dest);rgba.set(pixels.subarray(row+left*4,row+right*4),dest+headerWidth*4);
 }
 return {rgba:rgba.buffer,width,height};
}

const shape=r=>JSON.stringify([r.clef,r.measures.map(m=>[m.key,m.meter,m.events.map(e=>[e.rest,e.duration,!!e.dotted,e.notes.map(n=>n.midi),e.pianoTiePitchesFromPrevious])])]);
export function hasMixedPianoDurations(reading){
 return String(reading.raw).split('+').some(token=>token.includes('|')&&new Set(token.split('|').map(n=>n.match(/_(whole|half|quarter|eighth|sixteenth|thirty_second)(\.)?$/)?.[0]).filter(Boolean)).size>1);
}
export function pianoMeasureConsensus(readings,clef){
 const valid=readings.filter(r=>r.clef===clef&&r.measures.length===1&&hasCompleteStaffRhythm(r.measures[0]));
 return valid.find((r,i)=>valid.slice(i+1).some(other=>shape(r)===shape(other)))??null;
}
export function singleWholePianoReading(reading,system,index){
 if(reading.measures.length<2||reading.measures.length>4)return reading;
 const bar=reading.measures[0],event=bar.events[0],g=system.staff.spacing;
 if(bar.meter.join('/')!=='4/4'||bar.events.length!==1||event.rest||event.duration!=='1'||event.dotted||!event.notes.length||system.measures[index].width>g*16)return reading;
 const signature=JSON.stringify(event.notes.map(n=>n.midi));
 if(!reading.measures.every(m=>m.key===bar.key&&m.meter.join('/')==='4/4'&&m.events.length===1&&!m.events[0].rest&&m.events[0].duration==='1'&&!m.events[0].dotted&&JSON.stringify(m.events[0].notes.map(n=>n.midi))===signature))return reading;
 const positions=pianoPrintedHeadPositions(system,bar,index,reading.clef);
 if(positions?.length!==1||!Number.isFinite(positions[0])||system.measures[index].stems.some(s=>s.heads?.some(h=>h.support>.7)))return reading;
 const prefix=reading.raw.split('+').filter(t=>/^(clef-|keySignature-|timeSignature-)/.test(t)).join('+');
 return {...parsePianoTokens(prefix+'+'+event.raw+'+barline',bar),singleChordEvidence:{method:'one-physical-bar-unique-whole-heads',x:positions[0],decodedBars:reading.measures.length},originalRaw:reading.raw};
}
// Grand Staff only: bounded physical bars replace long-row repeated decoding.
// Two independent margins must agree on every pitch and written duration.
export async function recognizePianoStaff(omr,system,context,clef,{signal}={}){
 const accepted=[],audit=[];let inherited=context,headerWidth=null;
 for(let i=0;i<system.measures.length;i++){
  const readings=[];let chosen;const restEvidence=wholePianoRestEvidence(system,i);
  for(const margin of [.5,2,1]){
   signal?.throwIfAborted();const read=await omr.recognize(cropPianoMeasure(system,i,margin,headerWidth));signal?.throwIfAborted();
   readings.push(refinePianoChordHeads(singleWholePianoReading(parsePianoTokens(read.text,inherited),system,i),system,i));chosen=pianoMeasureConsensus(readings,clef);
   if(!chosen&&restEvidence&&readings.length>=2){
    const restOnly=r=>r.clef===clef&&r.measures.length>0&&r.measures.length<=2&&r.measures.every(m=>m.events.length===1&&m.events[0].rest&&['1','2'].includes(m.events[0].duration));
    const a=readings.at(-2),b=readings.at(-1);
    if(restOnly(a)&&restOnly(b)&&a.key===b.key&&a.meter.join('/')===b.meter.join('/')&&a.meter[0]===4&&a.meter[1]===4){
     const prefix=a.raw.split('+').filter(t=>/^(clef-|keySignature-|timeSignature-)/.test(t)).join('+');
     chosen=parsePianoTokens(prefix+'+rest-whole+barline',inherited);chosen.restEvidence=restEvidence;
    }
   }
   if(chosen)break;
  }
  // Only retry failed bars. A ledger note's beam can lie below the normal
  // crop; two complete extended crops must agree without rhythm arithmetic.
  const extendedReadings=[];let cropEdges;
  if(!chosen&&system.pianoExtendedCrop){
   cropEdges=pianoCropEdges(system,i);
   for(const extended of [...(cropEdges.bottom?[true]:[]),...(cropEdges.top?['both']:[])]){
    const candidates=[];
    for(const margin of [.5,2]){
     signal?.throwIfAborted();const read=await omr.recognize(cropPianoMeasure(system,i,margin,headerWidth,{extended}));signal?.throwIfAborted();
     const parsed=refinePianoChordHeads(singleWholePianoReading(parsePianoTokens(read.text,inherited),system,i),system,i);candidates.push(parsed);extendedReadings.push(parsed);
    }
    chosen=pianoMeasureConsensus(candidates,clef);if(chosen)break;
   }
  }
  const imageEvidence=readings.map(r=>({heads:r.headEvidence,wholeChord:r.singleChordEvidence}));
  audit.push({measure:i+1,accepted:Boolean(chosen),raw:readings.map(r=>r.originalRaw??r.raw),...(extendedReadings.length?{cropEdges,extendedRaw:extendedReadings.map(r=>r.raw)}:{}),...(chosen?.restEvidence?{restEvidence}: {}),...(imageEvidence.some(e=>e.heads||e.wholeChord)?{imageEvidence}: {})});
  if(!chosen){const detail=readings.filter(hasMixedPianoDurations).length>=2?'한 오선 안에서 길이가 다른 음들이 겹쳐 울리는 다성부가 있습니다. 이 지속음을 현재 피아노 편집 형식으로 정확히 보존하지 못했습니다.':'음높이·리듬이 재검사에서 일치하지 않았습니다. 원본 대조가 필요합니다.';const error=Error(`피아노 오선 ${system.id}, ${i+1}마디: ${detail} 부분 결과를 완성 악보로 가져오지 않았습니다.`);error.pianoReadings=audit;throw error;}
  accepted.push(chosen);inherited={key:chosen.key,meter:chosen.meter};if(!i)headerWidth=pianoHeaderWidth(system,chosen);
 }
 const parsed=parsePianoTokens(accepted.map(r=>r.raw.replace(/\+barline$/,'')).join('+barline+')+'+barline',context);
 return attachPianoTieEvidence(system,{...parsed,pianoMeasureRetry:audit,pianoHeaderWidth:headerWidth});
}
