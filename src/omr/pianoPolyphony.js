import {parseStaffTokens} from './staffTokens.js';
import {ticksOf} from '../etudes/scoreModel.js';
import {meterTicks} from '../etudes/scoreMeters.js';

const lengths=['1','2','4','8','16','32'].flatMap(duration=>[{duration,dotted:true},{duration,dotted:false}]).sort((a,b)=>ticksOf(b)-ticksOf(a));
// A simultaneous token can contain a whole-note inner voice and a half-note
// melody. Normalize to tied slices, preserving each pitch's attack and release.
// The generic staff parser remains strict; this path is Grand Staff only.
export function parsePianoTokens(raw,context){
 const parsed=parseStaffTokens(raw,{...context,polyphonic:true});
 return {...parsed,measures:parsed.measures.map(bar=>{
  if(!bar.events.some(e=>e.notes.some(n=>ticksOf(n.writtenRhythm)!==ticksOf(e))))return {...bar,events:bar.events.map(e=>({...e,notes:e.notes.map(({writtenRhythm,...n})=>n)}))};
  const attacks=[];let at=0;
  for(const e of bar.events){
   if(e.unread||!e.duration)return bar;
   for(const n of e.notes)attacks.push({start:at,end:at+ticksOf(n.writtenRhythm),note:n,index:e.index});
   at+=ticksOf(e);
  }
  const capacity=meterTicks(bar.meter);
  if(at!==capacity||attacks.some(n=>n.end>capacity)||attacks.some((n,i)=>attacks.slice(i+1).some(p=>p.note.midi===n.note.midi&&p.start<n.end&&n.start<p.end)))return {...bar,events:[{index:bar.events[0]?.index,raw,notes:[],rest:false,unread:true,duration:null}]};
  const times=[...new Set([0,capacity,...attacks.flatMap(n=>[n.start,n.end]),...bar.events.map((e,i)=>bar.events.slice(0,i).reduce((n,e)=>n+ticksOf(e),0))])].sort((a,b)=>a-b),events=[];
  for(let i=0;i<times.length-1;i++){
   let start=times[i];const end=times[i+1];
   while(start<end){
    const rhythm=lengths.find(r=>ticksOf(r)<=end-start);if(!rhythm)return {...bar,events:[{notes:[],rest:false,unread:true,duration:null}]};
    const active=attacks.filter(n=>n.start<=start&&n.end>start),notes=active.map(({note:{writtenRhythm,...n}})=>n);
    events.push({index:active[0]?.index??bar.events[0].index,raw:'piano-voice-slice',...rhythm,onset:start,notes,rest:!notes.length,pianoTiePitchesFromPrevious:active.filter(n=>n.start<start).map(n=>n.note.midi)});
    start+=ticksOf(rhythm);
   }
  }
  return {...bar,events,pianoPolyphony:true};
 })};
}
