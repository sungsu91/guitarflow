import {newId,patchEvent} from './scoreModel.js';
import {nextEntry,setEventDuration} from './editorCommands.js';

const cleared={technique:null,tieTo:null,pickStroke:null,dead:false,vibrato:false,palmMute:false,arpeggio:null};
// Replacing a vertical grip invalidates ties/legato into that position, but
// does not remove rhythmic slots or shift any following music.
function disconnectIncoming(d,c){
 const target=d.measures[c.bar].events[c.event],previous=c.event?d.measures[c.bar].events[c.event-1]:d.measures[c.bar-1]?.events.at(-1);
 let next=d;
 d.measures.forEach((bar,b)=>bar.events.forEach((e,i)=>{
  const tie=e.tieTo===target.id,legato=e===previous&&e.technique;
  if(tie||legato)next=patchEvent(next,b,i,{...(tie?{tieTo:null}:{}),...(legato?{technique:null}:{})});
 }));return next;
}
export function copyGripToNext(d,c){
 const source=d.measures[c.bar]?.events[c.event];
 if(!source||source.rest||!source.notes.length)throw Error('복사할 운지 묶음을 선택하세요.');
 const next=nextEntry(d,c);
 if(next.cursor.bar===c.bar&&next.cursor.event===c.event)throw Error('다음 입력 위치가 없습니다. 마디 길이와 최대 64마디 제한을 확인하세요.');
 const target=next.document.measures[next.cursor.bar].events[next.cursor.event];
 if(!['1','2','4','8','16'].includes(target.duration))throw Error('다음 위치의 음표 길이를 먼저 선택하세요. 현재 입력을 지원하지 않는 길이입니다.');
 const notes=source.notes.map(n=>({...structuredClone(n),id:newId('tone'),dead:Boolean(n.dead??source.dead)}));
 const timed=setEventDuration(next.document,next.cursor,source.duration,Boolean(source.dotted));
 const document=patchEvent(disconnectIncoming(timed,next.cursor),next.cursor.bar,next.cursor.event,{...cleared,notes,rest:false,blank:false});
 return {document,cursor:{...next.cursor,target:undefined},replaced:!target.rest&&target.notes.length>0};
}
export function deleteGrip(d,c){
 const event=d.measures[c.bar]?.events[c.event];if(!event||(!event.lowerRest&&(event.rest||!event.notes.length)))return d;
 return patchEvent(disconnectIncoming(d,c),c.bar,c.event,{...cleared,notes:[],rest:true,blank:true,lowerRest:false});
}
