import {parseStaffTokens} from './staffTokens.js';
import {ticksOf} from '../etudes/scoreModel.js';
import {meterTicks} from '../etudes/scoreMeters.js';

const lengths={'1':'whole','2':'half','4':'quarter','8':'eighth','16':'sixteenth','32':'thirty_second'};
const complete=bar=>bar.events.length&&bar.events.every(e=>e.duration&&!e.unread)&&bar.events.reduce((sum,e)=>sum+ticksOf(e),0)===meterTicks(bar.meter);
const shape=bar=>JSON.stringify(bar.events.map(e=>[e.rest,!!e.rhythmSlash,e.duration,!!e.dotted,!!e.tuplet,e.notes.map(n=>n.midi)]));
const pitches=bar=>JSON.stringify(bar.events.map(e=>[e.rest,!!e.rhythmSlash,e.notes.map(n=>n.midi)]));

export function cropStaffMeasure(system,index,padding=.5){
  const box=system.measures[index],g=system.staff.spacing,pad=Math.ceil(g*padding),prefix=index?Math.ceil(g*6):0;
  const left=index?Math.floor(box.x)-system.rect.x:0,right=Math.min(system.width,Math.ceil(box.x+box.width)-system.rect.x);
  const available=system.height+(system.extensionHeight??0);
  const top=Number.isFinite(system.staff.y)?Math.max(0,Math.floor(system.staff.y-g*3.5)-system.rect.y):0;
  const bottom=Number.isFinite(system.staff.height)?Math.min(available,Math.ceil(system.staff.y+system.staff.height+g*4)-system.rect.y):available;
  const h=bottom-top,width=right-left+prefix+2*pad,height=h+2*pad;
  const rgba=new Uint8ClampedArray(width*height*4).fill(255),main=new Uint8ClampedArray(system.rgba),extension=new Uint8ClampedArray(system.extension??0);
  for(let y=0;y<h;y++){
    const sourceY=y+top,source=sourceY<system.height?main:extension,row=(sourceY<system.height?sourceY:sourceY-system.height)*system.width*4,dest=((y+pad)*width+pad)*4;
    if(prefix)rgba.set(source.subarray(row,row+prefix*4),dest);
    rgba.set(source.subarray(row+left*4,row+right*4),dest+prefix*4);
  }
  return {rgba:rgba.buffer,width,height};
}

