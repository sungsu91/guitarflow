import {beatTicks} from './meter.js';
import {clone,createPattern,repairTies,validPattern} from './model.js';
import {CURRICULUM} from './packCurriculum.js';

export const PACK_FAMILIES=[['basic','기본 박·8분','Pulse & eighths'],['sixteenth','16분 조합','Sixteenths'],['rests','쉼표·엇박','Rests & offbeats'],['dotted','점음표','Dotted rhythms'],['ties','이음줄','Ties'],['triplet','3잇단','Triplets'],['quintuplet','5잇단','Quintuplets'],['sextuplet','6잇단','Sextuplets'],['septuplet','7잇단','Septuplets'],['mixed','혼합 리듬','Mixed rhythms']];
export const LEVELS=[['easy','초급','Beginner'],['medium','중급','Intermediate'],['hard','고급','Advanced']];

const cell=(...values)=>values.map(v=>({ticks:Math.abs(v),rest:v<0}));
export const PACK_STEPS=[['foundation','1단계 · 기본','Step 1 · Foundation'],['combination','2단계 · 기본 조합','Step 2 · Basic combinations'],['application','3단계 · 응용','Step 3 · Application']];
export const BUILTIN_CURRICULUM_VERSION=2;
export function resizeFoundation(pattern,length) {
 const count=Math.max(1,Math.min(16,Math.round(length)));
 const row=Array.from({length:pattern.meter},(_,i)=>clone(pattern.core[i%pattern.core.length]));
 return repairTies({...pattern,measures:Array.from({length:count},()=>clone(row)),stages:Array(count).fill('foundation'),measureRepeats:Array(count).fill(false)});
}
export function builtinPacks(language='ko') {
 return PACK_FAMILIES.flatMap(([family])=>LEVELS.flatMap(([level,ko,en])=>
  CURRICULUM.filter(entry=>entry.family===family&&entry.level===level).map(entry=>{
   const rows=clone(entry.measures);
   const p={...createPattern(),id:`pack-${entry.id}`,source:'builtin',curriculumVersion:BUILTIN_CURRICULUM_VERSION,
    title:language==='ko'?`${ko} ${entry.order} · ${entry.ko}`:`${en} ${entry.order} · ${entry.en}`,
    family,difficulty:level,levelOrder:entry.order,learningStep:entry.step,bpm:entry.bpm,
    objective:language==='ko'?entry.goalKo:entry.goalEn,core:clone(entry.core),measures:rows,
    stages:rows.map(()=>entry.step),reference:entry.reference};
   const result=repairTies(p);
   // Reject broken ties in authored data instead of silently dropping them.
   if(JSON.stringify(result.measures)!==JSON.stringify(rows)||!validPattern(result))throw Error(`Invalid built-in pack: ${entry.id}`);
   return result;
  })
 ));
}
// Only stale built-in drafts are refreshed. User copies retain their saved content.
export function currentBuiltinDraft(draft,packs) {
 if(!draft||draft.source!=='builtin'||draft.curriculumVersion===BUILTIN_CURRICULUM_VERSION)return draft;
 return clone(packs.find(p=>p.id===draft.id)||packs.find(p=>p.family===draft.family&&p.difficulty==='easy')||packs[0]);
}
export function copyPack(pattern) {
  const copied={...clone(pattern),id:crypto.randomUUID(),source:'user',copiedFrom:pattern.id};
  delete copied.reference;return copied;
}
export function blankPack(meter=4) {
  return {...createPattern(meter),source:'user',core:[cell(-beatTicks(meter))],difficulty:'medium',family:'mixed'};
}
export const STAGES={application:['핵심 리듬 연결하기','Link the core rhythms'],foundation:['같은 리듬 반복 익히기','Repeat the core rhythm'],combination:['기본 음가와 연결하기','Connect with basic notes'],introduce:['패턴 익히기','Learn the core'],repeat:['간격을 두고 반복','Spaced repetition'],position:['위치 바꾸기','Move the pattern'],context:['주변 리듬 바꾸기','Change the context'],rests:['쉼표로 변형','Rest variation'],'cross-bar':['마디를 가로지르는 이음줄','Tie across the barline']};
