import { formatMessage } from "../i18n/format.js";
import ko from "../i18n/locales/ko.js";
import {effectiveTuning,soundingMidi} from './scoreTuning.js';
import {SCORE_INSTRUMENTS,canonicalInstrument,normalizeInstrumentDocument,scoreInstrument,isFretted,validateInstrumentMidi} from './scoreInstruments.js';
import {NATURAL_HARMONICS,fingeringCandidates} from './scoreModel.js';

// Assign simultaneous pitches to distinct strings. A greedy assignment can
// reject a playable chord, especially with re-entrant high-G ukulele tuning.
function assign(notes,source,target,where) {
  const options=notes.map(note=>{
    const midi=note.midi??source[note.string-1]+(note.harmonic?NATURAL_HARMONICS[note.fret]:note.fret);
    const candidates=note.dead?target.map((_,i)=>({string:i+1,fret:note.fret})):
      note.harmonic?target.flatMap((open,i)=>Object.entries(NATURAL_HARMONICS).filter(([,interval])=>open+interval===midi).map(([fret])=>({string:i+1,fret:Number(fret)}))):fingeringCandidates(midi,target);
    return candidates.sort((a,b)=>(a.string===note.string?0:1)-(b.string===note.string?0:1)||a.fret-b.fret);
  });
  const order=notes.map((_,i)=>i).sort((a,b)=>options[a].length-options[b].length),result=[],used=new Set();
  function visit(at){if(at===order.length)return true;const i=order[at];for(const choice of options[i]){if(used.has(choice.string))continue;used.add(choice.string);result[i]={...notes[i],...choice,unplaced:false,locked:true};if(visit(at+1))return true;used.delete(choice.string);}return false;}
  if(!visit(0)){
    const pitches=notes.filter(n=>!n.dead).map(n=>source[n.string-1]+(n.harmonic?NATURAL_HARMONICS[n.fret]:n.fret));
    const reason=pitches.some(midi=>midi<Math.min(...target))
      ?ko["etudes.someNotesFallBelowTheNewInstrumentSRangeAndCannotBe"]
      :pitches.some(midi=>midi>Math.max(...target)+24)&&!notes.some(n=>n.harmonic)
        ?ko["etudes.someNotesExceedTheNewInstrumentSSupportedRangeAndCannotBe"]
        :ko["etudes.theNewInstrumentSStringsAndFingeringsCannotPreserveTheExistingSimultaneous"];
    throw Error(`${where}: ${reason}`);
  }
  return result;
}

export function convertScoreInstrument(document,id){
  document=normalizeInstrumentDocument(document);id=canonicalInstrument(id);
  if(!Object.hasOwn(SCORE_INSTRUMENTS,id))throw Error(ko["etudes.thisInstrumentIsNotSupported"]);
  if((document.instrument??'guitar')===id)return document;
  if(document.instrument==='piano'&&document.measures.some(m=>m.events.some(e=>e.voice))){
   const active=['right','left'].filter(hand=>document.measures.some(m=>m.events.some(e=>e.voice===hand&&!e.blank)));
   if(active.length>1)throw Error(ko["etudes.independentRhythmsForTwoHandsCannotBeConvertedAutomaticallyToASingle"]);
   const hand=active[0]??'right';document={...document,measures:document.measures.map(m=>({...m,events:m.events.filter(e=>e.voice===hand).map(({voice,...e})=>e)}))};
  }
  const hasNotes=document.measures.some(m=>m.events.some(e=>e.notes.length));
  if(hasNotes&&(id==='drums'||document.instrument==='drums'))throw Error(ko["etudes.pitchedScoresAndDrumRhythmsCannotBeConvertedAutomaticallyStartANew"]);
  const target=scoreInstrument(id).tuning,next=structuredClone(document),source=effectiveTuning(document);
  next.instrument=id;next.tuning=[...target];next.capo=0;
  next.viewSettings={...next.viewSettings,notationView:isFretted(id)?(isFretted(document.instrument)?next.viewSettings?.notationView??'tab':'both'):'staff'};
  if(!isFretted(id)){
   if(document.measures.some(m=>m.events.some(e=>e.letRing||e.slideOut||e.slideIn||e.notes.some(n=>n.bendEffect||n.parenthesized))))throw Error(ko["etudes.openTiesSlideOutsBendsAndParenthesesAreForStringInstrumentsOnly"]);
   next.measures.forEach(bar=>{if(bar.chord)bar.harmony=bar.chord.name;bar.chord=null;bar.events.forEach(e=>{e.notes=e.notes.map(n=>{const midi=soundingMidi(document,n);validateInstrumentMidi(id,midi);if(n.dead||e.dead)throw Error(ko["etudes.mutedNotesCannotBeConvertedToPitches"]);return {id:n.id,midi,...(id==='drums'?{}:{hand:n.hand??(midi<60?'left':'right')})};});Object.assign(e,{technique:null,pickStroke:null,palmMute:false,vibrato:false,arpeggio:null});});});return next;
  }
  next.measures.forEach((bar,b)=>{
    bar.events.forEach((event,i)=>{event.notes=assign(event.notes.map(n=>({...n,midi:soundingMidi(document,n),dead:n.dead??event.dead})),source,target,formatMessage(ko["etudes.barValueNoteValue"], { value1: b+1, value2: i+1 }));});
    if(bar.chord){
      const notes=bar.chord.frets.flatMap((fret,i)=>fret===null?[]:[{string:source.length-i,fret}]);
      const converted=assign(notes,source,target,formatMessage(ko["etudes.barValueChordDiagram"], { value1: b+1 }));
      // Finger numbers and barre marks describe the old grip, not its pitches.
      bar.chord={...bar.chord,frets:target.map(()=>null),fingers:target.map(()=>null),barre:null};
      converted.forEach(n=>{bar.chord.frets[target.length-n.string]=n.fret;});
      delete bar.chord.fretWindow;delete bar.chord.blankStrings;
    }
  });
  const events=next.measures.flatMap((m,b)=>m.events.map(e=>({event:e,bar:b+1})));
  events.forEach(({event:e,bar},i)=>{
    const after=events[i+1]?.event;
    if(e.technique&&after){const a=e.notes[0],b=after.notes[0];if(!a||!b||a.string!==b.string||a.fret===b.fret||(e.technique==='H'&&a.fret>b.fret)||(e.technique==='P'&&a.fret<b.fret))throw Error(formatMessage(ko["etudes.barValueCheckTheFingeringNeededToPreserveExistingConnectedTechniquesThe"], { value1: bar }));}
    if(e.tieTo&&after?.id===e.tieTo&&JSON.stringify(e.notes.map(n=>[n.string,n.fret]).sort())!==JSON.stringify(after.notes.map(n=>[n.string,n.fret]).sort()))throw Error(formatMessage(ko["etudes.barValueTheTiedFingeringCannotBePreservedTheScoreHasNot"], { value1: bar }));
  });
  return next;
}
