import {patchEvent,newId,ticksOf,blankEvent,cloneMeasures,moveSamePitch} from './scoreModel.js';
export function enterFret(d,c,fret){return patchEvent(d,c.bar,c.event,e=>{const old=e.notes.find(n=>n.string===c.string);const tone={...(old??{id:newId('tone')}),string:c.string,fret,locked:true};delete tone.spelling;const notes=e.rest?[tone]:old?e.notes.map(n=>n===old?tone:n):[...e.notes,tone];return {...e,rest:false,notes};});}
export function setEventDuration(d,c,duration){
 const allowed=['1','2','4','8','16'];if(!allowed.includes(String(duration)))throw Error('지원하지 않는 음표 길이입니다.');
 const measure=d.measures[c.bar],event=measure?.events[c.event];if(!event||event.duration===String(duration))return d;
 const current=ticksOf(event),nextTicks=ticksOf({duration:String(duration)});let events;
 const following=measure.events[c.event+1];
 if(nextTicks<current&&current%nextTicks===0&&measure.events.length+current/nextTicks-1<=64&&(!following||following.onset>=event.onset+current)){
  const fillers=Array.from({length:current/nextTicks-1},(_,i)=>blankEvent(event.onset+(i+1)*nextTicks,String(duration)));
  events=[...measure.events.slice(0,c.event),{...event,duration:String(duration)},...fillers,...measure.events.slice(c.event+1)];
 }else if(nextTicks>current){
  const wantedEnd=event.onset+nextTicks;let index=c.event+1,cursor=event.onset+current;
  while(index<measure.events.length&&cursor<wantedEnd){const candidate=measure.events[index];if(!candidate.rest||candidate.notes.length||candidate.technique||candidate.tieTo||candidate.pickStroke||candidate.onset!==cursor)break;cursor+=ticksOf(candidate);index++;}
  events=cursor===wantedEnd?[...measure.events.slice(0,c.event),{...event,duration:String(duration)},...measure.events.slice(index)]:null;
 }
 if(!events)return patchEvent(d,c.bar,c.event,{duration:String(duration)});
 return {...d,measures:d.measures.map((bar,i)=>i===c.bar?{...bar,events}:bar)};
}
export function enterFretWithDuration(d,c,fret,duration){return enterFret(setEventDuration(d,c,duration),c,fret);}
// Timing cannot distinguish two consecutive notes (2, 3) from fret 23.
// Continuous input never combines; the explicit two-digit mode uses 420ms.
export function resolveFretInput(previous,key,location,time,twoDigit=false){
 const same=previous?.location===location;
 const combined=Boolean(twoDigit&&same&&time-previous.time<420&&/^[12]$/.test(previous.text)&&Number(previous.text+key)<=24);
 const value=combined?Number(previous.text+key):Number(key);
 return {value,combined,advanceBefore:Boolean(same&&!combined),wait:twoDigit&&!combined&&/^[12]$/.test(key),text:String(value),location,time};
}
export function deleteTone(d,c){return patchEvent(d,c.bar,c.event,e=>{const notes=e.notes.filter(n=>n.string!==c.string);return {...e,notes,rest:!notes.length,technique:notes.length?e.technique:null};});}
export function moveFingering(d,c,direction){return patchEvent(d,c.bar,c.event,e=>{const tone=e.notes.find(n=>n.string===c.string);if(!tone)return e;const next=moveSamePitch(tone,direction,d.tuning);if(e.notes.some(n=>n!==tone&&n.string===next.string))return e;return {...e,notes:e.notes.map(n=>n===tone?next:n)};});}
export function setRest(d,c){return patchEvent(d,c.bar,c.event,{rest:true,notes:[],technique:null});}
export function durationStep(d,c,step){const values=['1','2','4','8','16'];const event=d.measures[c.bar].events[c.event];return patchEvent(d,c.bar,c.event,{duration:values[Math.max(0,Math.min(4,values.indexOf(event.duration)+step))]});}
export function insertEvent(d,c,{duplicate=false,before=false}={}){const m=d.measures[c.bar],e=m.events[c.event];if(m.events.length>=64)throw Error('한 마디에 최대 64개 박을 입력할 수 있습니다.');const length=ticksOf(e),at=c.event+(before?0:1),onset=e.onset+(before?0:length),added=duplicate?{...structuredClone(e),id:newId('event'),onset,notes:e.notes.map(n=>({...n,id:newId('tone')}))}:blankEvent(onset,e.duration);const events=[...m.events.slice(0,at),added,...m.events.slice(at).map(n=>({...n,onset:n.onset+length}))];return {...d,measures:d.measures.map((bar,i)=>i===c.bar?{...bar,events}:bar)};}
// Dragging is an explicit local edit, never a rerun of fingering generation.
// Destination slots retain their timing; occupied slots are never overwritten.
export function moveTone(d,from,to){
 const source=d.measures[from.bar]?.events[from.event],target=d.measures[to.bar]?.events[to.event];
 const tone=source?.notes.find(n=>n.string===from.string);if(!tone||!target)throw Error('이동할 음표와 놓을 박을 선택하세요.');
 const same=source===target;
 let moved={...tone,locked:true};
 if(to.mode==='staff'){
  const fret=to.midi-d.tuning[tone.string-1];if(!Number.isInteger(fret)||fret<0||fret>24)throw Error('현재 줄에서 낼 수 없는 음입니다. 음정·동일음 운지 후보에서 줄을 먼저 선택하세요.');
  moved.fret=fret;
 }else{if(!Number.isInteger(to.string)||to.string<1||to.string>6)throw Error('TAB의 1–6번줄에 놓으세요.');moved.string=to.string;}
 if(same&&moved.string===tone.string&&moved.fret===tone.fret)return d;
 const flat=d.measures.flatMap(m=>m.events),connected=e=>{const i=flat.indexOf(e),previous=flat[i-1];return Boolean(e.tieTo||e.technique||previous?.tieTo===e.id||previous?.technique);};
 if(connected(source)||(!same&&connected(target)))throw Error('붙임줄·H/P/SL로 연결된 음은 연결을 먼저 해제한 뒤 이동하세요.');
 delete moved.spelling;
 if(same){if(source.notes.some(n=>n!==tone&&n.string===moved.string))throw Error('이 줄에는 이미 음표가 있습니다.');return patchEvent(d,from.bar,from.event,{notes:source.notes.map(n=>n===tone?moved:n)});}
 if(!target.rest||target.notes.length)throw Error('이미 음표가 있는 박입니다. 같은 길이의 쉼표 자리로 옮기세요.');
 if(source.duration!==target.duration)throw Error('같은 길이의 쉼표 자리로 옮기세요. 박 나누기 또는 음 길이로 자리를 준비할 수 있습니다.');
 const remaining=source.notes.filter(n=>n!==tone);
 let next=patchEvent(d,from.bar,from.event,{notes:remaining,rest:!remaining.length,...(!remaining.length?{pickStroke:null}: {})});
 next=patchEvent(next,to.bar,to.event,{notes:[moved],rest:false,pickStroke:source.pickStroke??null});return next;
}
export function splitEvent(d,c){const m=d.measures[c.bar],e=m.events[c.event];if(Number(e.duration)>=16||m.events.length>=64)throw Error('현재 박은 더 나눌 수 없습니다.');if(e.tieTo||e.technique)throw Error('연결된 박은 주법·붙임줄을 먼저 해제한 뒤 나누세요.');const duration=String(Number(e.duration)*2),events=[...m.events.slice(0,c.event),{...e,duration},blankEvent(e.onset+ticksOf(e)/2,duration),...m.events.slice(c.event+1)];return {...d,measures:d.measures.map((bar,i)=>i===c.bar?{...bar,events}:bar)};}
export function applyPicking(d,{start=0,end=d.measures.length-1,pattern='alternate-down',skipLegato=true}={}){
 if(!['alternate-down','alternate-up','down','up','clear'].includes(pattern))throw Error('피킹 패턴을 선택하세요.');
 const lo=Math.min(start,end),hi=Math.max(start,end);let count=0,previous=null;
 const measures=d.measures.map((m,b)=>{const events=m.events.map(e=>{const connected=previous&&!previous.rest&&(previous.tieTo===e.id||(skipLegato&&previous.technique&&['H','P','S'].includes(previous.technique)));previous=e;if(b<lo||b>hi)return e;let pickStroke=null;
  if(pattern!=='clear'&&!e.rest&&!connected){pickStroke=pattern==='up'||pattern==='down'?pattern:(count%2===0)===(pattern==='alternate-down')?'down':'up';count++;}
  return (e.pickStroke??null)===pickStroke?e:{...e,pickStroke};});return events.every((e,i)=>e===m.events[i])?m:{...m,events};});
 return measures.every((m,i)=>m===d.measures[i])?d:{...d,measures};
}
export function copyBars(d,start,end){return d.measures.slice(Math.min(start,end),Math.max(start,end)+1).map(m=>structuredClone(m));}
export function pasteBars(d,after,bars){if(d.measures.length+bars.length>64)throw Error('최대 64마디입니다.');return {...d,measures:[...d.measures.slice(0,after+1),...cloneMeasures(bars),...d.measures.slice(after+1)]};}
export function cursorStep(d,c,direction){let bar=c.bar,event=c.event+direction;if(event<0&&bar>0){bar--;event=d.measures[bar].events.length-1;}if(event>=d.measures[bar].events.length&&bar<d.measures.length-1){bar++;event=0;}return {...c,bar,event:Math.max(0,Math.min(d.measures[bar].events.length-1,event))};}
export function inputDigits(previous,key,location,time,windowMs=700){const combined=previous&&previous.location===location&&time-previous.time<windowMs&&previous.text.length===1?Number(previous.text+key):99;const value=combined<=24?combined:Number(key);return {value,text:combined<=24?String(combined):key,time,location};}
