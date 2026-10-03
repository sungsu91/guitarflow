import {isFretted} from './scoreInstruments.js';
import {measureMeters} from './scoreMeters.js';

const same=(a,b)=>a===b||JSON.stringify(a)===JSON.stringify(b);

// Locate edits by stable IDs: inserting a bar must not make every later bar
// appear edited. When a deleted item is absent, show its surviving neighbour.
export function editorChangeLocation(before,after){
 const previous=new Map(before.measures.map(m=>[m.id,m]));
 const remaining=new Set(after.measures.map(m=>m.id));
 const changed=after.measures.flatMap((m,i)=>same(previous.get(m.id),m)?[]:[i]);
 for(const [i,m] of before.measures.entries())if(!remaining.has(m.id))changed.push(Math.min(i,after.measures.length-1));
 const bars=[...new Set(changed.filter(i=>i>=0))].sort((a,b)=>a-b);
 if(!bars.length)return {bars,cursor:null};
 const bar=bars[0],measure=after.measures[bar],old=previous.get(measure.id);
 const oldEvents=new Map(old?.events.map(e=>[e.id,e])??[]);
 let event=measure.events.findIndex(e=>!same(oldEvents.get(e.id),e));
 if(event<0){
  const ids=new Set(measure.events.map(e=>e.id));
  event=Math.min(old?.events.findIndex(e=>!ids.has(e.id))??0,measure.events.length-1);
 }
 event=Math.max(0,event);
 const selected=measure.events[event],prior=oldEvents.get(selected?.id);
 const note=selected?.notes.find(n=>!same(prior?.notes.find(p=>p.id===n.id),n))
  ??prior?.notes.find(p=>!selected?.notes.some(n=>n.id===p.id))??selected?.notes[0];
 return {bars,cursor:{bar,event,string:note?.string??1,mode:isFretted(after.instrument)?'tab':'staff',noteId:note?.id,midi:note?.midi,hand:selected?.voice}};
}

export function editorLocationLabel(document,cursor){
 const event=document.measures[cursor.bar]?.events[cursor.event];
 const beat=Math.floor((event?.onset??0)/(1920/measureMeters(document)[cursor.bar][1]))+1;
 return `${cursor.bar+1}마디 · ${beat}박 · ${cursor.event+1}번째 ${event?.rest?'쉼표':'위치'}${!event?.rest&&isFretted(document.instrument)?` · ${cursor.string}번 줄`:''}`;
}
