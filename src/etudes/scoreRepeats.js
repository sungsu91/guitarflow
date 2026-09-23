import { formatMessage } from "../i18n/format.js";
import ko from "../i18n/locales/ko.js";
import {repeatStructure,navigationIssues,navigationOrder} from './scoreNavigation.js';
import {validateMiniChordRepeatEdit} from '../mini-chord/notationValidation.js';

export const repeatMarks=score=>score.document?.measures??score.repeatMarks??[];

export function repeatIssues(measures) {
 const issues=[];
 measures.forEach((m,i)=>{for(const key of ['repeatStart','repeatEnd'])if(m[key]!==undefined&&typeof m[key]!=='boolean')issues.push(formatMessage(ko["etudes.barValueCheckTheRepeatMarkingFormat"], { value1: i+1 }));});
 const structure=repeatStructure(measures);
 issues.push(...structure.issues,...navigationIssues(measures));
 if(!issues.length)try{navigationOrder(measures,structure.blocks);}catch(error){issues.push(error.message);}
 return issues;
}

export function setScoreRepeat(document,bar,action) {
 if(!document.measures[bar])return document;
 const measures=document.measures.map(m=>({...m})),current=measures[bar];
 const marks=Object.fromEntries(measures.map((m,i)=>[i,m]));
 const change=(type,enabled)=>{
  const result=validateMiniChordRepeatEdit({barCount:measures.length,barIndex:bar,type,enabled,marks});
  // Removing a mark is always allowed in a draft. Keep the other boundary
  // untouched and report the incomplete pair before completed save/playback.
  if(enabled&&!result.valid)throw Error(result.message);
  const key=type==='start'?'repeatStart':'repeatEnd';
  if(enabled)current[key]=true;else delete current[key];
 };
 if(action==='clear'){
  if(current.repeatEnd)change('end',false);
  if(current.repeatStart)change('start',false);
  delete current.ending;delete current.marker;delete current.command;
  delete current.markerIndex;delete current.targetIndex;
 }else if(action==='start'||action==='end')change(action,!current[action==='start'?'repeatStart':'repeatEnd']);
 else return document;
 // A start without its end is editable; contradictory or nested ranges are not.
 const adding=action==='start'?current.repeatStart:action==='end'?current.repeatEnd:false;
 const conflict=adding&&repeatIssues(measures).find(issue=>issue.includes(ko["etudes.nestedRepeat"]));
 if(conflict)throw Error(conflict);
 return {...document,measures};
}

// Expand playback visits only. Written measures, IDs, onsets and durations stay
// untouched. Repeat endings and navigation share the same performed route.
export function scoreBarOrder(score) {
 if(score.practiceRange){const {start,end}=score.practiceRange;if(Number.isInteger(start)&&Number.isInteger(end)&&start>=0&&end>=start&&end<score.measures.length)return Array.from({length:end-start+1},(_,i)=>start+i);}
 const marks=repeatMarks(score),issues=repeatIssues(marks);
 if(issues.length)throw Error(issues[0]);
 return navigationOrder(score.measures.map((_,i)=>marks[i]??{}),repeatStructure(marks).blocks);
}
