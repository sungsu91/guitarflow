import {normalizeInstrumentDocument} from './scoreInstruments.js';
import {isFretted,scoreInstrument} from './scoreInstruments.js';

export const HARMONICS={3:31,4:28,5:24,7:19,9:28,12:12,16:28,19:19,24:24};
// All existing instrument profiles support 0–24 in the editor. This is the
// editor's supported range, not a claim about every physical instrument.
export const maxFret=d=>scoreInstrument(d.instrument).maxFret??24;
export const effectiveTuning=d=>d.tuning.map(n=>n+(d.capo??0));
export const soundingMidi=(d,n)=>!isFretted(d.instrument)||n.unplaced?n.midi:d.tuning[n.string-1]+(d.capo??0)+(n.harmonic?(HARMONICS[n.fret]??n.fret):n.fret);
export const midiName=n=>['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'][((n%12)+12)%12]+(Math.floor(n/12)-1);
export function tuningPresets(instrument){const t=scoreInstrument(instrument).tuning;return [
 {id:'standard',label:'표준 튜닝',tuning:[...t]},
 {id:'half-down',label:'반음 다운',tuning:t.map(n=>n-1)},
 {id:'whole-down',label:'온음 다운',tuning:t.map(n=>n-2)},
 ...(instrument==='guitar'||!instrument?[{id:'drop-d',label:'Drop D',tuning:t.map((n,i)=>i===5?n-2:n)}]:[]),
 ];}
export const tuningName=d=>tuningPresets(d.instrument).find(p=>p.tuning.every((n,i)=>n===d.tuning[i]))?.label??'사용자 지정';
export const tuningCaption=d=>!isFretted(d.instrument)?'':[tuningName(d)!=='표준 튜닝'?`${tuningName(d)} (${[...d.tuning].reverse().map(midiName).join(' ')})`:'',d.capo?`카포 ${d.capo}`:''].filter(Boolean).join(' · ');
export function normalizePitches(d){d=normalizeInstrumentDocument(d);return {...d,capo:d.capo??0,autoTab:d.autoTab??{mode:'auto',min:0,max:12},measures:d.measures.map(m=>({...m,events:m.events.map(e=>({...e,notes:e.notes.map(n=>({...n,midi:soundingMidi(d,n),locked:n.locked!==false}))}))}))};}
export function tabCandidates(d,midi){return effectiveTuning(d).flatMap((open,i)=>{const fret=midi-open;return Number.isInteger(fret)&&fret>=0&&fret+(d.capo??0)<=maxFret(d)?[{string:i+1,fret}]:[];});}

// Bounded exhaustive chord assignment: distinct strings and a maximum five
// fret stopped-note span. Preference is soft; physical reach is a constraint.
export function assignTab(d,notes,neighbors=[]){
 const preference=d.autoTab??{mode:'auto',min:0,max:12};
 const context=neighbors.filter(n=>!n.unplaced&&Number.isFinite(n.fret));
 const choices=notes.map(n=>n.locked?(n.unplaced?[]:[{string:n.string,fret:n.fret}]):tabCandidates(d,n.midi));
 const order=notes.map((_,i)=>i).sort((a,b)=>choices[a].length-choices[b].length);
 let best=null,bestCost=Infinity,visits=0;const chosen=[],used=new Set();
 function search(at,cost){if(++visits>60000||cost>=bestCost)return;if(at===order.length){best=[...chosen];bestCost=cost;return;}
  const i=order[at],n=notes[i];for(const c of choices[i]){if(used.has(c.string))continue;
   const stopped=[...chosen.filter(Boolean),c].filter(p=>p.fret>0).map(p=>p.fret);if(stopped.length&&(Math.max(...stopped)-Math.min(...stopped)>5||new Set(stopped).size>4))continue;
   const outside=preference.mode==='range'&&(c.fret<preference.min||c.fret>preference.max);
   const movement=context.length?context.reduce((s,p)=>s+Math.abs(p.fret-c.fret)+Math.abs(p.string-c.string)*.35,0)/context.length:c.fret*.2;
   used.add(c.string);chosen[i]={...n,...c,unplaced:false,outsidePreferred:Boolean(outside)};search(at+1,cost+movement+(outside?1000:0));used.delete(c.string);chosen[i]=undefined;
  }
 }
 search(0,0);
 return best??notes.map(n=>n.locked&&!n.unplaced?n:{...n,string:null,fret:null,unplaced:true,outsidePreferred:false});
}
export function changeTuning(d,settings,mode='pitch',{reassignLocked=false}={}){
 if(!isFretted(d.instrument))throw Error('건반·드럼에는 튜닝과 카포를 적용하지 않습니다.');
 const next={...d,...settings};
 if(!Number.isInteger(next.capo??0)||(next.capo??0)<0||(next.capo??0)>Math.min(12,maxFret(next)))throw Error('카포는 0–12프렛을 선택하세요.');
 if(next.tuning.length!==scoreInstrument(next.instrument).tuning.length||next.tuning.some(n=>!Number.isInteger(n)||n<24||n>88))throw Error('개방현은 C1–E6 범위에서 옥타브까지 선택하세요.');
 const conflicts=[];let previous=[];
 next.measures=d.measures.map((m,b)=>({...m,events:m.events.map((e,i)=>{
  const lockedIds=new Set(e.notes.filter(n=>n.locked!==false).map(n=>n.id));
  let notes=e.notes.map(n=>({...n,midi:soundingMidi(d,n)}));
  if(mode==='fingering')notes=notes.map(n=>{if(n.unplaced)return n;if(n.fret+(next.capo??0)>maxFret(next))throw Error(`${b+1}마디 ${i+1}음: 실제 프렛이 ${maxFret(next)}를 넘습니다.`);return {...n,midi:soundingMidi(next,n)};});
  else {notes=notes.map(n=>{if(n.unplaced){const prior=n.previousFingering;if(n.locked&&prior&&soundingMidi(next,{...n,...prior,unplaced:false})===n.midi&&prior.fret+(next.capo??0)<=maxFret(next))return {...n,...prior,unplaced:false};if(reassignLocked){conflicts.push(`${b+1}마디 ${i+1}음 · ${midiName(n.midi)}`);return {...n,locked:false,harmonic:false};}return n;}if(soundingMidi(next,n)===n.midi&&n.fret+(next.capo??0)<=maxFret(next))return n;
    if(n.locked!==false){conflicts.push(`${b+1}마디 ${i+1}음 ${n.string}번줄`);if(reassignLocked)return {...n,locked:false,harmonic:false,previousFingering:{string:n.string,fret:n.fret}};return {...n,unplaced:true,previousFingering:{string:n.string,fret:n.fret},string:null,fret:null,locked:true};}
    return {...n,harmonic:false,locked:false};});
   const movable=notes.filter(n=>!n.unplaced||!n.locked),assigned=assignTab(next,movable,previous);let at=0;notes=notes.map(n=>n.unplaced&&n.locked?n:assigned[at++]);
  }
  if(reassignLocked)notes=notes.map(n=>lockedIds.has(n.id)?{...n,locked:true}:n);
  previous=notes;return {...e,notes};
 })}));
 return {document:normalizePitches(next),conflicts,unplaced:next.measures.flatMap(m=>m.events.flatMap(e=>e.notes)).filter(n=>n.unplaced).length};
}
