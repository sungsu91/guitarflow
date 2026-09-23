import ko from "../i18n/locales/ko.js";
import {setDrumVoiceDuration,isLowerDrum,drumVoiceRhythm} from './drumVoices.js';
import {newId} from './scoreModel.js';
import {enterMidiNotes} from './enterMidiNotes.js';
import {inputRhythm} from './rhythmInput.js';
import {nextEntry,setEventDuration} from './editorCommands.js';
import {ticksOf,patchEvent} from './scoreModel.js';
export function drumRest(document,cursor,rhythm){const e=document.measures[cursor.bar].events[cursor.event];if(e.notes.length&&!e.rest)throw Error(ko["etudes.thereIsAlreadyAHitHereSelectAndDeleteItBeforeEntering"]);return inputRhythm(document,cursor,rhythm,'rest');}
export function advanceDrum(document,cursor,rhythm){const e=document.measures[cursor.bar].events[cursor.event],changed=e.blank?drumRest(document,cursor,rhythm):{document,...rhythm};return {...changed,...nextEntry(changed.document,cursor)};}

export function advanceDrumWithHat(document,cursor,rhythm,midi){const next=advanceDrum(document,cursor,rhythm);if(!midi||next.document.measures[next.cursor.bar].events[next.cursor.event].notes.some(n=>[42,46].includes(n.midi)))return next;return {...next,...enterMidiNotes(next.document,next.cursor,[midi],{...rhythm,...next,session:next.completed?null:next.session})};}

// Explicit drum input applies the newly chosen duration, including occupied slots.
export function enterDrumNotes(document,cursor,pitches,rhythm){
 if(rhythm.tupletMode==='active')return enterMidiNotes(document,cursor,pitches,rhythm);
 let next=document;
 if(pitches.some(isLowerDrum)){const onset=document.measures[cursor.bar].events[cursor.event].onset;next={...document,measures:document.measures.map((bar,b)=>b===cursor.bar?{...bar,events:bar.events.map(e=>e.lowerRest&&e.onset<=onset&&onset<e.onset+ticksOf(drumVoiceRhythm(e,true))?{...e,lowerRest:false}:e)}:bar)};}
 for(const lower of [...new Set(pitches.map(isLowerDrum))]){
  const at=next.measures[cursor.bar].events[cursor.event];
  if(next.measures[cursor.bar].events.some(e=>e.onset<at.onset&&e.notes.some(n=>isLowerDrum(n.midi)===lower)&&e.onset+ticksOf(drumVoiceRhythm(e,lower))>at.onset))throw Error(ko["etudes.thePreviousNoteInThisDrumVoiceExtendsIntoThisPositionShorten"]);
  next=setDrumVoiceDuration(next,cursor,rhythm.selectedDuration,rhythm.dottedMode!=='off'&&Boolean(rhythm.dottedMode),lower);
 }
 next=patchEvent(next,cursor.bar,cursor.event,e=>({...e,rest:false,blank:false,notes:[...e.notes,...pitches.filter(midi=>!e.notes.some(n=>n.midi===midi)).map(midi=>({id:newId('tone'),midi,locked:false}))]}));
 return {document:next,...rhythm,dottedMode:rhythm.dottedMode==='one-shot'?'off':rhythm.dottedMode};
}
export function fillDrumMeasure(document,cursor,pitches,rhythm){
 const bar=document.measures[cursor.bar],start=bar.events[cursor.event].onset,end=bar.events.at(-1).onset+ticksOf(bar.events.at(-1));
 const replaced=new Set(pitches.flatMap(midi=>[42,46].includes(midi)?[42,46]:[midi]));
 let next={...document,measures:document.measures.map((m,b)=>b!==cursor.bar?m:{...m,events:m.events.map(e=>{if(e.onset<start)return e;const notes=e.notes.filter(n=>!replaced.has(n.midi));return {...e,notes,rest:!notes.length,blank:!notes.length};})})};
 let at=start,changed={document:next},state={...rhythm,session:null};
 while(at<end){const index=next.measures[cursor.bar].events.findIndex(e=>e.onset===at);if(index<0)throw Error(ko["etudes.theInputPositionDoesNotMatchTheExistingRhythm"]);changed=enterDrumNotes(next,{...cursor,event:index},pitches,state);next=changed.document;at+=ticksOf(drumVoiceRhythm(next.measures[cursor.bar].events[index],isLowerDrum(pitches[0])));state={...state,session:changed.completed?null:changed.session};}
 return {...changed,document:next,cursor:{...cursor,noteId:undefined},session:null,tupletMode:rhythm.tupletMode};
}

export function insertDrumLowerRest(document,cursor){
 const events=document.measures[cursor.bar].events,e=events[cursor.event],capacity=events.at(-1).onset+ticksOf(events.at(-1));
 const lower=events.filter(n=>n.notes.some(t=>[35,36,44].includes(t.midi)));
 if(lower.some(n=>n.onset<=e.onset&&n.onset+ticksOf(drumVoiceRhythm(n,true))>e.onset))throw Error(ko["etudes.thereIsAKickOrPedalHiHatHereDeleteItBefore"]);
 const limit=Math.min(e.onset+480,capacity,...lower.filter(n=>n.onset>e.onset).map(n=>n.onset),...events.filter(n=>n.lowerRest&&n.onset>e.onset).map(n=>n.onset));
 const duration=[4,8,16,32,64].find(d=>{const end=e.onset+1920/d;return end<=limit&&(end===capacity||events.some(n=>n.onset===end));});
 if(!duration)throw Error(ko["etudes.aRestCannotFitTheCurrentRhythmSelectANoteOnset"]);
 return patchEvent(document,cursor.bar,cursor.event,{lowerRest:true,lowerRestDuration:String(duration),blank:false});
}
