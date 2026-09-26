import {TIME_SIGNATURES,meterInfo} from './meter.js';
export {meterInfo} from './meter.js';
import {BEAT_PRESETS,COMPOUND_PRESETS,beatTuplet,clone,note} from './model.js';
import {tuplet,units,writtenTicks,tupletGroups} from './rhythmMath.js';
import {RhythmTransport} from './transport.js';
export const GUIDE_METERS=TIME_SIGNATURES;
export const GUIDE_FAMILIES=[['basic','기본'],['sixteenth','16분 조합'],['rests','쉼표·엇박'],['dotted','점음표'],['ties','이음줄'],['triplet','셋잇단'],['tuplets','5·6·7연음']];
const notes=values=>values.map(v=>note(Math.abs(v),v<0));
export function guidePatterns(meter){
 const {compound,beats}=meterInfo(meter);
 if(!compound)return [
 ...BEAT_PRESETS.map(p=>({id:p.id,family:p.group,title:p.ko,groups:[clone(p.beat)]})),
 {id:'tie',family:'ties',title:'박을 넘는 이음줄',groups:[[{ticks:6,rest:false},{ticks:6,rest:false,tie:true}],notes([6,6])]},
 ...[5,6,7].flatMap(n=>[[],[0],[Math.floor(n/2)]].map((rests,i)=>({id:`tuplet-${n}-${i}`,family:'tuplets',title:`${n}연음${i?' · '+(i===1?'앞 쉼':'중간 쉼'):''}`,groups:[tuplet(n,rests)]})))];
 const full=(id,family,title,values)=>({id,family,title,groups:Array.from({length:beats},()=>clone(COMPOUND_PRESETS.find(p=>p.id===id)?.beat||notes(values)))});
 return [full('compound-eighths','basic',`${Array(beats).fill(3).join('+')} · 8분음표`,[6,6,6]),full('compound-quarter','basic','큰 박 · 점4분음표',[18]),full('compound-long-short','basic','4분 + 8분',[12,6]),full('compound-short-long','basic','8분 + 4분',[6,12]),full('compound-six','sixteenth','16분음표 여섯 개',[3,3,3,3,3,3]),full('compound-mix','sixteenth','8분 + 16분 + 16분 + 8분',[6,3,3,6]),full('compound-rest','rests','앞 8분쉼표',[-6,6,6]),full('compound-mid-rest','rests','중간 8분쉼표',[6,-6,6]),full('compound-end-rest','rests','뒤 8분쉼표',[6,6,-6]),full('compound-dotted','dotted','점8분 + 16분 + 8분',[9,3,6]),
 {id:'compound-tie',family:'ties',title:'큰 박을 넘는 이음줄',groups:Array.from({length:beats},(_,i)=>notes([6,6,6]).map((n,j)=>i===0&&j===2?{...n,tie:true}:n))},
 ...[3,5,6,7].flatMap(n=>[false,true].map(rest=>({id:`compound-tuplet-${n}-${rest}`,family:n===3?'triplet':'tuplets',title:`${n===3?'4분 안 셋잇단 + 8분':`점4분 안 ${n}연음`}${rest?' · 중간 쉼':''}`,groups:Array.from({length:beats},()=>n===3?[...tuplet(3,rest?[1]:[]),note(6)]:beatTuplet(n,meter,rest?[Math.floor(n/2)]:[]))})))];
}
const gcd=(a,b)=>b?gcd(b,a%b):a;
export function compileGuide(pattern,meter){
 if(!GUIDE_METERS.includes(meter)||!pattern.groups?.length)throw Error('박자표와 패턴을 확인해 주세요.');
 const flat=pattern.groups.flat();flat.forEach((n,i)=>{if(n.tie&&(n.rest||!flat[i+1]||flat[i+1].rest))throw Error('이음줄을 확인해 주세요.');});
 const info=meterInfo(meter);let offset=0,previous=null;
 const groups=pattern.groups.map((notes,group)=>{
  const duration=notes.reduce((sum,n)=>sum+units(n),0);
  if(duration!==info.beatTicks*35)throw Error('기준 박의 길이가 맞지 않습니다.');
  notes.forEach(n=>{if(![3,6,9,12,18].includes(writtenTicks(n))||!Number.isFinite(n.ticks)||n.ticks<=0||Math.abs(units(n)-n.ticks*35)>1e-7)throw Error('음가를 확인해 주세요.');if(n.tuplet&&Math.abs(n.ticks-n.written*n.tuplet.normal/n.tuplet.count)>1e-8)throw Error('연음 비율을 확인해 주세요.');});
  for(const g of tupletGroups(notes)){if(![3,5,6,7].includes(g.count)||g.end-g.start+1!==g.count)throw Error('연음 묶음을 확인해 주세요.');}
  const step=notes.reduce((g,n)=>gcd(g,units(n)),duration),count=duration/step;
  let at=0;
  const events=notes.map((n,index)=>{const e={...n,at:(offset+at)/35,ticks:units(n)/35,index,beat:0,measure:group,continuation:!!previous?.tie&&!n.rest};at+=units(n);previous=n;return e;});
  const cells=Array.from({length:count},(_,i)=>{
   const at=(offset+i*step)/35,e=events.find(e=>at>=e.at-1e-8&&at<e.at+e.ticks-1e-8);
   const kind=e.rest?'rest':Math.abs(at-e.at)<1e-8&&!e.continuation?'hit':'hold';
   const labels=!info.compound&&count===4?[String(group+1),'e','&','a']:!info.compound&&count===2?[String(group+1),'&']:count===1?[String(group+1)]:null;
   return {at,ticks:step/35,kind,label:labels?.[i]??`${group+1}·${i+1}`};
  });
  const result={notes,events,cells,at:offset/35,ticks:duration/35,step:step/35};offset+=duration;return result;
 });
 return {groups,events:groups.flatMap(g=>g.events),total:offset/35,...info};
}
// Same sample voices, sound synthesis, look-ahead scheduler and audio clock as practice.
export class GuideTransport extends RhythmTransport {
 configureGuide(compiled,bpm,tone){this.stop();this.tick=0;this.pattern={bpm,tone,meter:compiled.groups.length,meterDenominator:compiled.compound?8:4,click:true,countIn:false,loop:true};this.events=compiled.events;this.total=compiled.total;this.beatTicks=compiled.beatTicks;}
}
