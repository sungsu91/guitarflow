import {validateMiniChordMarkerEdit,validateMiniChordCommandEdit} from '../mini-chord/notationValidation.js';

export const SECTION_LABELS=['A','B','C','D','E','F','INT','OUT','VERSE','CHORUS','BRIDGE','SOLO','INTERLUDE'];
export const NAV_MARKERS=[['segno','세뇨','되돌아올 마디의 시작'],['coda','코다','건너뛴 뒤 연주할 마디의 시작'],['toCoda','To Coda','이 마디 연주 후 코다로 이동'],['fine','Fine','이 마디 연주 후 종료']];
export const NAV_COMMANDS=[['dc','D.C.','처음으로'],['ds','D.S.','세뇨로'],['dcAlFine','D.C. al Fine','처음으로 돌아가 Fine까지'],['dsAlFine','D.S. al Fine','세뇨로 돌아가 Fine까지'],['dcAlCoda','D.C. al Coda','처음으로 돌아가 To Coda에서 이동'],['dsAlCoda','D.S. al Coda','세뇨로 돌아가 To Coda에서 이동']];

// One explicit navigation route per score, matching the existing mini-chord
// editor. Validate references again on load; do not normalize away user data.
export function navigationIssues(measures){
 const issues=[],marks=Object.fromEntries(measures.map((m,i)=>[i,m]));
 measures.forEach((m,barIndex)=>{
  if((m.marker&&m.markerIndex!=null&&m.markerIndex!==1)||(m.command&&m.targetIndex!=null&&m.targetIndex!==1))issues.push(`${barIndex+1}마디: 현재는 세뇨·코다 한 쌍을 지원합니다. 기존 대상 번호는 보존됩니다.`);
  if(m.marker){
   if(!NAV_MARKERS.some(([key])=>key===m.marker)){issues.push(`${barIndex+1}마디: 지원하지 않는 위치 기호입니다.`);return;}
   const others={...marks,[barIndex]:{...m,marker:undefined}};
   const result=validateMiniChordMarkerEdit({barCount:measures.length,barIndex,marker:m.marker,marks:others});
   if(!result.valid)issues.push(`${barIndex+1}마디: ${result.message}`);
  }
  if(m.command){
   if(!NAV_COMMANDS.some(([key])=>key===m.command)){issues.push(`${barIndex+1}마디: 지원하지 않는 이동 명령입니다.`);return;}
   const others={...marks,[barIndex]:{...m,command:undefined}};
   const result=validateMiniChordCommandEdit({barCount:measures.length,barIndex,command:m.command,marks:others});
   if(!result.valid)issues.push(`${barIndex+1}마디: ${result.message}`);
   const target=m.command.startsWith('ds')?measures.findIndex(x=>x.marker==='segno'):0;
   if(m.command.endsWith('Fine')&&measures.findIndex(x=>x.marker==='fine')<target)issues.push(`${barIndex+1}마디: Fine은 되돌아갈 위치 뒤에 있어야 합니다.`);
  }
 });
 if(measures.some(m=>m.marker==='toCoda')&&!measures.some(m=>typeof m.command==='string'&&m.command.endsWith('Coda')))issues.push('To Coda를 사용할 D.C. al Coda 또는 D.S. al Coda를 지정하세요.');
 return issues;
}

export function setScoreNavigation(document,bar,kind,value){
 if(!document.measures[bar])return document;
 if(kind==='ending'&&![0,1,2,3,4,5].includes(value))throw Error('엔딩 번호는 1–5입니다.');
 if(kind==='marker'&&value&&!NAV_MARKERS.some(([key])=>key===value))throw Error('위치 기호를 확인하세요.');
 if(kind==='command'&&value&&!NAV_COMMANDS.some(([key])=>key===value))throw Error('이동 명령을 확인하세요.');
 if(kind==='sectionLabel'&&value&&!SECTION_LABELS.includes(value))throw Error('구간 표기를 확인하세요.');
 if(kind==='endBarline'&&value&&!['single','double','final'].includes(value))throw Error('마디 끝 선을 확인하세요.');
 if(!['marker','command','ending','sectionLabel','endBarline'].includes(kind))return document;
 const measures=document.measures.map((m,i)=>{if(i!==bar)return m;const next={...m};if(!value||next[kind]===value)delete next[kind];else next[kind]=value;if(kind==='marker')delete next.markerIndex;if(kind==='command')delete next.targetIndex;return next;});
 return {...document,measures};
}

