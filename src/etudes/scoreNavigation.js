import { formatMessage } from "../i18n/format.js";
import ko from "../i18n/locales/ko.js";
import {validateMiniChordMarkerEdit,validateMiniChordCommandEdit} from '../mini-chord/notationValidation.js';

export const SECTION_LABELS=['A','B','C','D','E','F','INT','OUT','VERSE','CHORUS','BRIDGE','SOLO','INTERLUDE'];
export const NAV_MARKERS=[['segno',ko["etudes.segno"],ko["etudes.startOfTheBarToReturnTo"]],['coda',ko["etudes.coda"],ko["etudes.startOfTheBarToPlayAfterTheJump"]],['toCoda','To Coda',ko["etudes.jumpToTheCodaAfterThisBar"]],['fine','Fine',ko["etudes.stopAfterThisBar"]]];
export const NAV_COMMANDS=[['dc','D.C.',ko["audioStudio.goToStart"]],['ds','D.S.',ko["etudes.toSegno"]],['dcAlFine','D.C. al Fine',ko["etudes.returnToTheBeginningAndPlayToFine"]],['dsAlFine','D.S. al Fine',ko["etudes.returnToSegnoAndPlayToFine"]],['dcAlCoda','D.C. al Coda',ko["etudes.returnToTheBeginningThenJumpAtToCoda"]],['dsAlCoda','D.S. al Coda',ko["etudes.returnToSegnoThenJumpAtToCoda"]]];

// One explicit navigation route per score, matching the existing mini-chord
// editor. Validate references again on load; do not normalize away user data.
export function navigationIssues(measures){
 const issues=[],marks=Object.fromEntries(measures.map((m,i)=>[i,m]));
 measures.forEach((m,barIndex)=>{
  if((m.marker&&m.markerIndex!=null&&m.markerIndex!==1)||(m.command&&m.targetIndex!=null&&m.targetIndex!==1))issues.push(formatMessage(ko["etudes.barValueCurrentlyOnlyOneSegnoCodaPairIsSupportedExistingTarget"], { value1: barIndex+1 }));
  if(m.marker){
   if(!NAV_MARKERS.some(([key])=>key===m.marker)){issues.push(formatMessage(ko["etudes.barValueUnsupportedLocationSymbol"], { value1: barIndex+1 }));return;}
   const others={...marks,[barIndex]:{...m,marker:undefined}};
   const result=validateMiniChordMarkerEdit({barCount:measures.length,barIndex,marker:m.marker,marks:others});
   if(!result.valid)issues.push(formatMessage(ko["etudes.barValueValue"], { value1: barIndex+1, value2: result.message }));
  }
  if(m.command){
   if(!NAV_COMMANDS.some(([key])=>key===m.command)){issues.push(formatMessage(ko["etudes.barValueUnsupportedJumpInstruction"], { value1: barIndex+1 }));return;}
   const others={...marks,[barIndex]:{...m,command:undefined}};
   const result=validateMiniChordCommandEdit({barCount:measures.length,barIndex,command:m.command,marks:others});
   if(!result.valid)issues.push(formatMessage(ko["etudes.barValueValue"], { value1: barIndex+1, value2: result.message }));
   const target=m.command.startsWith('ds')?measures.findIndex(x=>x.marker==='segno'):0;
   if(m.command.endsWith('Fine')&&measures.findIndex(x=>x.marker==='fine')<target)issues.push(formatMessage(ko["etudes.barValueFineMustBeAfterTheReturnDestination"], { value1: barIndex+1 }));
  }
 });
 if(measures.some(m=>m.marker==='toCoda')&&!measures.some(m=>typeof m.command==='string'&&m.command.endsWith('Coda')))issues.push(ko["etudes.setDCAlCodaOrDSAlCodaToUse"]);
 return issues;
}

