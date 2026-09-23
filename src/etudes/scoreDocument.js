import { formatMessage } from "../i18n/format.js";
import ko from "../i18n/locales/ko.js";
import {TUNING, spellMidi, parseChord, validateEtude} from './notationData.js';
import {compileDocumentV2,upgradeDocument} from './scoreModel.js';
export {upgradeDocument} from './scoreModel.js';
export function toScoreDocument(score) {
 if(score.document)return upgradeDocument(score.document);
 const d={...upgradeDocument(legacyDocument(score)),keySignature:score.keySignature??'C',meter:score.meter??[4,4],tuning:score.tuning??[...TUNING]};
 d.measures.forEach((m,b)=>m.events.forEach((e,i)=>e.notes.forEach((n,j)=>{const p=(score.measures[b][i].tones??[score.measures[b][i]])[j].pitch;n.spelling={letter:p.letter,alter:p.alter};})));
 return d;
}
export function compileScoreDocument(document,base,options={}) {
 return document?.version===2?compileDocumentV2(document,base,options):compileLegacyDocument(document,base);
}
export const DOCUMENT_FORMAT='fretiva.etude';
export const EDITS_STORAGE_KEY='fretiva.etude.edits.v1';
const copy=value=>structuredClone(value);
const integer=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;

// Portable authoring format: no generated MIDI, staff coordinates or SVG paths.
function legacyDocument(score) {
 return {format:DOCUMENT_FORMAT,version:1,templateId:score.templateId,title:score.title,english:score.english,bpm:score.bpm,purpose:score.purpose,tips:[...score.tips],
  measures:score.measures.map((events,i)=>({
   chord:score.chordShapes?{name:score.harmony[i],...copy(score.chordShapes[i])}:null,
   harmony:score.chordShapes?null:score.harmony?.[i]??null,
   events:events.map(n=>({duration:n.duration,rest:Boolean(n.rest),technique:n.technique??null,
    notes:n.rest?[]:(n.tones??[n]).map(t=>({string:t.string,fret:t.fret}))})),
  }))};
}

function compileLegacyDocument(document,base) {
 const errors=[];
 const fail=message=>errors.push(message);
 if(!base||!document||document.format!==DOCUMENT_FORMAT||document.version!==1||document.templateId!==base.templateId)return {score:null,errors:[ko["etudes.chooseAVersion1ScoreFileForTheCurrentExercise"]]};
 for(const key of ['title','english','purpose'])if(typeof document[key]!=='string'||!document[key].trim()||document[key].length>2000)fail(ko["etudes.enterATitleAndPracticeDescription"]);
 if(!integer(document.bpm,30,240))fail(ko["etudes.bpmMustBeAWholeNumberFrom30To240"]);
 if(!Array.isArray(document.tips)||document.tips.length>30||document.tips.some(t=>typeof t!=='string'||t.length>2000))fail(ko["etudes.keepTipsWithin30Lines"]);
 if(!Array.isArray(document.measures)||document.measures.length<1||document.measures.length>64)return {score:null,errors:[...errors,ko["etudes.theScoreMustContain164Bars"]]};
 const measures=[],chordShapes=[],harmony=[];
 for(const [bar,m] of document.measures.entries()) {
  const prefix=formatMessage(ko["etudes.barValue1"], { value1: bar+1 });
  let chord=null;
  if(base.accompaniment) {
   if(!m?.chord){fail(formatMessage(ko["etudes.valueAChordDiagramIsRequired"], { value1: prefix }));continue;}
   try{chord=parseChord(m.chord.name);}catch{fail(formatMessage(ko["etudes.valueCheckTheChordNameExamplesCAmBmaj7DMEm7"], { value1: prefix }));continue;}
   const g=m.chord;
   if(!Array.isArray(g.frets)||g.frets.length!==6||g.frets.some(f=>f!==null&&!integer(f,0,24))){fail(formatMessage(ko["etudes.valueEnterOrFret024ForEachOfTheSixStrings"], { value1: prefix }));continue;}
   if(!Array.isArray(g.fingers)||g.fingers.length!==6||g.fingers.some(f=>f!==null&&!integer(f,1,4)))fail(formatMessage(ko["etudes.valueFingerNumbersMustBeBlankOr14"], { value1: prefix }));
   if(g.frets.every(f=>f===null))fail(formatMessage(ko["etudes.valueTheChordDiagramMustIncludeAStringToPlay"], { value1: prefix }));
   const pressed=g.frets.filter(f=>f>0),start=g.frets.includes(0)?1:Math.min(...pressed);
   if(pressed.length&&Math.max(...pressed)-start>5)fail(formatMessage(ko["etudes.valueKeepTheChordDiagramWithinSixConsecutiveFrets"], { value1: prefix }));
   g.frets.forEach((f,i)=>{if(f!==null&&!chord.intervals.includes((TUNING[5-i]+f-chord.pc+120)%12))fail(formatMessage(ko["etudes.valueStringValueFretValueInTheChordDiagramIsNotA"], { value1: prefix, value2: 6-i, value3: f, value4: g.name }));});
   if(g.barre) {
    const b=g.barre;
    if(!integer(b.fret,1,24)||!integer(b.from,2,6)||!integer(b.to,1,5)||b.from<=b.to)fail(formatMessage(ko["etudes.valueCheckTheBarreFretAndItsStartAndEndStrings"], { value1: prefix }));
    else for(let string=b.to;string<=b.from;string++)if(g.frets[6-string]===null||g.frets[6-string]<b.fret)fail(formatMessage(ko["etudes.valueTheBarreDoesNotMatchTheFretOnStringValue"], { value1: prefix, value2: string }));
   }
   chordShapes.push({frets:copy(g.frets),fingers:copy(g.fingers??[]),barre:g.barre?copy(g.barre):null});harmony.push(g.name);
  } else if(m?.harmony) {
   try{parseChord(m.harmony);harmony.push(m.harmony);}catch{fail(formatMessage(ko["etudes.valueCheckTheChordName"], { value1: prefix }));}
  }
  if(!Array.isArray(m?.events)||m.events.length<1||m.events.length>64){fail(formatMessage(ko["etudes.valueEnter164NotesOrRests"], { value1: prefix }));continue;}
  const events=[];
  for(const [i,event] of m.events.entries()) {
   const position=formatMessage(ko["etudes.valueItemValue"], { value1: prefix, value2: i+1 });
   if(!['1','2','4','8','16'].includes(event?.duration)){fail(formatMessage(ko["etudes.valueChooseANoteDuration"], { value1: position }));continue;}
   if(typeof event.rest!=='boolean'){fail(formatMessage(ko["etudes.valueCheckTheRestSetting"], { value1: position }));continue;}
   if(event.technique!==null&&!['H','P','S'].includes(event.technique)){fail(formatMessage(ko["etudes.valueChooseHPOrSl"], { value1: position }));continue;}
   if(event.rest) {
    if(event.technique)fail(formatMessage(ko["etudes.valueConnectingTechniquesCannotBeAppliedToRests"], { value1: position }));
    events.push({rest:true,duration:event.duration,technique:null,string:1,fret:0,midi:64,pitch:spellMidi(64,'C','major')});continue;
   }
   if(!Array.isArray(event.notes)||!event.notes.length||event.notes.length>6){fail(formatMessage(ko["etudes.valueEnter16NotesToPlay"], { value1: position }));continue;}
   const tones=[];
   for(const n of event.notes) {
    if(!n||!integer(n.string,1,6)||!integer(n.fret,0,24)){fail(formatMessage(ko["etudes.valueStringMustBeAnIntegerFrom1To6FretFrom"], { value1: position }));continue;}
    const midi=TUNING[n.string-1]+n.fret;
    try{tones.push({string:n.string,fret:n.fret,midi,pitch:spellMidi(midi,chord?.root??base.root,chord?.family??(base.keySignature.endsWith('m')?'minor':'major'),!chord&&base.intervals.includes(6))});}
    catch{fail(formatMessage(ko["etudes.valueStringValueFretValueDoesNotMatchTheCurrentScaleOr"], { value1: position, value2: n.string, value3: n.fret }));}
   }
   if(tones.length!==event.notes.length)continue;
   events.push({...tones[0],rest:false,duration:event.duration,technique:event.technique,...(tones.length>1?{tones}:{})});
  }
  measures.push(events);
 }
 if(errors.length)return {score:null,errors:[...new Set(errors)]};
 const score={...base,title:document.title.trim(),english:document.english.trim(),purpose:document.purpose.trim(),bpm:document.bpm,tips:[...document.tips],measures,
  chordShapes:base.accompaniment?chordShapes:undefined,harmony:harmony.length?harmony:undefined,document:undefined,edited:true};
 errors.push(...validateEtude(score));
 return {score:errors.length?null:score,errors:[...new Set(errors)]};
}