// Stem order provides an independent x anchor. If counts disagree, do not
// assign a slash or a chord to a guessed event (whole notes have no stem).
export function anchorStaffMeasure(bar,ink,{refinePitches=false}={}){
  const sounding=bar.events.filter(e=>!e.rest);
  let stems=ink.stems;
  if(stems.length>sounding.length){
    // Flags, chord-head edges and printed chord letters may form a second
    // short vertical stroke beside a real stem. They are not extra notes.
    const merged=[];
    for(const stem of stems){
      const previous=merged.at(-1);
      if(previous&&stem.x-previous.x<ink.height/4*.9){if(stem.bottom-stem.top>previous.bottom-previous.top)merged[merged.length-1]=stem;}
      else merged.push(stem);
    }
    const withoutText=merged.filter(s=>ink.slashes.some(p=>p.x===s.x)||s.heads?.some(h=>h.support>.7));
    if(merged.length===sounding.length)stems=merged;
    else if(withoutText.length===sounding.length)stems=withoutText;
  }
  if(sounding.length!==stems.length||sounding.some(e=>e.duration==='1'))return bar;
  let i=0;
  const events=bar.events.map(event=>{
    if(event.rest)return {...event};
    const stem=stems[i++],slash=ink.slashes.find(s=>s.x===stem.x),anchored={...event,x:stem.x};
    if(slash&&event.duration)return {...anchored,raw:`rhythm-slash_${lengths[event.duration]}${event.dotted?'.':''}`,notes:[],rhythmSlash:true,unread:false};
    if(!refinePitches||!['4','8','16','32'].includes(event.duration)||event.notes.length<2||/note-[A-G][#bN]|note-[A-G][0-8][#bN]/.test(event.raw))return anchored;
    // Only repair a model pitch with little head ink, beside a strong oval
    // at a neighbouring staff position. Both crop readings must still agree.
    const parts=refineChordHeads(event,stem);
    const raw=[...new Set(parts)].join('|');
    if(raw===event.raw)return anchored;
    const fixed=parseStaffTokens(`clef-G2+keySignature-${bar.key.endsWith('m')?bar.key:bar.key+'M'}+${raw}`,bar).measures[0]?.events[0];
    return fixed&&!fixed.unread?{...fixed,index:event.index,x:stem.x,inkAdjusted:true}:anchored;
  });
  for(const mark of ink.triplets??[]){
    const g=ink.height/4;
    for(let j=0;j<events.length-2;j++){
      const group=events.slice(j,j+3),[a,b,c]=group;
      if(!['8','16','32'].includes(a.duration)||group.some(e=>e.rest||e.unread||e.dotted||e.tuplet||e.duration!==a.duration||!Number.isFinite(e.x)))continue;
      if(Math.abs(mark.x-b.x)>g*1.2||Math.abs((b.x-a.x)-(c.x-b.x))>g||b.x-a.x<g)continue;
      const tuple={actualNotes:3,normalNotes:2,groupId:`staff-triplet-${Math.round(mark.x)}`};
      group.forEach(e=>{e.tuplet=tuple;});break;
    }
  }
  return {...bar,events,positioned:true};
}

function refineChordHeads(event,stem){
  const parts=event.raw.split('|');if(parts.length>8)return parts;
  const choices=event.notes.map(n=>{
    const step=(n.spelling.octave-4)*7+'CDEFGAB'.indexOf(n.spelling.letter)-2,support=stem.heads?.find(h=>h.step===step)?.support??0;
    const nearby=support<.65?(stem.heads??[]).filter(h=>Math.abs(h.step-step)<=2&&h.support>.7&&h.support-support>=.1):[];
    return nearby.length?nearby.map(h=>({...h,score:h.support-Math.abs(h.step-step)*.08})):[{step,score:support}];
  });
  let best=null,bestScore=-Infinity;
  const visit=(selected,score)=>{
    if(selected.length===choices.length){if(score>bestScore){best=selected;bestScore=score;}return;}
    for(const head of choices[selected.length]){
      if(selected.length&&head.step<selected.at(-1).step)continue;
      visit([...selected,head],score+head.score-(selected.some(h=>h.step===head.step)?.3:0));
    }
  };
  visit([],0);
  return best?parts.map((part,j)=>{
    const degree=best[j].step+30,letter='CDEFGAB'[((degree%7)+7)%7],octave=Math.floor(degree/7);
    return part.replace(/^note-[A-G][0-8]/,`note-${letter}${octave}`);
  }):parts;
}

export function selectStaffMeasureReading(original,readings,ink){
  const candidates=readings.filter(r=>r.clef==='clef-G2'&&r.measures.length===1).map(r=>anchorStaffMeasure(r.measures[0],ink,{refinePitches:true}));
  for(let i=0;i<candidates.length;i++)for(let j=i+1;j<candidates.length;j++){
  const a=candidates[i],b=candidates[j];
  if(a.key!==original.key||b.key!==original.key||a.meter.join('/')!==original.meter.join('/')||b.meter.join('/')!==original.meter.join('/'))continue;
  if(complete(a)&&shape(a)===shape(b))return a;
  // A complete rhythm alone is not sufficient. For a slash-only disagreement,
  // also require the source's visible beams to support the repaired durations.
  if(pitches(a)!==pitches(b)||a.events.length!==b.events.length)continue;
  for(const candidate of [a,b]){
    if(!complete(candidate))continue;
    const other=candidate===a?b:a;
    if(candidate.events.every((e,i)=>e.duration===other.events[i].duration&&!!e.dotted===!!other.events[i].dotted||e.rhythmSlash&&!e.dotted&&ink.slashes.some(s=>s.x===e.x&&s.duration===e.duration)))return candidate;
  }
  }
  return null;
}

export async function refineStaffMeasures(omr,system,parsed,{signal}={}){
  if(system.measures?.length&&system.measures.length!==parsed.measures.length)parsed=await reconcileStaffBarCount(omr,system,parsed,{signal});
  if(parsed.barCountRetry?.accepted)return parsed;
  if(parsed.clef!=='clef-G2'||system.measures?.length!==parsed.measures.length)return parsed;
  const accepted=[],attempts=[];
  const measures=[];
  for(const [i,bar] of parsed.measures.entries()){
    signal?.throwIfAborted();
    const ink={...system.measures[i],triplets:system.triplets??[]},base=anchorStaffMeasure(bar,ink);
    // A stemless whole note can have a wrong staff position while still
    // totaling a full bar. Recheck its bounded crop, not the entire system.
    const whole=bar.events.length===1&&bar.events[0].duration==='1'&&bar.events[0].notes.length===1;
    if(complete(base)&&!whole&&!ink.slashes.length&&!bar.events.some(e=>e.notes.length>1)){measures.push(base);continue;}
    try{
      const readings=[];let chosen=null;
      for(const pad of [.5,2,1,2.5]){
        signal?.throwIfAborted();
        const result=await omr.recognize(cropStaffMeasure(system,i,pad));
        signal?.throwIfAborted();
        // The copied clef is context, not a new key/time change in this bar.
        const raw=result.text.replace(/\+keySignature-[^+]+/g,'').replace(/\+timeSignature-[^+]+/g,'');
        readings.push(parseStaffTokens(raw,{key:bar.key,meter:bar.meter}));
        if(readings.length>=2){
          chosen=selectStaffMeasureReading(bar,readings,ink);
          // A whole-note retry may correct its pitch, never invent extra
          // notes/rests or replace the known duration to make a crop fit.
          if(whole&&chosen&&(chosen.events.length!==1||chosen.events[0].duration!=='1'||chosen.events[0].notes.length!==1))chosen=null;
          if(chosen)break;
        }
      }
      attempts.push({measure:i+1,raw:readings.map(r=>r.raw),accepted:Boolean(chosen)});
      if(chosen){accepted.push(i+1);measures.push(chosen);}else measures.push(whole?{...base,events:base.events.map(e=>({...e,reviewReasons:['pitch']}))}:base);
    }catch(error){
      if(signal?.aborted||error.name==='AbortError')throw error;
      measures.push(whole?{...base,events:base.events.map(e=>({...e,reviewReasons:['pitch']}))}:base);attempts.push({measure:i+1,error:'measure-retry-failed',accepted:false});
    }
  }
  return {...parsed,measures,measureRetry:{acceptedMeasures:accepted,attempts}};
}

// A full-row decoder can hallucinate another complete bar after the printed
// ending. Never trim to a target count or a song name: reread EVERY physical
// measure, twice, and require independent agreement before replacing the row.
export async function reconcileStaffBarCount(omr,system,parsed,{signal}={}){
 const boxes=system.measures??[],reference=parsed.measures[0];
 if(parsed.clef!=='clef-G2'||!reference||!boxes.length||boxes.length>12||boxes.length===parsed.measures.length)return parsed;
 const audit={originalCount:parsed.measures.length,sourceCount:boxes.length,accepted:false,attempts:[]};
 const failed=()=>({...parsed,barCountRetry:audit,warnings:[...parsed.warnings,'source-bar-count-mismatch']});
 // More visual boxes can include a coda, a stemless slash or a non-musical
 // ending. Their notes need separate positive evidence before adding bars.
 // Keep the existing reading instead of turning such symbols into whole notes.
 if(boxes.length>parsed.measures.length)return failed();
 // A key/meter change within the row needs its own spatial reading first.
 if(parsed.measures.some(b=>b.key!==reference.key||b.meter.join('/')!==reference.meter.join('/')))return failed();
 const measures=[];
 try{for(let i=0;i<boxes.length;i++){
  const ink={...boxes[i],triplets:system.triplets??[]},readings=[];let chosen=null;
  for(const pad of [.5,2,1,2.5]){
   signal?.throwIfAborted();
   const read=await omr.recognize(cropStaffMeasure(system,i,pad));signal?.throwIfAborted();
   const raw=read.text.replace(/\+keySignature-[^+]+/g,'').replace(/\+timeSignature-[^+]+/g,'');
   readings.push(boundedStaffReading(parseStaffTokens(raw,{key:reference.key,meter:reference.meter}),ink));
   if(readings.length>=2){chosen=selectStaffMeasureReading(reference,readings,ink);if(chosen)break;}
  }
  audit.attempts.push({measure:i+1,raw:readings.map(r=>r.raw),accepted:Boolean(chosen)});
  if(!chosen)return failed();measures.push(chosen);
 }}catch(error){if(signal?.aborted||error.name==='AbortError')throw error;audit.error='bar-count-retry-failed';return failed();}
 audit.accepted=true;
 return {...parsed,measures,barCountRetry:audit};
}

export function boundedStaffReading(reading,ink){
 if(reading.measures.length<2)return reading;
 const first=anchorStaffMeasure(reading.measures[0],ink);
 // Some decoders continue generating after the closing line even on a
 // single-bar crop. Accept that first bar only if it exhausts the physical
 // note stems AND has a complete rhythm. A second crop must still agree.
 if(!complete(first)||!first.positioned||!first.events.some(e=>!e.rest))return reading;
 return {...reading,measures:[first],discardedCropTail:reading.measures.slice(1)};
}
