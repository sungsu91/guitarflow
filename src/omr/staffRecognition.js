import {parseStaffTokens} from './staffTokens.js';
import {ticksOf} from '../etudes/scoreModel.js';
import {meterTicks} from '../etudes/scoreMeters.js';
import {refineStaffMeasures} from './staffMeasureRecognition.js';

export function hasCompleteStaffRhythm(bar){
  return bar.events.length>0&&bar.events.every(e=>!e.unread&&e.duration)&&bar.events.reduce((n,e)=>n+ticksOf(e),0)===meterTicks(bar.meter);
}

// Keep the source scale and all its pixels. Additional white space gives the
// model room around short stems/beams without resampling or erasing fine ink.
export function padStaffSystem(system){
  const pad=Math.max(1,Math.ceil(system.staff.spacing*2)),width=system.width+2*pad,height=system.height+2*pad;
  const rgba=new Uint8ClampedArray(width*height*4).fill(255),source=new Uint8ClampedArray(system.rgba);
  for(let y=0;y<system.height;y++)rgba.set(source.subarray(y*system.width*4,(y+1)*system.width*4),((y+pad)*width+pad)*4);
  return {rgba:rgba.buffer,width,height};
}

const samePitches=(a,b)=>a.events.length===b.events.length&&a.events.every((e,i)=>{
  const other=b.events[i];
  return !e.unread&&!other.unread&&e.rest===other.rest&&e.notes.length===other.notes.length&&e.notes.every((n,j)=>n.midi===other.notes[j].midi);
});

export function selectStaffRhythmRetry(original,candidate,context){
  // A different bar count, key, or pitch sequence is not independent evidence
  // for a rhythm repair. Never make a bar fit by deleting notes or scaling time.
  if(original.clef!==candidate.clef||original.measures.length!==candidate.measures.length)return original;
  const acceptedMeasures=[],tokens=String(original.raw).trim().split('+');
  original.measures.forEach((bar,i)=>{
    const next=candidate.measures[i];
    if(hasCompleteStaffRhythm(bar)||!hasCompleteStaffRhythm(next)||bar.key!==next.key||bar.meter.join('/')!==next.meter.join('/')||!samePitches(bar,next))return;
    bar.events.forEach((e,j)=>{tokens[e.index]=next.events[j].raw;});acceptedMeasures.push(i+1);
  });
  if(!acceptedMeasures.length)return original;
  return {...parseStaffTokens(tokens.join('+'),context),retry:{method:'white-padding',originalRaw:original.raw,candidateRaw:candidate.raw,acceptedMeasures}};
}

export async function recognizeStaffSystem(omr,system,context,{signal}={}){
  signal?.throwIfAborted();
  // The worker transfers its input. Retain only this system's original pixels
  // until we know whether one bounded retry is needed.
  const read=await omr.recognize({rgba:system.rgba.slice(0),width:system.width,height:system.height},{operation:'system'});
  signal?.throwIfAborted();
  const original=parseStaffTokens(read.text,context);
  if(!original.measures.some(bar=>!hasCompleteStaffRhythm(bar)))return refineStaffMeasures(omr,system,original,{signal});
  signal?.throwIfAborted();
  try{
    const retry=await omr.recognize(padStaffSystem(system),{operation:'rhythm'});
    signal?.throwIfAborted();
    const selected=selectStaffRhythmRetry(original,parseStaffTokens(retry.text,context),context);
    return await refineStaffMeasures(omr,system,selected,{signal});
  }catch(error){
    if(signal?.aborted||error.name==='AbortError')throw error;
    // Extra verification must not discard an already obtained first reading.
    return {...original,warnings:[...original.warnings,'rhythm-retry-failed']};
  }
}
