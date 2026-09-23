import {blankEvent,blankMeasure,newId,ticksOf} from './scoreModel.js';

function segment(event,start,end){
 const a=Math.max(start,event.onset),b=Math.min(end,event.onset+ticksOf(event));
 if(b<=a)return [];
 if(a===event.onset&&b===event.onset+ticksOf(event))return [structuredClone(event)];
 if(event.tuplet)throw Error('박 경계를 넘는 셋잇단음표 묶음을 먼저 정리하세요.');
 const result=[];let at=a;
 while(at<b){
  const duration=['1','2','4','8','16','32','64'].find(v=>1920/Number(v)<=b-at);
  if(!duration)throw Error('박 경계의 음표 길이를 확인하세요.');
  result.push({...structuredClone(event),id:newId('event'),onset:at,duration,dotted:false,tuplet:null,tieTo:null,slurTo:null,technique:null});at+=1920/Number(duration);
 }
 for(let i=0;i<result.length-1;i++)if(!event.rest)result[i].tieTo=result[i+1].id;
 return result;
}
const range=(events,start,end)=>events.flatMap(e=>segment(e,start,end));
function cleanLinks(document){
 const ids=new Set(document.measures.flatMap(m=>m.events.map(e=>e.id)));
 return {...document,measures:document.measures.map(m=>({...m,events:m.events.map(e=>({...e,tieTo:ids.has(e.tieTo)?e.tieTo:null,slurTo:ids.has(e.slurTo)?e.slurTo:null}))}))};
}
// A beat is the meter denominator, regardless of which subdivision is selected.
export function editWholeBeat(document,cursor,{copy=false}={}){
 const beat=1920/document.meter[1],capacity=beat*document.meter[0];
 const selected=document.measures[cursor.bar].events[cursor.event];
 const start=Math.floor(selected.onset/beat)*beat;
 let bar=cursor.bar,target=start,measures=[...document.measures];
 let events;
 if(copy){
  target=start+beat;if(target>=capacity){bar++;target=0;}
  if(bar>=measures.length){if(measures.length>=64)throw Error('최대 64마디입니다.');measures.push(blankMeasure(document.meter));}
  const source=range(document.measures[cursor.bar].events,start,start+beat);
  const ids=new Map(source.map(e=>[e.id,newId('event')])),groups=new Map();
  events=source.map(e=>{if(e.tuplet&&!groups.has(e.tuplet.groupId))groups.set(e.tuplet.groupId,newId('tuplet'));return {...e,id:ids.get(e.id),onset:e.onset-start+target,notes:e.notes.map(n=>({...n,id:newId('tone')})),tieTo:ids.get(e.tieTo)??null,slurTo:ids.get(e.slurTo)??null,tuplet:e.tuplet?{...e.tuplet,groupId:groups.get(e.tuplet.groupId)}:null};});
 }else events=[blankEvent(target,String(document.meter[1]))];
 const measure=measures[bar];
 const nextEvents=[...range(measure.events,0,target),...events,...range(measure.events,target+beat,capacity)];
 if(nextEvents.length>64)throw Error('한 마디에 최대 64개 음표를 입력할 수 있습니다.');
 measures[bar]={...measure,events:nextEvents};
 return {document:cleanLinks({...document,measures}),cursor:{...cursor,bar,event:nextEvents.findIndex(e=>e.onset===target),noteId:undefined,target:undefined}};
}
