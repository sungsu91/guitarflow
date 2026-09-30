import {isBlankEvent,newId,patchEvent,ticksOf} from './scoreModel.js';
import {setEventDuration,setNoteConnection} from './editorCommands.js';
import {measureMeters,meterTicks} from './scoreMeters.js';
import {isFretted} from './scoreInstruments.js';
import {t} from '../i18n/core.js';

export function previousTiePosition(document,cursor) {
 if(cursor.event>0)return {...cursor,event:cursor.event-1};
 const bar=cursor.bar-1;
 return bar>=0?{...cursor,bar,event:document.measures[bar].events.length-1}:null;
}
export function tieAtCursor(document,cursor) {
 const event=document.measures[cursor.bar]?.events[cursor.event],previous=previousTiePosition(document,cursor);
 if(!event)return false;
 return Boolean(event?.tieTo||previous&&document.measures[previous.bar].events[previous.event].tieTo===event?.id);
}
// An empty continuation still occupies real musical time. Give it the previous
// pitch and a fresh identity; the renderer omits its fret and playback sustains it.
export function toggleEntryTie(document,cursor,duration) {
 if(!isFretted(document.instrument))return setNoteConnection(document,cursor,'tie');
 const event=document.measures[cursor.bar]?.events[cursor.event],at=previousTiePosition(document,cursor);
 const previous=at&&document.measures[at.bar].events[at.event];
 if(event?.tieTo)return setNoteConnection(document,cursor,'tie');
 if(previous?.tieTo===event?.id)return patchEvent(document,at.bar,at.event,{tieTo:null});
 if(!event||!isBlankEvent(event))return setNoteConnection(document,cursor,'tie');
 const end=at?.bar===cursor.bar?event.onset:at?meterTicks(measureMeters(document)[at.bar]):0;
 if(!previous||previous.rest||previous.dead||!previous.notes.length||previous.notes.some(n=>n.dead)||previous.onset+ticksOf(previous)!==end||(at.bar!==cursor.bar&&event.onset!==0))throw Error(t('editor.tieNeedsPreviousNote'));
 let next=setEventDuration(document,cursor,duration??event.duration);
 next=patchEvent(next,cursor.bar,cursor.event,{rest:false,blank:false,dead:false,notes:previous.notes.map(n=>({...n,id:newId('tone')})),pickStroke:null,technique:null});
 return setNoteConnection(next,at,'tie');
}
