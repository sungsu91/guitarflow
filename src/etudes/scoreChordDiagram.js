import ko from "../i18n/locales/ko.js";
import {CHORD_TONE_INTERVALS} from '../chords/chordTheory.js';
import {effectiveTuning,maxFret} from './scoreTuning.js';
import {measureMeters,meterTicks} from './scoreMeters.js';

const NAMES=['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
// Use the same vocabulary as the chord fretboard, including extended chords.
const TYPES=Object.entries(CHORD_TONE_INTERVALS).flatMap(([family,types])=>Object.entries(types).map(([type,intervals])=>({
 suffix:type==='none'?({major:'',minor:'m',dim:'dim',aug:'aug'}[family]):family==='minor'&&type==='add9'?'madd9':type,
 intervals:[...new Set(intervals.map(n=>n%12))],
})));

// Frets are low to high; tuning is high to low. Inferred opens are suggestions only.
export function chordCandidateDetails(document,frets,{inferOpen=frets.map(f=>f===undefined)}={}){
 const tuning=effectiveTuning(document),pitch=(f,i)=>tuning[frets.length-1-i]+f;
 const actual=frets.flatMap((f,i)=>Number.isInteger(f)?[pitch(f,i)]:[]);
 if(new Set(actual.map(n=>n%12)).size<2)return [];
 const first=frets.findIndex(Number.isInteger);
 const inferred=frets.flatMap((f,i)=>Number.isInteger(f)?[pitch(f,i)]:f===undefined&&inferOpen[i]&&i>first?[pitch(0,i)]:[]);
 const found=[];
 for(const [pitches,assumed] of [[actual,false],[inferred,true]]){
  if(assumed&&pitches.length===actual.length)continue;
  const pcs=[...new Set(pitches.map(n=>n%12))],bass=Math.min(...pitches)%12;
  for(let root=0;root<12;root++)for(const {suffix,intervals} of TYPES){
   const expected=intervals.map(n=>(root+n)%12),matched=pcs.filter(n=>expected.includes(n)).length;
   const extra=pcs.length-matched,missing=expected.length-matched;
   if(matched<2||extra>2||missing>2||matched/pcs.length<.5)continue;
   // Exact sets win; wrong notes cost more than omitted tones. Prefer a root bass.
   const rank=extra*3+missing*2+(bass===root?0:.65)+(pcs.includes(root)?0:.8)+(assumed?.8:0)+expected.length*.01;
   const name=NAMES[root]+suffix+(bass===root||!expected.includes(bass)?'':`/${NAMES[bass]}`);
   found.push({name,rank,assumed,missing,extra,signature:`${root}:${[...expected].sort((a,b)=>a-b)}`});
  }
 }
 const seen=new Set();
 return found.sort((a,b)=>a.rank-b.rank).filter(c=>{if(seen.has(c.signature))return false;seen.add(c.signature);return true;}).slice(0,6);
}
export function chordNameCandidates(document,frets,options){return chordCandidateDetails(document,frets,options).map(c=>c.name);}

export function editableChordFrets(shape,count){
 return shape?shape.frets.map((f,i)=>shape.blankStrings?.includes(count-i)?undefined:f):Array(count).fill(undefined);
}

export function chordFretWindow(frets,maximum=24){
 const positive=frets.filter(f=>f>0);
 const start=positive.length?Math.max(1,Math.min(Math.min(...positive),maximum-4)):1;
 return {start,end:Math.min(maximum,Math.max(start+4,...positive))};
}

export function chordDiagramErrors(shape,count,capacity,maximum=24){
 if(!shape)return [];
 const errors=[];
 if(shape.ranges&&(!Array.isArray(shape.ranges)||!shape.ranges.length||shape.ranges.some((r,i)=>!r||!Number.isFinite(r.startTick)||!Number.isFinite(r.endTick)||r.startTick<0||r.endTick>capacity||r.startTick>=r.endTick||(i>0&&r.startTick<shape.ranges[i-1].endTick))))errors.push(ko["etudes.checkTheBeatAssignedToTheChordDiagram"]);
 if(shape.range&&(!Number.isFinite(shape.range.startTick)||!Number.isFinite(shape.range.endTick)||shape.range.startTick<0||shape.range.endTick>capacity||shape.range.startTick>=shape.range.endTick))errors.push(ko["etudes.checkTheChordDiagramSStartAndEndPositions"]);
 if(shape.fretWindow){const {start,end}=shape.fretWindow;if(!Number.isInteger(start)||!Number.isInteger(end)||start<1||end>maximum||start>end||shape.frets?.some(f=>f>0&&(f<start||f>end)))errors.push(ko["etudes.allFingeringsMustFitWithinTheChordDiagramSDisplayedFretRange"]);}
 if(shape.blankStrings&&(!Array.isArray(shape.blankStrings)||shape.blankStrings.some(s=>!Number.isInteger(s)||s<1||s>count||shape.frets[count-s]!==null)))errors.push(ko["etudes.checkTheChordDiagramSUnusedStringMarkings"]);
 return errors;
}

export function attachChordDiagram(document,bar,shape,{autoFill=false}={}){
 const capacity=meterTicks(measureMeters(document)[bar]);
 const errors=chordDiagramErrors(shape,document.tuning.length,capacity,maxFret(document)-(document.capo??0));
 if(shape&&(!shape.name.trim()||shape.name.length>40||shape.frets.length!==document.tuning.length||!shape.frets.some(f=>Number.isInteger(f))))errors.push(ko["etudes.enterAChordNameAndAtLeastOneFingering"]);
 if(errors.length)throw Error(errors[0]);
 let next={...document,measures:document.measures.map((m,i)=>i===bar?{...m,chord:shape?structuredClone(shape):null,harmony:null,chordNameMode:undefined}:m)};
 if(!shape||!autoFill)return next;
 const ranges=shape.ranges??[shape.range??{startTick:0,endTick:capacity}];
 const events=document.measures[bar].events;
 const duration=e=>1920/Number(e.duration)*(e.dotted?1.5:1)*(e.tuplet?e.tuplet.normalNotes/e.tuplet.actualNotes:1);
 if(ranges.some(({startTick,endTick})=>events.some(e=>(e.onset<startTick&&e.onset+duration(e)>startTick)||(e.onset<endTick&&e.onset+duration(e)>endTick))))throw Error(ko["etudes.alignTheSelectionWithNoteBoundariesToFillFingeringsAutomatically"]);
 const selected=new Set(events.filter(e=>ranges.some(({startTick,endTick})=>e.onset>=startTick&&e.onset<endTick)).map(e=>e.id));
 const ordered=document.measures.flatMap(m=>m.events),followers=new Map(ordered.map((e,i)=>[e.id,ordered[i+1]?.id]));
 next={...next,measures:next.measures.map(m=>({...m,events:m.events.map(e=>{
  if(!selected.has(e.id))return selected.has(e.tieTo)||selected.has(e.slurTo)||e.technique&&selected.has(followers.get(e.id))?{...e,tieTo:selected.has(e.tieTo)?null:e.tieTo,slurTo:selected.has(e.slurTo)?null:e.slurTo,technique:selected.has(followers.get(e.id))?null:e.technique}:e;
  const notes=shape.frets.flatMap((fret,i)=>Number.isInteger(fret)?[{id:`tone-${globalThis.crypto.randomUUID()}`,string:shape.frets.length-i,fret,midi:effectiveTuning(document)[shape.frets.length-1-i]+fret,locked:true,...(shape.fingers[i]?{finger:shape.fingers[i]}:{})}]:[]);
  return {...e,notes,rest:false,blank:false,technique:null,tieTo:null,slurTo:null,dead:false,vibrato:false,palmMute:false,arpeggio:null,letRing:false,slideOut:null,slideIn:null};
 })}))};
 return next;
}