// Adjacent equal ending numbers form a volta. A repeat owns its own 1..N set,
// so another repeat later in the score can have its own first/second endings.
export function repeatStructure(measures){
 const blocks=[],issues=[],owned=new Set();let start=null;
 measures.forEach((m,i)=>{if(m.ending!=null&&![1,2,3,4,5].includes(m.ending))issues.push(`${i+1}마디: 엔딩 번호는 1–5입니다.`);});
 for(let i=0;i<measures.length;i++){
  const m=measures[i];
  if(m.repeatStart){if(start!==null)issues.push(`${i+1}마디: 중첩 반복은 지원하지 않습니다. 앞 반복 끝을 먼저 지정하세요.`);else start=i;}
  if(!m.repeatEnd)continue;
  if(start===null){issues.push(`${i+1}마디: 반복 시작 마디가 필요합니다.`);continue;}
  const first=measures.findIndex((x,b)=>b>=start&&b<=i&&x.ending!=null);
  const block={start,end:i,commonEnd:i,endings:[],passes:2};
  if(first>=0){
   block.commonEnd=first-1;
   if(measures.slice(first,i+1).some(x=>x.ending!==1))issues.push(`${first+1}마디: 1번 엔딩을 반복 끝까지 이어 지정하세요.`);
   block.endings.push({number:1,start:first,end:i});for(let b=first;b<=i;b++)owned.add(b);
   let next=i+1,number=2;
   while(next<measures.length&&measures[next].ending!=null){
    const from=next,current=measures[next].ending;
    while(next<measures.length&&measures[next].ending===current){owned.add(next);next++;}
    if(current!==number)issues.push(`${from+1}마디: ${number}번 엔딩이 필요합니다.`);
    block.endings.push({number:current,start:from,end:next-1});number++;
   }
   if(block.endings.length<2)issues.push(`${i+1}마디: 반복 끝 다음에 2번 엔딩을 지정하세요.`);
   block.passes=block.endings.length;block.end=next-1;
   block.endings.forEach((range,index)=>{
    for(let b=range.start;b<=range.end;b++){
     if(b!==start&&measures[b].repeatStart)issues.push(`${b+1}마디: 엔딩 안에 반복 시작을 넣을 수 없습니다.`);
     const needsEnd=index<block.endings.length-1&&b===range.end;
     if(Boolean(measures[b].repeatEnd)!==needsEnd)issues.push(`${b+1}마디: ${needsEnd?'다음 엔딩으로 돌아갈 반복 끝이 필요합니다.':'마지막 엔딩 또는 엔딩 중간의 반복 끝을 제거하세요.'}`);
    }
   });
   i=block.end;
  }
  blocks.push(block);start=null;
 }
 if(start!==null)issues.push(`${start+1}마디: 반복 끝 마디를 선택하세요.`);
 measures.forEach((m,i)=>{if(m.ending!=null&&!owned.has(i))issues.push(`${i+1}마디: 엔딩을 반복 시작·끝 구간과 연결하세요.`);});
 return {blocks,issues};
}

// Written events stay immutable. Navigation changes only visits to bars.
// After D.C./D.S., take the final ending and do not repeat the repeat signs.
export function navigationOrder(measures,blocks){
 const order=[],passes=new Map();let bar=0,jumped=false,codaTaken=false,mode='';
 const target=marker=>measures.findIndex(m=>m.marker===marker);
 for(let safety=0;bar<measures.length&&safety<measures.length*20;safety++){
  const block=blocks.find(b=>bar>=b.start&&bar<=b.end),pass=block?(jumped?block.passes:passes.get(block.start)??1):1;
  const ending=block?.endings.find(e=>bar>=e.start&&bar<=e.end);
  if(ending&&ending.number!==pass){bar=block.endings.find(e=>e.number===pass)?.start??block.end+1;continue;}
  const m=measures[bar];order.push(bar);
  if(m.marker==='fine'&&(mode==='fine'||!measures.some(x=>x.command)))return order;
  if(m.marker==='toCoda'&&mode==='coda'&&!codaTaken){bar=target('coda');codaTaken=true;mode='';continue;}
  if(m.command&&!jumped){jumped=true;mode=m.command.endsWith('Fine')?'fine':m.command.endsWith('Coda')?'coda':'';bar=m.command.startsWith('ds')?target('segno'):0;continue;}
  if(block&&(ending?bar===ending.end:bar===block.end)){
   if(pass<block.passes&&!jumped){passes.set(block.start,pass+1);bar=block.start;}
   else bar=block.end+1;
  }else bar++;
 }
 if(bar<measures.length)throw Error('반복 이동 경로가 끝나지 않습니다. 표시 위치를 확인하세요.');
 if(mode==='fine')throw Error('돌아온 경로에서 Fine에 도달할 수 없습니다. 위치를 확인하세요.');
 if(mode==='coda')throw Error('돌아온 경로에서 To Coda에 도달할 수 없습니다. 위치를 확인하세요.');
 return order;
}
