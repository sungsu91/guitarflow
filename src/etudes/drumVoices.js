import {blankEvent,patchEvent,ticksOf} from './scoreModel.js';
export const isLowerDrum=midi=>[35,36,44].includes(midi);
const rhythmKey=lower=>lower?'drumLowerRhythm':'drumUpperRhythm';
export function drumVoiceRhythm(event,lower){return lower&&event.lowerRest?{duration:event.lowerRestDuration||'4',dotted:false,tuplet:null}:event[rhythmKey(lower)]??{duration:event.duration,dotted:event.dotted,tuplet:event.tuplet};}
const hasVoice=(event,lower)=>(event.notes??event.tones??[]).some(n=>isLowerDrum(n.midi)===lower);
// Refine the timing grid without moving or deleting either percussion voice.
function splitAt(document,bar,tick){
 const events=document.measures[bar].events,index=events.findIndex(e=>e.onset<tick&&e.onset+ticksOf(e)>tick);
 if(index<0)return document;
 const original=events[index];if(original.tuplet)throw Error('셋잇단음표 안에서는 같은 셋잇단 길이를 사용하세요.');
 const parts=[];let onset=original.onset;
 for(const end of [tick,original.onset+ticksOf(original)])while(onset<end){const duration=[1,2,4,8,16,32,64].find(d=>1920/d<=end-onset);if(!duration)throw Error('현재 리듬에 맞지 않는 길이입니다.');parts.push(blankEvent(onset,String(duration)));onset+=1920/duration;}
 parts[0]={...original,duration:parts[0].duration,dotted:false,tuplet:null,...(hasVoice(original,false)?{drumUpperRhythm:drumVoiceRhythm(original,false)}:{}),...(hasVoice(original,true)?{drumLowerRhythm:drumVoiceRhythm(original,true)}:{})};
 const next=[...events];next.splice(index,1,...parts);return {...document,measures:document.measures.map((m,i)=>i===bar?{...m,events:next}:m)};
}
export function setDrumVoiceDuration(document,cursor,duration,dotted=false,lower){
 const events=document.measures[cursor.bar].events,event=events[cursor.event];
 lower??=isLowerDrum(event.notes.find(n=>n.id===cursor.noteId)?.midi??cursor.midi??38);
 const rhythm={duration:String(duration),dotted:Boolean(dotted),tuplet:event.tuplet??null},end=event.onset+ticksOf(rhythm),capacity=events.at(-1).onset+ticksOf(events.at(-1));
 if(end>capacity)throw Error('음표 길이가 마디 끝을 넘습니다.');
 if(events.some(e=>e.onset>event.onset&&e.onset<end&&(hasVoice(e,lower)||(lower&&e.lowerRest))))throw Error('같은 드럼 성부의 다음 음과 겹칩니다. 더 짧은 길이를 선택하세요.');
 const next=splitAt(document,cursor.bar,end);
 return patchEvent(next,cursor.bar,cursor.event,{[rhythmKey(lower)]:rhythm,...(lower?{lowerRest:false}:{})});
}
export function drumVoiceEvents(events,lower){
 let until=-1;const indices=[],voiceEvents=[];
 events.forEach((e,i)=>{if(e.onset<until)return;const active=hasVoice(e,lower)||(lower&&e.lowerRest),rhythm=active?drumVoiceRhythm(e,lower):{duration:e.duration,dotted:e.dotted,tuplet:e.tuplet};until=e.onset+ticksOf(rhythm);indices.push(i);voiceEvents.push({...e,...rhythm,...(lower&&e.lowerRest?{rest:true,tones:[]}:{} )});});
 return {indices,voiceEvents};
}
