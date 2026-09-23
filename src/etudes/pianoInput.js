import ko from "../i18n/locales/ko.js";
import {blankEvent,blankMeasure,newId,patchEvent,ticksOf} from './scoreModel.js';
import {measureMeters} from './scoreMeters.js';
import {inputRhythm} from './rhythmInput.js';
import {enterMidiNotes} from './enterMidiNotes.js';
import {nextEntry,cursorStep} from './editorCommands.js';

export const isPiano=d=>['piano','keyboard'].includes(d.instrument);
const hands=['right','left'];
export const sortPianoEvents=events=>events.sort((a,b)=>a.onset-b.onset||hands.indexOf(a.voice)-hands.indexOf(b.voice));
// Keep the existing event format and onset clock, adding an independent voice.
// Legacy mixed chords split without changing pitches, hands, duration or ties.
export function ensurePianoVoices(d){
 if(!isPiano(d)||d.measures.every(m=>m.events.every(e=>hands.includes(e.voice))))return d;
 const ids=new Map();
 for(const m of d.measures)for(const e of m.events)if(!e.voice)ids.set(e.id,{right:e.id,left:newId('event')});
 return {...d,measures:d.measures.map(m=>({...m,events:sortPianoEvents(m.events.flatMap(e=>{
  if(e.voice)return [e];
  return hands.map(voice=>{const notes=e.notes.filter(n=>(n.hand??(n.midi<60?'left':'right'))===voice).map(n=>({...n,hand:voice}));
   return {...e,id:ids.get(e.id)[voice],voice,notes,rest:!notes.length,blank:notes.length?false:e.rest?e.blank:true,
    ...(e.tieTo?{tieTo:notes.length?(ids.get(e.tieTo)?.[voice]??e.tieTo):null}:{}),
    ...(e.tuplet?{tuplet:{...e.tuplet,groupId:`${e.tuplet.groupId}:${voice}`}}:{})};});
 }))}))};
}
export function pianoCursor(d,position={bar:0,onset:0},hand='right'){
 const bar=Math.max(0,Math.min(position.bar,d.measures.length-1)),events=d.measures[bar].events;
 let event=events.findIndex(e=>e.voice===hand&&e.id===position.id);
 if(event<0)event=events.findIndex(e=>e.voice===hand&&e.onset===(position.onset??0));
 if(event<0)event=events.findIndex(e=>e.voice===hand&&e.onset<=(position.onset??0)&&e.onset+ticksOf(e)>(position.onset??0));
 if(event<0)event=events.findIndex(e=>e.voice===hand);
 return {bar,event:Math.max(0,event),hand,mode:'staff',string:1};
}
export const pianoPosition=(d,c)=>({bar:c.bar,id:d.measures[c.bar]?.events[c.event]?.id,onset:d.measures[c.bar]?.events[c.event]?.onset??0});
export function pianoVoiceEdit(document,cursor,operation){
 const d=ensurePianoVoices(document),selected=d.measures[cursor.bar].events[cursor.event],hand=cursor.hand??selected.voice??'right';
 const projected={...d,meter:measureMeters(d)[cursor.bar],measures:d.measures.map(m=>({...m,events:m.events.filter(e=>e.voice===hand)}))};
 const at={...cursor,event:projected.measures[cursor.bar].events.findIndex(e=>e.id===selected.id)};
 if(at.event<0)throw Error(ko["etudes.selectTheStaffForTheHandYouWantToEnter"]);
 const result=operation(projected,at),changed=result.document??result;
 const merged={...changed,meter:d.meter,measures:changed.measures.map((m,b)=>({...m,events:sortPianoEvents([
  ...(d.measures[b]?.events.filter(e=>e.voice!==hand)??blankMeasure(measureMeters(changed)[b]).events.map(e=>({...e,voice:hand==='right'?'left':'right'}))),
  ...m.events.map(e=>({...e,voice:hand,notes:e.notes.map(n=>({...n,hand}))})),
 ])}))};
 const local=result.cursor??at,target=changed.measures[local.bar].events[local.event];
 return {...result,document:merged,cursor:{...local,hand,mode:'staff',noteId:cursor.noteId,event:merged.measures[local.bar].events.findIndex(e=>e.id===target.id)}};
}
export function enterPiano(document,cursor,pitches,rhythm,{chord=false,rest=false,advance=true,editing=false}={}){
 return pianoVoiceEdit(document,cursor,(d,c)=>{
  const original=d.measures[c.bar].events[c.event];
  if(!original.blank&&!editing&&!chord)throw Error(ko["etudes.thisPositionAlreadyContainsMusicSelectTheNoteInTheScoreTo"]);
  // Explicit edits replace one selected tone; chord entry only adds distinct pitches.
  let base=d;
  if(!rest&&!chord&&!original.blank){const kept=cursor.noteId?original.notes.filter(n=>n.id!==cursor.noteId):[];base=patchEvent(d,c.bar,c.event,{notes:kept,rest:!kept.length});}
  const changed=rest?inputRhythm(base,c,rhythm,'rest'):enterMidiNotes(base,c,pitches,rhythm);
  const entered=changed.document.measures[c.bar].events[c.event];
  const next=advance?nextEntry(changed.document,c):{document:changed.document,cursor:c};
  return {...changed,...next,enteredId:entered.id};
 });
}
export function stepPiano(d,c,delta=1){return pianoVoiceEdit(d,c,(voice,at)=>delta>0?nextEntry(voice,at):{document:voice,cursor:cursorStep(voice,at,-1)});}

