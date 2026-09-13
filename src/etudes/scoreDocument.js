import {TUNING, spellMidi, parseChord, validateEtude} from './notationData.js';
export const DOCUMENT_FORMAT='fretiva.etude';
export const EDITS_STORAGE_KEY='fretiva.etude.edits.v1';
const copy=value=>structuredClone(value);
const integer=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;

// Portable authoring format: no generated MIDI, staff coordinates or SVG paths.
export function toScoreDocument(score) {
 return {format:DOCUMENT_FORMAT,version:1,templateId:score.templateId,title:score.title,english:score.english,bpm:score.bpm,purpose:score.purpose,tips:[...score.tips],
  measures:score.measures.map((events,i)=>({
   chord:score.chordShapes?{name:score.harmony[i],...copy(score.chordShapes[i])}:null,
   harmony:score.chordShapes?null:score.harmony?.[i]??null,
   events:events.map(n=>({duration:n.duration,rest:Boolean(n.rest),technique:n.technique??null,
    notes:n.rest?[]:(n.tones??[n]).map(t=>({string:t.string,fret:t.fret}))})),
  }))};
}

export function compileScoreDocument(document,base) {
 const errors=[];
 const fail=message=>errors.push(message);
 if(!document||document.format!==DOCUMENT_FORMAT||document.version!==1||document.templateId!==base.templateId)return {score:null,errors:['현재 과제의 악보 파일(version 1)을 선택하세요.']};
 for(const key of ['title','english','purpose'])if(typeof document[key]!=='string'||!document[key].trim()||document[key].length>2000)fail('제목과 연습 설명을 입력하세요.');
 if(!integer(document.bpm,30,240))fail('BPM은 30–240 사이의 정수입니다.');
 if(!Array.isArray(document.tips)||document.tips.length>30||document.tips.some(t=>typeof t!=='string'||t.length>2000))fail('TIP은 30줄 이내의 문장으로 작성하세요.');
 if(!Array.isArray(document.measures)||document.measures.length<1||document.measures.length>64)return {score:null,errors:[...errors,'악보는 1–64마디로 작성하세요.']};
 const measures=[],chordShapes=[],harmony=[];
 for(const [bar,m] of document.measures.entries()) {
  const prefix=`${bar+1}마디`;
  let chord=null;
  if(base.accompaniment) {
   if(!m?.chord){fail(`${prefix}: 코드표가 필요합니다.`);continue;}
   try{chord=parseChord(m.chord.name);}catch{fail(`${prefix}: 코드명을 확인하세요. 예: C, Am, Bmaj7, D#m, Em7`);continue;}
   const g=m.chord;
   if(!Array.isArray(g.frets)||g.frets.length!==6||g.frets.some(f=>f!==null&&!integer(f,0,24))){fail(`${prefix}: 코드표는 6개 줄에 × 또는 0–24프렛을 입력하세요.`);continue;}
   if(!Array.isArray(g.fingers)||g.fingers.length!==6||g.fingers.some(f=>f!==null&&!integer(f,1,4)))fail(`${prefix}: 손가락은 빈칸 또는 1–4입니다.`);
   if(g.frets.every(f=>f===null))fail(`${prefix}: 코드표에 연주할 줄이 필요합니다.`);
   const pressed=g.frets.filter(f=>f>0),start=g.frets.includes(0)?1:Math.min(...pressed);
   if(pressed.length&&Math.max(...pressed)-start>5)fail(`${prefix}: 코드표는 연속 6프렛 이내로 작성하세요.`);
   g.frets.forEach((f,i)=>{if(f!==null&&!chord.intervals.includes((TUNING[5-i]+f-chord.pc+120)%12))fail(`${prefix}: 코드표 ${6-i}번줄 ${f}프렛은 ${g.name}의 구성음이 아닙니다.`);});
   if(g.barre) {
    const b=g.barre;
    if(!integer(b.fret,1,24)||!integer(b.from,2,6)||!integer(b.to,1,5)||b.from<=b.to)fail(`${prefix}: 바레의 프렛·시작 줄·끝 줄을 확인하세요.`);
    else for(let string=b.to;string<=b.from;string++)if(g.frets[6-string]===null||g.frets[6-string]<b.fret)fail(`${prefix}: 바레와 ${string}번줄의 프렛이 맞지 않습니다.`);
   }
   chordShapes.push({frets:copy(g.frets),fingers:copy(g.fingers??[]),barre:g.barre?copy(g.barre):null});harmony.push(g.name);
  } else if(m?.harmony) {
   try{parseChord(m.harmony);harmony.push(m.harmony);}catch{fail(`${prefix}: 코드명을 확인하세요.`);}
  }
  if(!Array.isArray(m?.events)||m.events.length<1||m.events.length>64){fail(`${prefix}: 음표 또는 쉼표를 1–64개 입력하세요.`);continue;}
  const events=[];
  for(const [i,event] of m.events.entries()) {
   const position=`${prefix} ${i+1}번째`;
   if(!['1','2','4','8','16'].includes(event?.duration)){fail(`${position}: 음표 길이를 선택하세요.`);continue;}
   if(typeof event.rest!=='boolean'){fail(`${position}: 쉼표 상태를 확인하세요.`);continue;}
   if(event.technique!==null&&!['H','P','S'].includes(event.technique)){fail(`${position}: H·P·SL 중 하나를 선택하세요.`);continue;}
   if(event.rest) {
    if(event.technique)fail(`${position}: 쉼표에는 연결 기법을 적용할 수 없습니다.`);
    events.push({rest:true,duration:event.duration,technique:null,string:1,fret:0,midi:64,pitch:spellMidi(64,'C','major')});continue;
   }
   if(!Array.isArray(event.notes)||!event.notes.length||event.notes.length>6){fail(`${position}: 연주할 음을 1–6개 입력하세요.`);continue;}
   const tones=[];
   for(const n of event.notes) {
    if(!n||!integer(n.string,1,6)||!integer(n.fret,0,24)){fail(`${position}: 줄은 1–6, 프렛은 0–24의 정수입니다.`);continue;}
    const midi=TUNING[n.string-1]+n.fret;
    try{tones.push({string:n.string,fret:n.fret,midi,pitch:spellMidi(midi,chord?.root??base.root,chord?.family??(base.keySignature.endsWith('m')?'minor':'major'),!chord&&base.intervals.includes(6))});}
    catch{fail(`${position}: ${n.string}번줄 ${n.fret}프렛이 현재 음계 또는 코드와 맞지 않습니다.`);}
   }
   if(tones.length!==event.notes.length)continue;
   events.push({...tones[0],rest:false,duration:event.duration,technique:event.technique,...(tones.length>1?{tones}:{})});
  }
  measures.push(events);
 }
 if(errors.length)return {score:null,errors:[...new Set(errors)]};
 const score={...base,title:document.title.trim(),english:document.english.trim(),purpose:document.purpose.trim(),bpm:document.bpm,tips:[...document.tips],measures,
  chordShapes:base.accompaniment?chordShapes:undefined,harmony:harmony.length?harmony:undefined,edited:true};
 errors.push(...validateEtude(score));
 return {score:errors.length?null:score,errors:[...new Set(errors)]};
}

