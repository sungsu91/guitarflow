import {NAV_MARKERS,NAV_COMMANDS,repeatStructure,navigationIssues,navigationOrder} from '../etudes/scoreNavigation.js';

const positive=value=>Math.max(1,Math.min(100000,Math.floor(Number(value)||1)));
export function normalizePdfRepeats(source){
 if(!source||typeof source!=='object'||Array.isArray(source))return null;
 const marks={};
 for(const [number,value] of Object.entries(source.marks??{}).slice(0,5000)){
  if(!/^\d+$/.test(number)||Number(number)<1||!value||typeof value!=='object')continue;
  const mark={};
  for(const key of ['repeatStart','repeatEnd'])if(value[key]===true)mark[key]=true;
  if([1,2,3,4,5].includes(value.ending))mark.ending=value.ending;
  if(NAV_MARKERS.some(([key])=>key===value.marker))mark.marker=value.marker;
  if(NAV_COMMANDS.some(([key])=>key===value.command))mark.command=value.command;
  if(['single','double','final'].includes(value.endBarline))mark.endBarline=value.endBarline;
  if(Object.keys(mark).length){if(Number.isFinite(value.lift))mark.lift=Math.max(0,Math.min(100,value.lift));marks[Number(number)]=mark;}
 }
 return {mode:['off','range','score'].includes(source.mode)?source.mode:'off',start:positive(source.start),end:positive(source.end??source.start),marks};
}

// The PDF owns numbered regions, while the shared score engine owns repeat rules.
// Map visits back to those regions without changing beats or page geometry.
export function pdfRepeatPlan(bars,source){
 const settings=normalizePdfRepeats(source),issues=[];
 if(!settings||settings.mode==='off')return {order:bars,loop:false,issues};
 if(!bars.length)return {order:[],loop:false,issues:['반복할 마디가 없습니다. 마디 영역을 먼저 설정하세요.']};
 if(settings.mode==='range'){
  const start=bars.findIndex(b=>b.number===settings.start),end=bars.findIndex(b=>b.number===settings.end);
  if(start<0||end<start)return {order:[],loop:false,issues:['반복 시작·끝 마디를 확인하세요. 끝 마디는 시작 마디 이후여야 합니다.']};
  return {order:bars.slice(start,end+1),loop:true,issues};
 }
 const measures=bars.map(b=>settings.marks[b.number]??{});
 const missing=Object.keys(settings.marks).filter(n=>!bars.some(b=>b.number===Number(n)));
 if(missing.length)issues.push(`기호가 연결된 ${missing.join(', ')}마디가 없습니다. 반복 설정을 수정하세요.`);
 const structure=repeatStructure(measures);
 issues.push(...structure.issues,...navigationIssues(measures));
 if(issues.length)return {order:[],loop:false,issues};
 try{return {order:navigationOrder(measures,structure.blocks).map(index=>bars[index]),loop:false,issues};}
 catch(error){return {order:[],loop:false,issues:[error.message]};}
}

export function setPdfRepeatMark(settings,number,patch){
 const marks={...settings.marks},next={...marks[number],...patch};
 for(const key of Object.keys(next))if(!next[key]&&!(key==='lift'&&next[key]===0))delete next[key];
 if(Object.keys(next).some(key=>key!=='lift'))marks[number]=next;else delete marks[number];
 return {...settings,marks};
}

export function pdfRepeatMarkLabel(mark){
 return [mark.repeatStart?'𝄆':null,mark.repeatEnd?'𝄇':null,mark.ending?`${mark.ending}.`:null,
  ({segno:'Segno',coda:'Coda',toCoda:'To Coda',fine:'Fine'})[mark.marker],
  NAV_COMMANDS.find(([key])=>key===mark.command)?.[1],({single:'│',double:'‖',final:'𝄂'})[mark.endBarline]].filter(Boolean).join(' · ');
}
