import {enterMidiNotes} from './enterMidiNotes.js';
import {inputRhythm} from './rhythmInput.js';
import {nextEntry,setEventDuration} from './editorCommands.js';
import {ticksOf} from './scoreModel.js';
export function drumRest(document,cursor,rhythm){const e=document.measures[cursor.bar].events[cursor.event];if(e.notes.length&&!e.rest)throw Error('타격이 있는 위치입니다. 지울 음을 선택해 삭제한 뒤 쉼표를 입력하세요.');return inputRhythm(document,cursor,rhythm,'rest');}
export function advanceDrum(document,cursor,rhythm){const e=document.measures[cursor.bar].events[cursor.event],changed=e.blank?drumRest(document,cursor,rhythm):{document,...rhythm};return {...changed,...nextEntry(changed.document,cursor)};}

export function advanceDrumWithHat(document,cursor,rhythm,midi){const next=advanceDrum(document,cursor,rhythm);if(!midi||next.document.measures[next.cursor.bar].events[next.cursor.event].notes.some(n=>[42,46].includes(n.midi)))return next;return {...next,...enterMidiNotes(next.document,next.cursor,[midi],{...rhythm,...next,session:next.completed?null:next.session})};}

// Explicit drum input applies the newly chosen duration, including occupied slots.
export function enterDrumNotes(document,cursor,pitches,rhythm){
 const event=document.measures[cursor.bar].events[cursor.event];
 let next=document;
 if(!event.blank&&!event.tuplet&&rhythm.tupletMode!=='active')next=setEventDuration(document,cursor,rhythm.selectedDuration,rhythm.dottedMode!=='off'&&Boolean(rhythm.dottedMode));
 return enterMidiNotes(next,cursor,pitches,rhythm);
}
export function fillDrumMeasure(document,cursor,pitches,rhythm){
 const bar=document.measures[cursor.bar],start=bar.events[cursor.event].onset,end=bar.events.at(-1).onset+ticksOf(bar.events.at(-1));
 const replaced=new Set(pitches.flatMap(midi=>[42,46].includes(midi)?[42,46]:[midi]));
 let next={...document,measures:document.measures.map((m,b)=>b!==cursor.bar?m:{...m,events:m.events.map(e=>{if(e.onset<start)return e;const notes=e.notes.filter(n=>!replaced.has(n.midi));return {...e,notes,rest:!notes.length,blank:!notes.length};})})};
 let at=start,changed={document:next},state={...rhythm,session:null};
 while(at<end){const index=next.measures[cursor.bar].events.findIndex(e=>e.onset===at);if(index<0)throw Error('기존 리듬과 입력 위치가 맞지 않습니다.');changed=enterDrumNotes(next,{...cursor,event:index},pitches,state);next=changed.document;at+=ticksOf(next.measures[cursor.bar].events[index]);state={...state,session:changed.completed?null:changed.session};}
 return {...changed,document:next,cursor:{...cursor,noteId:undefined},session:null,tupletMode:rhythm.tupletMode};
}
