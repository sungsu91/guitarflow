import ko from "../i18n/locales/ko.js";
import {blankEvent,isBlankEvent,ticksOf,tupletGroups,patchEvent} from './scoreModel.js';
import {measureMeters,meterTicks} from './scoreMeters.js';

const replace=(d,bar,events)=>({...d,measures:d.measures.map((m,i)=>i===bar?{...m,events}:m)});
// Fill time with ordinary silent positions; never quantize a triplet to sixteenths.
function silence(start,end){const result=[];for(const duration of ['1','2','4','8','16','32','64']){const length=ticksOf({duration});while(start+length<=end){result.push(blankEvent(start,duration));start+=length;}}if(start!==end)throw Error(ko["etudes.thisPositionCannotBeConvertedToARegularNote"]);return result;}
export function ensureTriplet(d,c,duration='8',count=3){
 if(![3,6].includes(count)||!['4','8','16','32'].includes(duration))throw Error(ko["etudes.chooseEighthOrSixteenthNotesForTriplets"]);
 const m=d.measures[c.bar],e=m.events[c.event];if(e.dotted)throw Error(ko["etudes.removeTheDottedEighthBeforeEnteringTriplets"]);if(e.tuplet){if(e.duration!==duration||e.tuplet.actualNotes!==count)throw Error(ko["etudes.removeTheExistingTripletGroupBeforeChangingItsDuration"]);return d;}
 const span=ticksOf({duration})*(count===6?4:2),end=e.onset+span,capacity=meterTicks(measureMeters(d)[c.bar]);
 if(end>capacity||e.onset%span)throw Error(ko["etudes.selectTheBeatWhereTheTripletGroupStarts"]);
 let stop=c.event,covered=e.onset;
 while(stop<m.events.length&&covered<end){const candidate=m.events[stop];if(candidate.tuplet||candidate.onset!==covered||(stop!==c.event&&!isBlankEvent(candidate)))throw Error(ko["etudes.thereAreNotesLaterInThisBeatStartTheTripletOnAn"]);covered+=ticksOf(candidate);stop++;}
 if(covered<end||e.tieTo||e.technique)throw Error(ko["etudes.makeAnEmptyBeatAndRemoveConnectingTechniques"]);
 const tuplet={actualNotes:count,normalNotes:count===6?4:2,groupId:e.id},length=span/count;
 const group=Array.from({length:count},(_,i)=>({...(i?blankEvent(e.onset+i*length,duration):e),onset:e.onset+i*length,duration,tuplet:{...tuplet}}));
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
 const length=ticksOf({duration:group[0].duration}),wanted=start+length*group.length,capacity=meterTicks(measureMeters(d)[c.bar]);let stop=last+1,covered=end;
 while(stop<m.events.length&&covered<wanted){const e=m.events[stop];if(!isBlankEvent(e)||e.tuplet||e.onset!==covered)break;covered+=ticksOf(e);stop++;}
 if(wanted>capacity||covered<wanted)throw Error(ko["etudes.convertingToThreeRegularNotesRequiresEmptyTimeAfterwardDeletingTheGroup"]);
 return replace(d,c.bar,[...m.events.slice(0,first),...group.map((e,i)=>{const {tuplet,beamBefore,...note}=e;return {...note,onset:start+i*length};}),...silence(wanted,covered),...m.events.slice(stop)]);
}
