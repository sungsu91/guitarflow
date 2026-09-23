import ko from "../i18n/locales/ko.js";
import {patchEvent,ticksOf} from './scoreModel.js';
export const beamable=e=>Boolean(e&&!e.rest&&['8','16'].includes(e.duration));
export function canJoinBeam(events,index){
 const before=events[index-1],event=events[index];
 return beamable(before)&&beamable(event)&&before.tuplet?.groupId===event.tuplet?.groupId&&(event.onset==null||before.onset==null||before.onset+ticksOf(before)===event.onset);
}
// Overrides affect only the boundary before an event, never its rhythmic value.
export function overrideBeamGroups(events,automatic){
 const linked=new Set(automatic.flatMap(group=>group.slice(1).filter((n,i)=>group[i]===n-1)));
 const groups=[];let group=[];
 events.forEach((event,index)=>{
  if(!beamable(event)){if(group.length)groups.push(group);group=[];return;}
  const join=canJoinBeam(events,index)&&event.beamBefore!=='break'&&(event.beamBefore==='join'||linked.has(index));
  if(!join&&group.length){groups.push(group);group=[];}group.push(index);
 });if(group.length)groups.push(group);return groups;
}
export function setBeamBefore(document,cursor,value){
 if(!['auto','join','break'].includes(value))throw Error(ko["etudes.checkTheBeamSettings"]);
 const events=document.measures[cursor.bar].events,event=events[cursor.event];
 if(value==='join'&&!canJoinBeam(events,cursor.event))throw Error(ko["etudes.selectConsecutiveEighthOrSixteenthNotesInOneBarRestsGapsAnd"]);
 if(value==='break'&&!beamable(event))throw Error(ko["etudes.beamsCanBeBrokenAtEighthOrSixteenthNotes"]);
 if((event.beamBefore??'auto')===value)return document;
 return patchEvent(document,cursor.bar,cursor.event,e=>{const next={...e};if(value==='auto')delete next.beamBefore;else next.beamBefore=value;return next;});
}

// A range edits beam boundaries only. Duration/onset/tones remain untouched.
export function setBeamRange(document,{bar,start,end},action){
 if(!['join','break','auto'].includes(action))throw Error(ko["etudes.checkTheBeamSettings"]);
 const events=document.measures[bar]?.events,first=Math.min(start,end),last=Math.max(start,end);
 if(!events||!Number.isInteger(first)||!Number.isInteger(last)||first<0||last>=events.length||first===last)throw Error(ko["etudes.selectAtLeastTwoConsecutiveNotesInTheSameBar"]);
 const selected=events.slice(first,last+1);
 // Restoring notation must also work after a grouped note was deleted or
 // changed to a rest. No rhythm or tuplet membership is edited here.
 if(action!=='join'){
  let next=document;
  for(let i=first;i<=last;i++)if(action==='auto'||beamable(events[i]))next=setBeamBefore(next,{bar,event:i},action==='auto'?'auto':'break');
  if(beamable(events[last+1]))next=setBeamBefore(next,{bar,event:last+1},action==='auto'?'auto':'break');
  return next;
 }
 if(selected.some(e=>!beamable(e)))throw Error(ko["etudes.aSelectionContainingRestsGapsOrQuarterNotesOrLongerCannotBe"]);
 if(selected.some((e,i)=>i>0&&selected[i-1].onset+ticksOf(selected[i-1])!==e.onset))throw Error(ko["etudes.selectNotesWithNoGapsBetweenThem"]);
 if(selected.some(e=>e.tuplet)&&(!selected.every(e=>e.tuplet?.groupId===selected[0].tuplet?.groupId)||selected.length!==3))throw Error(ko["etudes.tripletBeamsCanOnlyBeEditedWithinTheirExistingThreeNoteGroup"]);
 let next=document;
 for(let i=first;i<=last;i++)next=setBeamBefore(next,{bar,event:i},action==='auto'?'auto':action==='break'||i===first?'break':'join');
 // Isolate the end too, including a range ending inside an automatic beat.
 if(beamable(events[last+1]))next=setBeamBefore(next,{bar,event:last+1},action==='auto'?'auto':'break');
 return next;
}