export function updateDocumentChordFret(document,bar,string,fret) {
 const next=copy(document),measure=next.measures[bar];
 measure.chord.frets[6-string]=fret;
 if(fret===null||fret===0)measure.chord.fingers[6-string]=null;
 measure.events=measure.events.map(event=>{
  if(event.rest)return event;
  const notes=event.notes.flatMap(n=>n.string!==string?[n]:fret===null?[]:[{...n,fret}]);
  return {...event,notes,rest:notes.length===0,technique:notes.length?event.technique:null};
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
   else errors.push(`${base.title}: 저장된 수정본을 확인하지 못해 기본 악보를 표시합니다.`);
  }
 } catch {errors.push('저장된 악보를 읽지 못했습니다. 기본 악보를 표시합니다.');}
 return {documents,scores,errors};
}

export function persistScoreEdit(storage,base,document) {
 const result=document?compileScoreDocument(document,base):{score:base,errors:[]};
 if(!result.score)return result;
 try {
  const raw=storage.getItem(EDITS_STORAGE_KEY),parsed=raw?JSON.parse(raw):{};
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('invalid store');
  const next={...parsed};
  if(document)next[base.templateId]=document;else delete next[base.templateId];
  storage.setItem(EDITS_STORAGE_KEY,JSON.stringify(next));
  return result;
 } catch{return {score:null,errors:['브라우저에 저장하지 못했습니다. 악보 파일을 내려받아 보관해 주세요.']};}
}