export function updateDocumentChordFret(document,bar,string,fret) {
 const next=copy(document),measure=next.measures[bar];
 measure.chord.frets[document.tuning.length-string]=fret;
 if(measure.chord.blankStrings)measure.chord.blankStrings=measure.chord.blankStrings.filter(s=>s!==string);
 if(fret>0&&measure.chord.fretWindow)measure.chord.fretWindow={start:Math.min(fret,measure.chord.fretWindow.start),end:Math.max(fret,measure.chord.fretWindow.end)};
 if(fret===null||fret===0)measure.chord.fingers[document.tuning.length-string]=null;
 measure.events=measure.events.map(event=>{
  if(event.rest)return event;
  const notes=event.notes.flatMap(n=>{if(n.string!==string)return [n];if(fret===null)return [];const changed={...n,fret,locked:true};delete changed.spelling;return [changed];});
  return {...event,notes,rest:notes.length===0,blank:notes.length===0,technique:notes.length?event.technique:null};
 });
 return next;
}

export function readScoreEdits(storage,bases) {
 const documents={},scores={},errors=[];
 try {
  const raw=storage.getItem(EDITS_STORAGE_KEY);
  if(!raw)return {documents,scores,errors};
  const parsed=JSON.parse(raw);
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('invalid store');
  for(const base of bases) {
   const doc=parsed[base.templateId];if(!doc)continue;
   const result=compileScoreDocument(doc,base);
   if(result.score){documents[base.templateId]=doc;scores[base.id]=result.score;}
   else errors.push(formatMessage(ko["etudes.valueCouldNotValidateTheSavedRevisionShowingTheDefaultScore"], { value1: base.title }));
  }
 } catch {errors.push(ko["etudes.couldNotReadTheSavedScoreShowingTheDefaultScore"]);}
 return {documents,scores,errors};
}

export function persistScoreEdit(storage,base,document) {
 const result=document?compileScoreDocument(document,base):{score:base,errors:[]};
 if(result.issues?.length)return {score:null,errors:result.issues};
 if(!result.score)return result;
 try {
  const raw=storage.getItem(EDITS_STORAGE_KEY),parsed=raw?JSON.parse(raw):{};
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('invalid store');
  const next={...parsed};
  if(document)next[base.templateId]=document;else delete next[base.templateId];
  storage.setItem(EDITS_STORAGE_KEY,JSON.stringify(next));
  return result;
 } catch{return {score:null,errors:[ko["etudes.couldNotSaveInThisBrowserDownloadTheScoreFileToKeep"]]};}
}
