import {scoreRangeSelection} from './scoreRangeClipboard.js';
import {isFretted} from './scoreInstruments.js';
import {ticksOf} from './scoreModel.js';

// This is a presentation preference, never a replacement for sounding notes.
// Resolve it afresh after editing/pasting so a changed grip cannot stay hidden.
function grip(event) {
 if(event.rest||event.blank||event.voice||event.dead||event.technique||event.tieTo||event.slurTo||event.slideIn||event.slideOut||event.arpeggio||event.pdfImport?.status==='unresolved')return null;
 const tones=event.tones??event.notes??[event];
 if(tones.length<2||tones.some(n=>!Number.isInteger(n.string)||!Number.isInteger(n.fret)||n.fret<0||n.unplaced||n.dead||n.harmonic||n.parenthesized||n.bendEffect))return null;
 return JSON.stringify(tones.map(n=>[n.string,n.fret,n.finger??null,n.rightFinger??null]).sort((a,b)=>a[0]-b[0]));
}

// Restart at each bar and after rests, connections, or an unselected event.
// A range's first grip and every changed grip always remain readable.
export function tabRepeatMask(events) {
 const destinations=new Set(events.flatMap(e=>[e.tieTo,e.slurTo].filter(Boolean)));
 let previous=null,end=null;
 return events.map(event=>{
  const current=event.tabRepeat===true&&!destinations.has(event.id)?grip(event):null;
  const omit=current!==null&&current===previous&&event.onset===end;
  previous=current;end=event.onset+ticksOf(event);
  return omit;
 });
}

function selectedEvents(document,bar,range) {
 if(!isFretted(document.instrument))return [];
 if(range&&(!document.measures[range.start.bar]?.events[range.start.event]||!document.measures[range.end.bar]?.events[range.end.event]))return [];
 return range?scoreRangeSelection(document,range).items:(document.measures[bar]?.events??[]).map((event,index)=>({event,bar,index}));
}

export function tabRepeatState(document,bar,range) {
 const items=selectedEvents(document,bar,range).filter(({event})=>grip(event)||event.tabRepeat===true);
 return {available:items.length>0,enabled:items.length>0&&items.every(({event})=>event.tabRepeat===true)};
}

export function toggleTabRepeat(document,bar,range) {
 const state=tabRepeatState(document,bar,range);
 if(!state.available)return document;
 const ids=new Set(selectedEvents(document,bar,range).map(({event})=>event.id));
 return {...document,
  ...(!state.enabled?{viewSettings:{...document.viewSettings,tabRhythm:true}}:{}),
  measures:document.measures.map(m=>({...m,events:m.events.map(event=>{
   if(!ids.has(event.id))return event;
   if(!state.enabled&&grip(event))return {...event,tabRepeat:true};
   const next={...event};delete next.tabRepeat;return next;
  })}))};
}

export function tabRepeatHead(tab) {
 return {y:tab.getYForLine((tab.getNumLines()-1)/2),halfHeight:Math.abs(tab.getYForLine(1)-tab.getYForLine(0))*.55,halfWidth:5};
}
