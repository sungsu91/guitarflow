import {t} from '../i18n/core.js';
import {OPEN_CHORD_SHAPES} from './openChordStudies.js';
import {chordProgression} from './arpeggioChords.js';
import {blankEvent,newId} from './scoreModel.js';
import {measureMeters,meterTicks} from './scoreMeters.js';
import {effectiveTuning,maxFret} from './scoreTuning.js';

export const ARPEGGIO_PATTERNS=[
 {id:'bass-313',label:'editor.arpBass313',steps:['bass',3,1,3],duration:'8'},
 {id:'bass-323',label:'editor.arpBass323',steps:['bass',3,2,3],duration:'8'},
 {id:'bass-321',label:'editor.arpBass321',steps:['bass',3,2,1],duration:'8'},
 {id:'bass-3212313',label:'editor.arpBass3212313',steps:['bass',3,2,1,2,3,1,3],duration:'8'},
 {id:'bass-32123',label:'editor.arpBass32123',steps:['bass',3,2,1,2,3],duration:'8'},
 {id:'bass-pinch',label:'editor.arpBassPinch',steps:['bass',[1,2,3],'bass',[1,2,3]],duration:'4'},
 {id:'bass-slap',label:'editor.arpBassSlap',steps:['bass',[1,2,3],'slap',[1,2,3]],duration:'8'},
];
export const arpeggioSupported=d=>(d.instrument??'guitar')==='guitar'&&d.tuning.length===6;
export const arpeggioPresets=d=>arpeggioSupported(d)&&d.tuning.join(',')==='64,59,55,50,45,40'&&!d.capo?Object.keys(OPEN_CHORD_SHAPES):[];
export const arpeggioSequence=p=>p.steps.map(s=>s.dead?t('editor.arpSlap'):s.strings.length===1?String(s.strings[0]):`(${s.strings.join('+')})`).join(' → ');
export function arpeggioBarChord(d,bar){return chordProgression(d)[bar]?.[0]?.shape??null;}
export function arpeggioFitsMeter(pattern,meter){
 const spec=ARPEGGIO_PATTERNS.find(p=>p.id===pattern);
 return Boolean(spec&&Number.isInteger(meterTicks(meter)/(1920/Number(spec.duration)*spec.steps.length)));
}

// Preview and commit share the same validated plan. No IDs or score edits during preview.
export function planArpeggio(d,{start=0,end=start,pattern='bass-313'}={}){
 if(!arpeggioSupported(d))throw Error(t('editor.arpGuitarOnly'));
 if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||end<start||end>=d.measures.length)throw Error(t('editor.arpInvalidRange'));
 const spec=ARPEGGIO_PATTERNS.find(p=>p.id===pattern);
 if(!spec)throw Error(t('editor.arpInvalidPattern'));
 const duration=spec.duration,tuning=effectiveTuning(d),meters=measureMeters(d),step=1920/Number(duration),progression=chordProgression(d);
 return d.measures.slice(start,end+1).map((measure,i)=>{
  const bar=start+i,capacity=meterTicks(meters[bar]),changes=progression[bar];
  if(changes[0]?.onset!==0||changes.some(c=>!c.shape))throw Error(t('editor.arpMissingChord',{value1:bar+1}));
  if(changes.some((c,i)=>c.needsReview||!Number.isFinite(c.onset)||c.onset<0||c.onset>=capacity||c.onset%step||i>0&&c.onset<=changes[i-1].onset))throw Error(t('editor.arpChordPositionReview',{value1:bar+1}));
  const count=capacity/step;
  if(!Number.isInteger(count)||count<1||count>64||count%spec.steps.length!==0)throw Error(t('editor.arpMeterMismatch',{value1:bar+1}));
  const grips=changes.map(change=>{
   const shape=change.shape;
   if(shape.silent)return {...change,steps:spec.steps.map(()=>({strings:[],silent:true}))};
   if(shape.frets?.length!==6||!Array.isArray(shape.fingers)||shape.fingers.length!==6||shape.frets.some(f=>f!==null&&(!Number.isInteger(f)||f<0||f+(d.capo??0)>maxFret(d))))throw Error(t('editor.arpInvalidChord',{value1:bar+1}));
   const playable=string=>!shape.blankStrings?.includes(string)&&Number.isInteger(shape.frets[6-string]);
   const bass=[6,5,4].filter(playable).sort((a,b)=>(tuning[a-1]+shape.frets[6-a])-(tuning[b-1]+shape.frets[6-b]))[0];
   const required=spec.steps.flatMap(s=>s==='bass'||s==='slap'?[]:s);
   if(!bass||required.some(s=>!playable(s)))throw Error(t('editor.arpMissingStrings',{value1:bar+1}));
   return {...change,steps:spec.steps.map(s=>({strings:s==='bass'?[bass]:s==='slap'?[1,2,3]:Array.isArray(s)?s:[s],dead:s==='slap'}))};
  });
  const cells=Array.from({length:count},(_,i)=>{
   const grip=grips.filter(c=>c.onset<=i*step).at(-1);
   return {...grip.steps[i%spec.steps.length],shape:grip.shape,onset:i*step};
  });
  return {bar,capacity,count,duration,step,shape:grips[0].shape,steps:grips[0].steps,changes,cells,repeats:count/spec.steps.length};
 });
}

export function applyArpeggio(d,options){
 const plans=planArpeggio(d,options),byBar=new Map(plans.map(p=>[p.bar,p]));
 const removed=new Set(plans.flatMap(p=>d.measures[p.bar].events.map(e=>e.id)));
 const ordered=d.measures.flatMap(m=>m.events),followers=new Map(ordered.map((e,i)=>[e.id,ordered[i+1]?.id]));
 const tuning=effectiveTuning(d);
 const measures=d.measures.map((m,bar)=>{
  const p=byBar.get(bar);
  if(!p){
   const events=m.events.map(e=>{
    const tie=removed.has(e.tieTo),slur=removed.has(e.slurTo),technique=e.technique&&removed.has(followers.get(e.id));
    return tie||slur||technique?{...e,...(tie?{tieTo:null}:{}),...(slur?{slurTo:null}:{}),...(technique?{technique:null}:{})}:e;
   });
   return events.every((e,i)=>e===m.events[i])?m:{...m,events};
  }
  const events=p.cells.map(cell=>{
   const notes=cell.strings.map(string=>{
    const fret=cell.dead?0:cell.shape.frets[6-string],finger=cell.dead?null:cell.shape.fingers[6-string];
    return {id:newId('tone'),string,fret,midi:tuning[string-1]+fret,locked:true,...(cell.dead?{dead:true}:{rightFinger:({1:'a',2:'m',3:'i'})[string]??'p'}),...(finger?{finger}:{})};
   });
   return {...blankEvent(cell.onset,p.duration),rest:Boolean(cell.silent),blank:false,...(cell.dead?{dead:true}:{}),notes};
  });
  // Keep printed chord names and changes; no generated fretboard diagrams.
  return {...m,events,...(m.pdfImport?{pdfImport:{...m.pdfImport,needsReview:false,rhythmVerified:true,reasons:[],generatedBy:'arpeggio-pattern'}}:{})};
 });
 return {...d,measures};
}
