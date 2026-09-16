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
 if(!['auto','join','break'].includes(value))throw Error('빔 설정을 확인하세요.');
 const events=document.measures[cursor.bar].events,event=events[cursor.event];
 if(value==='join'&&!canJoinBeam(events,cursor.event))throw Error('같은 마디의 연속된 8분·16분음표를 선택하세요. 쉼표·빈 간격·다른 3연음 묶음은 연결하지 않습니다.');
 if(value==='break'&&!beamable(event))throw Error('8분·16분음표에서 빔을 끊을 수 있습니다.');
 if((event.beamBefore??'auto')===value)return document;
 return patchEvent(document,cursor.bar,cursor.event,e=>{const next={...e};if(value==='auto')delete next.beamBefore;else next.beamBefore=value;return next;});
}

// A range edits beam boundaries only. Duration/onset/tones remain untouched.
export function setBeamRange(document,{bar,start,end},action){
 if(!['join','break','auto'].includes(action))throw Error('빔 설정을 확인하세요.');
 const events=document.measures[bar]?.events,first=Math.min(start,end),last=Math.max(start,end);
 if(!events||!Number.isInteger(first)||!Number.isInteger(last)||first<0||last>=events.length||first===last)throw Error('같은 마디의 연속된 음표를 두 개 이상 선택하세요.');
 const selected=events.slice(first,last+1);
 // Restoring notation must also work after a grouped note was deleted or
 // changed to a rest. No rhythm or tuplet membership is edited here.
 if(action!=='join'){
  let next=document;
  for(let i=first;i<=last;i++)if(action==='auto'||beamable(events[i]))next=setBeamBefore(next,{bar,event:i},action==='auto'?'auto':'break');
  if(beamable(events[last+1]))next=setBeamBefore(next,{bar,event:last+1},action==='auto'?'auto':'break');
  return next;
 }
 if(selected.some(e=>!beamable(e)))throw Error('쉼표·빈 자리·4분음표 이상을 포함한 범위는 빔으로 묶을 수 없습니다.');
 if(selected.some((e,i)=>i>0&&selected[i-1].onset+ticksOf(selected[i-1])!==e.onset))throw Error('빈 시간 없이 이어진 음표만 선택하세요.');
 if(selected.some(e=>e.tuplet)&&(!selected.every(e=>e.tuplet?.groupId===selected[0].tuplet?.groupId)||selected.length!==3))throw Error('3연음은 기존 세 음 묶음 안에서만 빔을 편집할 수 있습니다. 일반 음표와 함께 묶을 수 없습니다.');
 let next=document;
 for(let i=first;i<=last;i++)next=setBeamBefore(next,{bar,event:i},action==='auto'?'auto':action==='break'||i===first?'break':'join');
 // Isolate the end too, including a range ending inside an automatic beat.
 if(beamable(events[last+1]))next=setBeamBefore(next,{bar,event:last+1},action==='auto'?'auto':'break');
 return next;
}