// Explicit score-note editing; switching the input-hand button never calls this.
export function movePianoHand(document,cursor,hand){
 const d=ensurePianoVoices(document),m=d.measures[cursor.bar],source=m.events[cursor.event],tone=source.notes.find(n=>n.id===cursor.noteId);
 if(!tone)throw Error(ko["etudes.selectTheNoteToMoveInTheScore"]);
 if(source.voice===hand)return {document:d,cursor};
 if(source.tieTo||d.measures.some(m=>m.events.some(e=>e.tieTo===source.id)))throw Error(ko["etudes.removeTiesBeforeMovingNotesToAnotherStaff"]);
 const end=source.onset+ticksOf(source),target=m.events.filter(e=>e.voice===hand),overlap=target.filter(e=>e.onset<end&&e.onset+ticksOf(e)>source.onset);
 const same=overlap.length===1&&overlap[0].onset===source.onset&&ticksOf(overlap[0])===ticksOf(source);
 if(overlap.some(e=>!e.blank)&&!same)throw Error(ko["etudes.thisOverlapsTheOtherHandSRhythmMakeASpaceOfThe"]);
 if(source.tuplet&&!same)throw Error(ko["etudes.enterAMatchingTripletRhythmOnTheDestinationStaffBeforeMovingThe"]);
 if(!same&&overlap.some(e=>e.tuplet))throw Error(ko["etudes.thisOverlapsATripletOnTheDestinationStaff"]);
 if(same&&overlap[0].notes.some(n=>n.midi===tone.midi))throw Error(ko["etudes.theSamePitchAlreadyExistsAtThisPositionOnTheDestinationStaff"]);
 const silence=(start,end)=>{const result=[];for(const duration of ['1','2','4','8','16','32'])while(start+ticksOf({duration})<=end){result.push({...blankEvent(start,duration),voice:hand});start+=ticksOf({duration});}if(start!==end)throw Error(ko["etudes.checkTheRhythmicBoundariesOnTheDestinationStaff"]);return result;};
 const targetEvent=same?{...overlap[0],rest:false,blank:false,notes:[...overlap[0].notes,{...tone,hand}]}:{...blankEvent(source.onset,source.duration),voice:hand,dotted:source.dotted,rest:false,blank:false,notes:[{...tone,hand}]};
 const replaced=same?[targetEvent]:[...silence(overlap[0].onset,source.onset),targetEvent,...silence(end,overlap.at(-1).onset+ticksOf(overlap.at(-1)))];
 const notes=source.notes.filter(n=>n.id!==tone.id),events=sortPianoEvents([...m.events.filter(e=>!overlap.includes(e)).map(e=>e.id===source.id?{...e,notes,rest:!notes.length,blank:!notes.length}:e),...replaced]);
 return {document:{...d,measures:d.measures.map((bar,b)=>b===cursor.bar?{...m,events}:bar)},cursor:{...cursor,hand,event:events.findIndex(e=>e.id===targetEvent.id)}};
}
