import ko from "../i18n/locales/ko.js";
import {isFretted,validateInstrumentMidi} from './scoreInstruments.js';
import {inputRhythm} from './rhythmInput.js';
import {newId,patchEvent} from './scoreModel.js';
import {assignTab,soundingMidi} from './scoreTuning.js';

export function enterMidiNotes(document,cursor,pitches,rhythm){
 if(!pitches.length||pitches.some(n=>!Number.isInteger(n)||n<0||n>127))throw Error(ko["etudes.checkTheMidiPitch"]);
 pitches.forEach(midi=>validateInstrumentMidi(document.instrument,midi));
 const original=document.measures[cursor.bar]?.events[cursor.event];if(!original)throw Error(ko["etudes.selectAScoreInputPosition"]);
 // Reuse the same duration, dotted, triplet and capacity rules as numeric TAB.
 const changed=inputRhythm(document,cursor,rhythm,isFretted(document.instrument)?'note':'pitch',0);
 const old=original.rest?[]:original.notes.map(n=>({...n,midi:soundingMidi(document,n)}));
 const incoming=[...new Set(pitches)].filter(midi=>!old.some(n=>n.midi===midi)).map(midi=>({id:newId('tone'),midi,locked:false}));
 const events=document.measures.flatMap(m=>m.events),index=events.findIndex(e=>e.id===original.id);
 const neighbors=[...(events[index-1]?.notes??[]),...(events[index+1]?.notes??[])];
 const notes=isFretted(document.instrument)?assignTab(document,[...old,...incoming],neighbors):[...old,...incoming].map(({hand,...tone})=>({...tone,...(document.instrument==='drums'?{}:{hand:hand??(tone.midi<60?'left':'right')})}));
 changed.document=patchEvent(changed.document,cursor.bar,cursor.event,e=>({...e,notes,rest:false,blank:false,dead:false}));
 return changed;
}