export function setScoreNavigation(document,bar,kind,value){
 if(!document.measures[bar])return document;
 if(kind==='ending'&&![0,1,2,3,4,5].includes(value))throw Error(ko["etudes.endingNumbersMustBe15"]);
 if(kind==='marker'&&value&&!NAV_MARKERS.some(([key])=>key===value))throw Error(ko["etudes.checkTheLocationSymbol"]);
 if(kind==='command'&&value&&!NAV_COMMANDS.some(([key])=>key===value))throw Error(ko["etudes.checkTheJumpInstruction"]);
 if(kind==='sectionLabel'&&value&&!SECTION_LABELS.includes(value))throw Error(ko["etudes.checkTheSectionMarking"]);
 if(kind==='endBarline'&&value&&!['single','double','final'].includes(value))throw Error(ko["etudes.checkTheEndBarline"]);
 if(!['marker','command','ending','sectionLabel','endBarline'].includes(kind))return document;
 const measures=document.measures.map((m,i)=>{if(i!==bar)return m;const next={...m};if(!value||next[kind]===value)delete next[kind];else next[kind]=value;if(kind==='marker')delete next.markerIndex;if(kind==='command')delete next.targetIndex;return next;});
 return {...document,measures};
}

// Adjacent equal ending numbers form a volta. A repeat owns its own 1..N set,
// so another repeat later in the score can have its own first/second endings.
export function repeatStructure(measures){
 const blocks=[],issues=[],owned=new Set();let start=null;
 measures.forEach((m,i)=>{if(m.ending!=null&&![1,2,3,4,5].includes(m.ending))issues.push(formatMessage(ko["etudes.barValueEndingNumbersMustBe15"], { value1: i+1 }));});
 for(let i=0;i<measures.length;i++){
  const m=measures[i];
  if(m.repeatStart){if(start!==null)issues.push(formatMessage(ko["etudes.barValueNestedRepeatsAreNotSupportedSetThePreviousRepeatS"], { value1: i+1 }));else start=i;}
  if(!m.repeatEnd)continue;
  if(start===null){issues.push(formatMessage(ko["etudes.barValueARepeatStartBarIsRequired"], { value1: i+1 }));continue;}
  const first=measures.findIndex((x,b)=>b>=start&&b<=i&&x.ending!=null);
  const block={start,end:i,commonEnd:i,endings:[],passes:2};
  if(first>=0){
   block.commonEnd=first-1;
   if(measures.slice(first,i+1).some(x=>x.ending!==1))issues.push(formatMessage(ko["etudes.barValueExtendEnding1ThroughTheRepeatEnd"], { value1: first+1 }));
   block.endings.push({number:1,start:first,end:i});for(let b=first;b<=i;b++)owned.add(b);
   let next=i+1,number=2;
   while(next<measures.length&&measures[next].ending!=null){
    const from=next,current=measures[next].ending;
    while(next<measures.length&&measures[next].ending===current){owned.add(next);next++;}
    if(current!==number)issues.push(formatMessage(ko["etudes.barValueEndingValueIsRequired"], { value1: from+1, value2: number }));
    block.endings.push({number:current,start:from,end:next-1});number++;
   }
   if(block.endings.length<2)issues.push(formatMessage(ko["etudes.barValuePlaceEnding2AfterTheRepeatEnd"], { value1: i+1 }));
   block.passes=block.endings.length;block.end=next-1;
   block.endings.forEach((range,index)=>{
    for(let b=range.start;b<=range.end;b++){
     if(b!==start&&measures[b].repeatStart)issues.push(formatMessage(ko["etudes.barValueARepeatStartCannotBePlacedInsideAnEnding"], { value1: b+1 }));
     const needsEnd=index<block.endings.length-1&&b===range.end;
     if(Boolean(measures[b].repeatEnd)!==needsEnd)issues.push(formatMessage(ko["etudes.barValueValue"], { value1: b+1, value2: needsEnd?ko["etudes.aRepeatEndIsNeededToReturnForTheNextEnding"]:ko["etudes.removeTheRepeatEndFromTheFinalEndingOrFromTheMiddle"] }));
    }
   });
   i=block.end;
  }
  blocks.push(block);start=null;
 }
 if(start!==null)issues.push(formatMessage(ko["etudes.barValueSelectARepeatEndBar"], { value1: start+1 }));
 measures.forEach((m,i)=>{if(m.ending!=null&&!owned.has(i))issues.push(formatMessage(ko["etudes.barValueConnectTheEndingToTheRepeatStartEndSection"], { value1: i+1 }));});
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
 if(bar<measures.length)throw Error(ko["etudes.theRepeatPathDoesNotTerminateCheckTheMarkingPositions"]);
 if(mode==='fine')throw Error(ko["etudes.fineCannotBeReachedAfterReturningCheckItsPosition"]);
 if(mode==='coda')throw Error(ko["etudes.toCodaCannotBeReachedAfterReturningCheckItsPosition"]);
 return order;
}
