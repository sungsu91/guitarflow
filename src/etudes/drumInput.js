import {enterMidiNotes} from './enterMidiNotes.js';
import {inputRhythm} from './rhythmInput.js';
import {nextEntry,setEventDuration} from './editorCommands.js';
import {ticksOf,patchEvent} from './scoreModel.js';
export function drumRest(document,cursor,rhythm){const e=document.measures[cursor.bar].events[cursor.event];if(e.notes.length&&!e.rest)throw Error('타격이 있는 위치입니다. 지울 음을 선택해 삭제한 뒤 쉼표를 입력하세요.');return inputRhythm(document,cursor,rhythm,'rest');}
export function advanceDrum(document,cursor,rhythm){const e=document.measures[cursor.bar].events[cursor.event],changed=e.blank?drumRest(document,cursor,rhythm):{document,...rhythm};return {...changed,...nextEntry(changed.document,cursor)};}

export function advanceDrumWithHat(document,cursor,rhythm,midi){const next=advanceDrum(document,cursor,rhythm);if(!midi||next.document.measures[next.cursor.bar].events[next.cursor.event].notes.some(n=>[42,46].includes(n.midi)))return next;return {...next,...enterMidiNotes(next.document,next.cursor,[midi],{...rhythm,...next,session:next.completed?null:next.session})};}

// Explicit drum input applies the newly chosen duration, including occupied slots.
export function enterDrumNotes(document,cursor,pitches,rhythm){
 const event=document.measures[cursor.bar].events[cursor.event];
 let next=document;
 if(pitches.some(m=>[35,36,44].includes(m)))next={...document,measures:document.measures.map((bar,b)=>b!==cursor.bar?bar:{...bar,events:bar.events.map(e=>e.lowerRest&&e.onset<=event.onset&&event.onset<e.onset+480?{...e,lowerRest:false}:e)})};
 if(!event.blank&&!event.tuplet&&rhythm.tupletMode!=='active')next=setEventDuration(next,cursor,rhythm.selectedDuration,rhythm.dottedMode!=='off'&&Boolean(rhythm.dottedMode));
 const changed=enterMidiNotes(next,cursor,pitches,rhythm);if(pitches.some(m=>[35,36,44].includes(m)))changed.document=patchEvent(changed.document,cursor.bar,cursor.event,{lowerRest:false});return changed;
}
export function fillDrumMeasure(document,cursor,pitches,rhythm){
 const bar=document.measures[cursor.bar],start=bar.events[cursor.event].onset,end=bar.events.at(-1).onset+ticksOf(bar.events.at(-1));
 const replaced=new Set(pitches.flatMap(midi=>[42,46].includes(midi)?[42,46]:[midi]));
 let next={...document,measures:document.measures.map((m,b)=>b!==cursor.bar?m:{...m,events:m.events.map(e=>{if(e.onset<start)return e;const notes=e.notes.filter(n=>!replaced.has(n.midi));return {...e,notes,rest:!notes.length,blank:!notes.length};})})};
 let at=start,changed={document:next},state={...rhythm,session:null};
 while(at<end){const index=next.measures[cursor.bar].events.findIndex(e=>e.onset===at);if(index<0)throw Error('기존 리듬과 입력 위치가 맞지 않습니다.');changed=enterDrumNotes(next,{...cursor,event:index},pitches,state);next=changed.document;at+=ticksOf(next.measures[cursor.bar].events[index]);state={...state,session:changed.completed?null:changed.session};}
 return {...changed,document:next,cursor:{...cursor,noteId:undefined},session:null,tupletMode:rhythm.tupletMode};
}

export function insertDrumLowerRest(document,cursor){
 const events=document.measures[cursor.bar].events,e=events[cursor.event],end=e.onset+480,capacity=events.at(-1).onset+ticksOf(events.at(-1));
 if(end>capacity)throw Error('4분쉼표가 마디 끝을 넘습니다. 한 박이 남은 위치를 선택하세요.');
 if(events.some(n=>n.onset<end&&n.onset+ticksOf(n)>e.onset&&n.notes.some(t=>[35,36,44].includes(t.midi))))throw Error('이 한 박에 킥 또는 페달 하이햇이 있습니다. 먼저 해당 음을 삭제하세요.');
 if(end!==capacity&&!events.some(n=>n.onset===end))throw Error('4분쉼표 끝이 기존 리듬과 맞지 않습니다. 박 시작 위치를 선택하세요.');
 return patchEvent(document,cursor.bar,cursor.event,{lowerRest:true,lowerRestDuration:'4',blank:false});
}
