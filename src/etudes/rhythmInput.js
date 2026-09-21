import {isBlankEvent,patchEvent} from './scoreModel.js';
import {setEventDuration,setDotted,enterFretWithDuration,enterMutedTone,setRestWithDuration} from './editorCommands.js';
import {ensureTriplet} from './tuplets.js';
export function tripletProgress(document,session){
 if(!session)return {count:0,indices:[]};
 const events=document.measures[session.bar]?.events??[];
 const indices=events.flatMap((e,i)=>e.tuplet?.groupId===session.groupId?[i]:[]);
 return {indices,count:indices.filter(i=>!isBlankEvent(events[i])).length};
}
// A new rhythm consumes a modifier; chord strings and fret digits retain timing.
export function inputRhythm(document,cursor,{selectedDuration,dottedMode='off',tupletMode='off',session=null},kind,value){
 const original=document.measures[cursor.bar].events[cursor.event],fresh=isBlankEvent(original);
 if(tupletMode==='active'&&session&&original.tuplet?.groupId!==session.groupId)throw Error('진행 중인 셋잇단음표의 다음 빈 음을 선택하세요.');
 let next=document;
 if(!fresh&&tupletMode==='active'&&!session&&!original.tuplet)next=ensureTriplet(next,cursor,selectedDuration);
 if(fresh){
  if(tupletMode==='active'){
   next=ensureTriplet(next,cursor,selectedDuration);
  }else if(!original.tuplet){
   next=setEventDuration(next,cursor,selectedDuration);
   if(dottedMode!=='off')next=setDotted(next,cursor,true);
  }
 }
 next=kind==='pitch'?patchEvent(next,cursor.bar,cursor.event,e=>({...e,rest:false,blank:false})):kind==='rest'?setRestWithDuration(next,cursor,selectedDuration):kind==='mute'?enterMutedTone(next,cursor,selectedDuration):enterFretWithDuration(next,cursor,value,selectedDuration);
 const event=next.measures[cursor.bar].events[cursor.event];
 const nextSession=tupletMode==='active'&&event.tuplet?{bar:cursor.bar,groupId:event.tuplet.groupId}:session;
 const progress=tripletProgress(next,nextSession);
 return {document:next,session:nextSession,dottedMode:fresh&&dottedMode==='one-shot'?'off':dottedMode,tupletMode:progress.count===3?'off':tupletMode,completed:tupletMode==='active'&&progress.count===3};
}
export function rhythmInputLabel(duration,dottedMode,tupletMode,count){
 if(tupletMode==='active')return count?`셋잇단 ${count}/3`:'셋잇단 입력 · 첫 음';
 return `${dottedMode!=='off'?'점':''}${duration==='1'?'온':duration+'분'}음표${dottedMode==='locked'?' · 고정':''}`;
}
