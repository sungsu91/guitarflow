import {blankEvent,isBlankEvent,ticksOf,tupletGroups,patchEvent} from './scoreModel.js';

const replace=(d,bar,events)=>({...d,measures:d.measures.map((m,i)=>i===bar?{...m,events}:m)});
// Fill time with ordinary silent positions; never quantize a triplet to sixteenths.
function silence(start,end){const result=[];for(const duration of ['1','2','4','8','16','32']){const length=ticksOf({duration});while(start+length<=end){result.push(blankEvent(start,duration));start+=length;}}if(start!==end)throw Error('이 위치에서는 일반 음표로 바꿀 수 없습니다.');return result;}
export function ensureTriplet(d,c,duration='8'){
 if(!['8','16'].includes(duration))throw Error('3연음은 8분 또는 16분음표를 선택하세요.');
 const m=d.measures[c.bar],e=m.events[c.event];if(e.dotted)throw Error('점8분을 해제한 뒤 3연음을 입력하세요.');if(e.tuplet){if(e.duration!==duration)throw Error('기존 3연음의 길이는 묶음을 해제한 뒤 변경하세요.');return d;}
 const span=ticksOf({duration})*2,end=e.onset+span,capacity=d.meter[0]*1920/d.meter[1];
 if(end>capacity||e.onset%span)throw Error('3연음 묶음이 시작되는 박을 선택하세요.');
 let stop=c.event,covered=e.onset;
 while(stop<m.events.length&&covered<end){const candidate=m.events[stop];if(candidate.tuplet||candidate.onset!==covered||(stop!==c.event&&!isBlankEvent(candidate)))throw Error('뒤쪽에 입력된 음이 있습니다. 빈 박에서 3연음을 시작하세요.');covered+=ticksOf(candidate);stop++;}
 if(covered<end||e.tieTo||e.technique)throw Error('빈 박을 확보하고 연결 주법을 해제하세요.');
 const tuplet={actualNotes:3,normalNotes:2,groupId:e.id},length=span/3;
 const group=Array.from({length:3},(_,i)=>({...(i?blankEvent(e.onset+i*length,duration):e),onset:e.onset+i*length,duration,tuplet:{...tuplet}}));
 return replace(d,c.bar,[...m.events.slice(0,c.event),...group,...silence(end,covered),...m.events.slice(stop)]);
}
export function removeTriplet(d,c,{clear=false}={}){
 const m=d.measures[c.bar],indices=tupletGroups(m.events).find(g=>g.includes(c.event));if(!indices)return d;
 const first=indices[0],last=indices.at(-1),group=indices.map(i=>m.events[i]),start=group[0].onset,end=group.at(-1).onset+ticksOf(group.at(-1));
 if(clear){
  let next=replace(d,c.bar,[...m.events.slice(0,first),...silence(start,end),...m.events.slice(last+1)]);
  const removed=new Set(group.map(e=>e.id)),previous=m.events[first-1]??d.measures[c.bar-1]?.events.at(-1);
  next.measures.forEach((bar,b)=>bar.events.forEach((e,i)=>{const tie=removed.has(e.tieTo),technique=e===previous&&e.technique;if(tie||technique)next=patchEvent(next,b,i,{...(tie?{tieTo:null}:{}),...(technique?{technique:null}:{})});}));
  return next;
 }
 const length=ticksOf({duration:group[0].duration}),wanted=start+length*3,capacity=d.meter[0]*1920/d.meter[1];let stop=last+1,covered=end;
 while(stop<m.events.length&&covered<wanted){const e=m.events[stop];if(!isBlankEvent(e)||e.tuplet||e.onset!==covered)break;covered+=ticksOf(e);stop++;}
 if(wanted>capacity||covered<wanted)throw Error('일반 음표 3개로 해제하려면 뒤에 빈 시간이 필요합니다. 묶음 삭제는 현재 시간만 비웁니다.');
 return replace(d,c.bar,[...m.events.slice(0,first),...group.map((e,i)=>{const {tuplet,beamBefore,...note}=e;return {...note,onset:start+i*length};}),...silence(wanted,covered),...m.events.slice(stop)]);
}
