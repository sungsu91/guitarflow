import {setDrumVoiceDuration,isLowerDrum,drumVoiceRhythm} from './drumVoices.js';
import {newId} from './scoreModel.js';
import {enterMidiNotes} from './enterMidiNotes.js';
import {inputRhythm} from './rhythmInput.js';
import {nextEntry,setEventDuration} from './editorCommands.js';
import {ticksOf,patchEvent} from './scoreModel.js';
export function drumRest(document,cursor,rhythm){const e=document.measures[cursor.bar].events[cursor.event];if(e.notes.length&&!e.rest)throw Error('타격이 있는 위치입니다. 지울 음을 선택해 삭제한 뒤 쉼표를 입력하세요.');return inputRhythm(document,cursor,rhythm,'rest');}
export function advanceDrum(document,cursor,rhythm){const e=document.measures[cursor.bar].events[cursor.event],changed=e.blank?drumRest(document,cursor,rhythm):{document,...rhythm};return {...changed,...nextEntry(changed.document,cursor)};}

export function advanceDrumWithHat(document,cursor,rhythm,midi){const next=advanceDrum(document,cursor,rhythm);if(!midi||next.document.measures[next.cursor.bar].events[next.cursor.event].notes.some(n=>[42,46].includes(n.midi)))return next;return {...next,...enterMidiNotes(next.document,next.cursor,[midi],{...rhythm,...next,session:next.completed?null:next.session})};}

// Explicit drum input applies the newly chosen duration, including occupied slots.
export function enterDrumNotes(document,cursor,pitches,rhythm){
 if(rhythm.tupletMode==='active')return enterMidiNotes(document,cursor,pitches,rhythm);
 let next=document;
 if(pitches.some(isLowerDrum)){const onset=document.measures[cursor.bar].events[cursor.event].onset;next={...document,measures:document.measures.map((bar,b)=>b===cursor.bar?{...bar,events:bar.events.map(e=>e.lowerRest&&e.onset<=onset&&onset<e.onset+ticksOf(drumVoiceRhythm(e,true))?{...e,lowerRest:false}:e)}:bar)};}
 for(const lower of [...new Set(pitches.map(isLowerDrum))]){
  const at=next.measures[cursor.bar].events[cursor.event];
  if(next.measures[cursor.bar].events.some(e=>e.onset<at.onset&&e.notes.some(n=>isLowerDrum(n.midi)===lower)&&e.onset+ticksOf(drumVoiceRhythm(e,lower))>at.onset))throw Error('앞 음표가 같은 드럼 성부의 이 위치까지 이어집니다. 앞 음표 길이를 먼저 줄이세요.');
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
 while(at<end){const index=next.measures[cursor.bar].events.findIndex(e=>e.onset===at);if(index<0)throw Error('기존 리듬과 입력 위치가 맞지 않습니다.');changed=enterDrumNotes(next,{...cursor,event:index},pitches,state);next=changed.document;at+=ticksOf(drumVoiceRhythm(next.measures[cursor.bar].events[index],isLowerDrum(pitches[0])));state={...state,session:changed.completed?null:changed.session};}
 return {...changed,document:next,cursor:{...cursor,noteId:undefined},session:null,tupletMode:rhythm.tupletMode};
}

export function insertDrumLowerRest(document,cursor){
 const events=document.measures[cursor.bar].events,e=events[cursor.event],capacity=events.at(-1).onset+ticksOf(events.at(-1));
 const lower=events.filter(n=>n.notes.some(t=>[35,36,44].includes(t.midi)));
 if(lower.some(n=>n.onset<=e.onset&&n.onset+ticksOf(drumVoiceRhythm(n,true))>e.onset))throw Error('현재 위치에 킥 또는 페달 하이햇이 있습니다. 해당 음을 삭제한 뒤 쉼표를 입력하세요.');
 const limit=Math.min(e.onset+480,capacity,...lower.filter(n=>n.onset>e.onset).map(n=>n.onset),...events.filter(n=>n.lowerRest&&n.onset>e.onset).map(n=>n.onset));
 const duration=[4,8,16,32,64].find(d=>{const end=e.onset+1920/d;return end<=limit&&(end===capacity||events.some(n=>n.onset===end));});
 if(!duration)throw Error('현재 리듬에 맞는 쉼표를 넣을 수 없습니다. 음표 시작 위치를 선택하세요.');
 return patchEvent(document,cursor.bar,cursor.event,{lowerRest:true,lowerRestDuration:String(duration),blank:false});
}
