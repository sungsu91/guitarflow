import {blankEvent,blankMeasure,newId,ticksOf} from './scoreModel.js';
import {measureMeters,meterTicks} from './scoreMeters.js';
// Deliberately independent of the one-click line copy and bar-copy tools.
export const scoreRangeClipboard={current:null};
function timeline(d){let at=0;return measureMeters(d).map((meter,bar)=>{const start=at;at+=meterTicks(meter);return {bar,start,end:at,meter};});}
function durationOf(e){return Math.max(ticksOf(e),...['drumUpperRhythm','drumLowerRhythm'].map(k=>e[k]?ticksOf(e[k]):0),e.lowerRest?1920/Number(e.lowerRestDuration||4):0);}
function silentParts(start,end,voice){const result=[];while(start<end-1e-6){const duration=[1,2,4,8,16,32,64].find(d=>1920/d<=end-start+1e-6);if(!duration)throw Error('셋잇단음표는 묶음 전체를 선택해 주세요.');const e=blankEvent(start,String(duration));if(voice)e.voice=voice;result.push(e);start+=ticksOf(e);}return result;}
export function copyScoreRange(d,range){
 const rows=timeline(d),items=rows.flatMap(r=>d.measures[r.bar].events.map((event,index)=>({bar:r.bar,index,at:r.start+event.onset,event})));
 const a=items.find(x=>x.bar===range.start.bar&&x.index===range.start.event),b=items.find(x=>x.bar===range.end.bar&&x.index===range.end.event);if(!a||!b)throw Error('복사할 음표 구간을 다시 선택하세요.');
 let start=Math.min(a.at,b.at),end=Math.max(a.at+durationOf(a.event),b.at+durationOf(b.event)),changed=true;
 while(changed){const old=[start,end];const tuplets=new Set(items.filter(x=>x.at<end&&x.at+ticksOf(x.event)>start&&x.event.tuplet).map(x=>x.event.tuplet.groupId));for(const x of items){if(tuplets.has(x.event.tuplet?.groupId)||(!x.event.blank&&x.at<end&&x.at+durationOf(x.event)>start)){start=Math.min(start,x.at);end=Math.max(end,x.at+durationOf(x.event));}}changed=start!==old[0]||end!==old[1];}
 const events=items.filter(x=>x.at<end&&x.at+ticksOf(x.event)>start).flatMap(x=>{if(x.at<start||x.at+ticksOf(x.event)>end)return silentParts(Math.max(start,x.at)-start,Math.min(end,x.at+ticksOf(x.event))-start,x.event.voice).map(event=>({at:event.onset,event}));return [{at:x.at-start,event:structuredClone(x.event)}];});
 return {format:'fretiva.score-range',version:1,instrument:d.instrument??'guitar',tuning:[...d.tuning],span:end-start,events};
}
export function pasteScoreRange(d,cursor,clip){
 if(!clip?.events?.length)throw Error('먼저 악보 구간을 Ctrl+C로 복사하세요.');
 if(clip.instrument!==(d.instrument??'guitar')||JSON.stringify(clip.tuning)!==JSON.stringify(d.tuning))throw Error('복사한 구간과 같은 악기·튜닝의 악보에 붙여넣어 주세요.');
 let rows=timeline(d);const target=d.measures[cursor.bar]?.events[cursor.event];if(!target)throw Error('붙여넣을 위치를 선택하세요.');const start=rows[cursor.bar].start+target.onset,end=start+clip.span;
 const result=structuredClone(d);while(rows.at(-1).end<end){if(result.measures.length>=64)throw Error('최대 64마디입니다.');const bar=blankMeasure(rows.at(-1).meter);if(target.voice){bar.events= ['right','left'].flatMap(voice=>bar.events.map(e=>({...structuredClone(e),id:newId('event'),voice})));}result.measures.push(bar);rows=timeline(result);}
 for(const row of rows)for(const e of result.measures[row.bar].events){const at=row.start+e.onset,stop=at+durationOf(e);if(!e.blank&&at<end&&stop>start&&(at<start||stop>end))throw Error('붙여넣기 경계가 기존 음표 중간입니다. 음표 시작 위치에 맞춰 주세요.');}
 // Validate before replacing: never silently cut an existing sounding note.
 for(const row of rows){const events=result.measures[row.bar].events;result.measures[row.bar].events=events.flatMap(e=>{const at=row.start+e.onset,stop=at+ticksOf(e);if(at>=end||stop<=start)return [e];if((at<start||stop>end)&&!e.blank)throw Error('붙여넣기 경계가 기존 음표 중간입니다. 음표 시작 위치에 맞춰 주세요.');return [...(at<start?silentParts(e.onset,start-row.start,e.voice):[]),...(stop>end?silentParts(end-row.start,stop-row.start,e.voice):[])];});}
 const ids=new Map(clip.events.map(x=>[x.event.id,newId('event')])),groups=new Map();
 for(const item of clip.events){const e=structuredClone(item.event),at=start+item.at,stop=at+ticksOf(e),row=rows.find(r=>at>=r.start&&at<r.end);if(!row)throw Error('붙여넣기 범위를 확인하세요.');
 e.id=ids.get(e.id);e.notes=e.notes.map(n=>({...n,id:newId('tone')}));for(const key of ['tieTo','slurTo'])if(e[key])e[key]=ids.get(e[key])??null;if(e.tuplet?.groupId){const old=e.tuplet.groupId;if(!groups.has(old))groups.set(old,newId('tuplet'));e.tuplet.groupId=groups.get(old);}
 if(stop>row.end+1e-6){if(!e.blank)throw Error('복사한 음표가 마디선을 넘습니다. 붙여넣을 시작 박을 맞춰 주세요.');for(const r of rows.filter(r=>r.start<stop&&r.end>at))result.measures[r.bar].events.push(...silentParts(Math.max(at,r.start)-r.start,Math.min(stop,r.end)-r.start,e.voice));}else{e.onset=at-row.start;result.measures[row.bar].events.push(e);}
 }
 const remaining=new Set(result.measures.flatMap(m=>m.events.map(e=>e.id)));
 for(const m of result.measures)for(const e of m.events)for(const key of ['tieTo','slurTo'])if(e[key]&&!remaining.has(e[key]))e[key]=null;
 for(const m of result.measures)m.events.sort((a,b)=>a.onset-b.onset||(a.voice??'').localeCompare(b.voice??''));
 return result;
}
