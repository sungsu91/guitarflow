import ko from "../i18n/locales/ko.js";
import {patchEvent} from './scoreModel.js';

export const DRUM_TECHNIQUES=[
 ['accent',ko["etudes.accent"]],['ghost',ko["etudes.ghostNoteNote"]],['flam',ko["etudes.flam"]],['drag',ko["etudes.drag"]],
 ['roll-1',ko["etudes.rollOneSlash"]],['roll-2',ko["etudes.rollTwoSlashes"]],['roll-3',ko["etudes.rollThreeSlashes"]],['buzz',ko["etudes.buzzRoll"]],['clear',ko["etudes.clearTechnique"]],
].map(([value,label])=>({value,label}));

// A selected tone ID is mandatory, even when the slot contains only one hit.
export function setDrumTechnique(document,cursor,value){
 const event=document.measures[cursor.bar]?.events[cursor.event];
 if(document.instrument!=='drums'||event?.rest||!event?.notes.some(n=>n.id===cursor.noteId))return document;
 if(!DRUM_TECHNIQUES.some(t=>t.value===value))return document;
 return patchEvent(document,cursor.bar,cursor.event,e=>({...e,notes:e.notes.map(n=>{
  if(n.id!==cursor.noteId)return n;
  const next={...n},technique={...n.drumTechnique};
  if(value==='clear'){delete next.drumTechnique;return next;}
  const key=['accent','ghost'].includes(value)?'dynamic':'ornament';
  if(technique[key]===value)delete technique[key];else technique[key]=value;
  if(Object.keys(technique).length)next.drumTechnique=technique;else delete next.drumTechnique;
  return next;
 })}));
}

// Offsets are seconds relative to the written attack. Never modify score ticks.
export function drumStrokes(phrase){
 const {dynamic,ornament}=phrase.drumTechnique??{};
 const gain=dynamic==='accent'?1.4:dynamic==='ghost'?.35:1;
 const main={offset:0,gain};
 if(ornament==='flam')return [{offset:-.028,gain:gain*.42},main];
 if(ornament==='drag')return [{offset:-.046,gain:gain*.32},{offset:-.023,gain:gain*.42},main];
 const duration=Math.max(0,phrase.duration??0);
 if(ornament==='buzz')return Array.from({length:Math.max(1,Math.ceil(duration/.018))},(_,i)=>({offset:i*.018,gain:gain*(i%4===0?.7:.42)*(.92**(i%4))}));
 if(/^roll-[123]$/.test(ornament??'')){
  const interval=(phrase.beatSeconds??.5)/(Math.max(1,(Number(phrase.writtenDuration)||4)/4)*2**Number(ornament.at(-1)));
  return Array.from({length:Math.max(1,Math.ceil((duration-1e-8)/interval))},(_,i)=>({offset:i*interval,gain}));
 }
 return [main];
}
