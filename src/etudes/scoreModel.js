import { t as translateUi } from '../i18n/core.js';
import { formatMessage } from "../i18n/format.js";
import ko from "../i18n/locales/ko.js";
import {chordDiagramErrors} from './scoreChordDiagram.js';
import {slidePairs} from './slidePairs.js';
import {soundingMidi,maxFret,HARMONICS} from './scoreTuning.js';
import {measureMeters} from './scoreMeters.js';
import {SCORE_INSTRUMENTS,normalizeInstrumentDocument,scoreInstrument,isFretted,validateInstrumentMidi} from './scoreInstruments.js';
import {repeatIssues} from './scoreRepeats.js';
export const NATURAL_HARMONICS=HARMONICS;
import {TUNING, NATURAL, MAJOR, MINOR, spellMidi} from './notationData.js';
export function midiAtStaffStep(step,key='C',instrument='guitar') {
 const profile=scoreInstrument(instrument),d=profile.staffBottom+step,letter='CDEFGAB'[((d%7)+7)%7],octave=Math.floor(d/7)-profile.octaveShift,root=key[0],tonic=NATURAL[root]+(key[1]==='#'?1:key[1]==='b'?-1:0),degree=('CDEFGAB'.indexOf(letter)-'CDEFGAB'.indexOf(root)+7)%7;
 const pc=(tonic+(key.endsWith('m')?MINOR:MAJOR)[degree]+12)%12,alter=(pc-NATURAL[letter]+18)%12-6;return (octave+1)*12+NATURAL[letter]+alter;
}
export const TICKS=480;
export const newId=(kind='id')=>`${kind}-${globalThis.crypto.randomUUID()}`;
export const ticksOf=event=>1920/Number(event.duration)*(event.dotted?1.5:1)*(event.tuplet?event.tuplet.normalNotes/event.tuplet.actualNotes:1);
export function tupletGroups(events){const groups=[];let group=[];for(let i=0;i<events.length;i++){const t=events[i].tuplet,previous=events[group.at(-1)]?.tuplet;if(!t||group.length===3||previous?.groupId!==t.groupId){if(group.length)groups.push(group);group=[];}if(t)group.push(i);}if(group.length)groups.push(group);return groups;}
export const isBlankEvent=e=>e.blank===true&&e.rest&&e.notes.length===0;
export const blankEvent=(onset=0,duration='4')=>({id:newId('event'),onset,duration,rest:true,blank:true,technique:null,notes:[]});
export const blankMeasure=(meter=[4,4])=>({id:newId('bar'),chord:null,harmony:null,events:Array.from({length:meter[0]},(_,i)=>blankEvent(i*1920/meter[1],String(meter[1])))});
// Editable drafts may contain invalid values, but their container structure must
// remain safe for the retained form controls. Preserve unreadable files verbatim.
export const hasEditableShape=d=>Boolean(d&&typeof d.id==='string'&&['title','english','purpose'].every(k=>typeof d[k]==='string')&&Array.isArray(d.tuning)&&d.tuning.length===scoreInstrument(d.instrument).tuning.length&&Array.isArray(d.meter)&&d.meter.length===2&&Array.isArray(d.tips)&&Array.isArray(d.measures)&&d.measures.length&&d.measures.every(m=>m&&Array.isArray(m.events)&&m.events.length&&(!m.chord||(Array.isArray(m.chord.frets)&&Array.isArray(m.chord.fingers)))&&m.events.every(e=>e&&Array.isArray(e.notes)&&e.notes.every(n=>n&&typeof n==='object'))));
export function upgradeDocument(input) {
 const d=normalizeInstrumentDocument(structuredClone(input));
 if(d.version===2)return d;
 if(d.version!==1||d.format!=='fretiva.etude')throw Error(ko["etudes.thisScoreFileIsNotSupported"]);
 d.version=2;d.id=`copy-${d.templateId}`;d.origin={templateId:d.templateId,revision:1};d.kind='user';d.meter=[4,4];d.tuning=[...TUNING];d.keySignature='C';
 d.measures.forEach((bar,b)=>{bar.id=`${d.id}:bar:${b}`;let onset=0;bar.events.forEach((e,i)=>{e.id=`${bar.id}:event:${i}`;e.onset=onset;onset+=ticksOf(e);e.notes.forEach((n,j)=>{n.id=`${e.id}:tone:${j}`;n.locked=true;});});});
 return d;
}
export function createBlankDocument(){return {format:'fretiva.etude',version:2,id:newId('score'),templateId:'custom',kind:'user',origin:null,viewSettings:{tabRhythm:true,notationView:'tab'},title:translateUi("etudes.newScore"),english:'Untitled Study',purpose:translateUi("etudes.manuallyEnteredScore"),tips:[],bpm:60,meter:[4,4],keySignature:'C',instrument:'guitar',tuning:[...TUNING],measures:[blankMeasure()]};}
export function copyDocument(source){const d=structuredClone(source);d.id=newId('score');d.kind='user';d.title=translateUi("etudes.valueCopy", { value1: d.title });return d;}
export function cloneMeasures(measures){const result=structuredClone(measures),ids=new Map();result.forEach(m=>{m.id=newId('bar');m.events.forEach(e=>{const old=e.id;e.id=newId('event');ids.set(old,e.id);e.notes.forEach(n=>{n.id=newId('tone');});});});result.forEach(m=>m.events.forEach(e=>{if(e.tieTo)e.tieTo=ids.get(e.tieTo)??`outside-copy:${e.tieTo}`;if(e.slurTo)e.slurTo=ids.get(e.slurTo)??null;if(e.tuplet?.groupId)e.tuplet.groupId=ids.get(e.tuplet.groupId)??e.tuplet.groupId;}));return result;}
export function cloneMeasure(m){return cloneMeasures([m])[0];}
export function patchEvent(d,bar,index,patch){const measures=[...d.measures],events=[...measures[bar].events];events[index]=typeof patch==='function'?patch(events[index]):{...events[index],...patch};measures[bar]={...measures[bar],events};return {...d,measures};}
// Structural sharing for the retained properties panel, which mutates a clone.
export function shareUnchanged(previous,next){if(previous===next)return previous;if(!previous||!next||typeof previous!=='object'||typeof next!=='object')return next;let equal=Object.keys(previous).length===Object.keys(next).length;const result=Array.isArray(next)?[]:{};for(const key of Object.keys(next)){result[key]=shareUnchanged(previous[key],next[key]);if(result[key]!==previous[key])equal=false;}return equal?previous:result;}
export function guitarPitchForMidi(midi,keySignature='C',spelling) {
 const octave=Math.floor(midi/12)-1,pc=(midi%12+12)%12;
 if(spelling&&NATURAL[spelling.letter]!==undefined&&[-1,0,1].includes(spelling.alter)){
  const o=(midi-NATURAL[spelling.letter]-spelling.alter)/12-1;
  if(Number.isInteger(o))return {letter:spelling.letter,alter:spelling.alter,octave:o,key:`${spelling.letter.toLowerCase()}${spelling.alter===1?'#':spelling.alter===-1?'b':''}/${o+1}`};
 }
 try{return spellMidi(midi,keySignature.replace(/m$/,''),keySignature.endsWith('m')?'minor':'major');}catch{
  const names=keySignature.includes('b')||['F','Dm','Gm','Cm','Fm'].includes(keySignature)?['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B']:['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];const name=names[pc];return {letter:name[0],alter:name[1]==='#'?1:name[1]==='b'?-1:0,octave,key:`${name.toLowerCase()}/${octave+1}`};
 }
}
export function pitchForMidi(midi,keySignature='C',spelling,instrument='guitar'){const p=guitarPitchForMidi(midi,keySignature,spelling);return {...p,key:p.key.replace(/\/(-?\d+)$/,`/${p.octave+scoreInstrument(instrument).octaveShift}`)};}
export function fingeringCandidates(midi,tuning=TUNING){return tuning.flatMap((open,i)=>Number.isInteger(midi-open)&&midi-open>=0&&midi-open<=24?[{string:i+1,fret:midi-open}]:[]);}
export function moveSamePitch(note,direction,tuning=TUNING){const candidates=fingeringCandidates(tuning[note.string-1]+note.fret,tuning).filter(n=>direction>0?n.string>note.string:n.string<note.string).sort((a,b)=>Math.abs(a.string-note.string)-Math.abs(b.string-note.string));return candidates[0]?{...note,...candidates[0],locked:true}:note;}
// No invented Guitar Pro optimizer: preserve the current string when possible;
// ambiguous new pitches require an explicit candidate choice in the palette.
export function pitchCandidates(note,midi,tuning=TUNING){return fingeringCandidates(midi,tuning).sort((a,b)=>(a.string===note?.string?-1:b.string===note?.string?1:0));}
const cache=new WeakMap();
export const compileStats={bars:0};
function compileBar(bar,d) {
 const context=JSON.stringify([d.tuning,d.keySignature,d.meter,d.instrument,d.capo]);const found=cache.get(bar);if(found?.context===context)return found.result;
 if(d.instrument==='piano'&&bar.events.some(e=>e.voice)){
  const errors=[],issues=[],byId=new Map();
  if(bar.events.some(e=>!['left','right'].includes(e.voice)||e.notes.some(n=>n.hand!==e.voice)))errors.push(ko["etudes.checkThePianoVoicesAndHandAssignments"]);
  for(const hand of ['right','left']){
   const result=compileBar({...bar,events:bar.events.filter(e=>e.voice===hand).map(({voice,...e})=>e)},d);
   errors.push(...result.errors);issues.push(...result.issues);
   result.events.forEach(e=>byId.set(e.id,{...e,voice:hand}));
  }
  const result={errors,issues,events:bar.events.map(e=>byId.get(e.id)).filter(Boolean)};cache.set(bar,{context,result});return result;
 }
 compileStats.bars++;
 const errors=[],issues=[],events=[];let end=0;
 const capacity=d.meter[0]*1920/d.meter[1];
 if(!Array.isArray(bar.events)||!bar.events.length||bar.events.length>64)return {errors:[ko["etudes.eachBarNeeds164NotesOrRests"]],issues,events};
 for(const e of bar.events){
  if(!e.id||!['1','2','4','8','16',...(isBlankEvent(e)?['32']:[])].includes(e.duration)||!Number.isInteger(e.onset)||e.onset<0||!Array.isArray(e.notes)||e.notes.length>128){errors.push(ko["etudes.checkNoteIdsOnsetsDurationsAndSimultaneousNotes"]);continue;}
  if(e.dotted!=null&&(typeof e.dotted!=='boolean'||(e.dotted&&Boolean(e.tuplet))))errors.push(ko["etudes.dottedNotesAndTripletsCannotBeAppliedTogether"]);
  if(e.tuplet&&(e.tuplet.actualNotes!==3||e.tuplet.normalNotes!==2||!['8','16'].includes(e.duration)))errors.push(formatMessage(ko["etudes.valueSupportedTupletsAre32EighthOrSixteenthNoteTriplets"], { value1: e.id }));
  if(e.onset!==end)issues.push(formatMessage(ko["etudes.valueValueStartsOnBeatValue"], { value1: e.id, value2: e.onset<end?ko["etudes.overlapsThePreviousNote"]:ko["etudes.unfilledBeat"], value3: e.onset/TICKS }));
  end=Math.max(end,e.onset+ticksOf(e));
  if(!e.rest&&(!e.notes.length||new Set(e.notes.filter(n=>!n.unplaced).map(n=>isFretted(d.instrument)?n.string:n.midi)).size!==e.notes.filter(n=>!n.unplaced).length))errors.push(formatMessage(ko["etudes.valueDuplicateStringOrEmptyNote"], { value1: e.id }));
  if(!isFretted(d.instrument)){if(e.letRing||e.slideOut||e.slideIn||e.notes.some(n=>n.bendEffect||n.parenthesized)||e.technique||e.pickStroke||e.palmMute||e.vibrato||e.dead||e.arpeggio||e.notes.some(n=>n.harmonic||n.dead||n.string!=null||n.fret!=null))errors.push(ko["etudes.stringsFretsAndGuitarTechniquesCannotBeAppliedToKeyboardOrDrums"]);if(e.notes.some(n=>n.hand!=null&&!['left','right'].includes(n.hand)))errors.push(ko["etudes.chooseLeftOrRightHand"]);if(d.instrument==='drums'&&e.tieTo)errors.push(ko["etudes.tiesAreNotAppliedToDrums"]);}
  const tones=e.notes.map(n=>{if(!isFretted(d.instrument)){try{validateInstrumentMidi(d.instrument,n.midi);}catch(error){errors.push(error.message);return null;}return {...n,string:n.midi+1,fret:0,pitch:pitchForMidi(n.midi,d.keySignature,n.spelling,d.instrument)};}if(n.unplaced&&Number.isInteger(n.midi)&&n.midi>=0&&n.midi<=127)return {...n,pitch:pitchForMidi(n.midi,d.keySignature,n.spelling,d.instrument)};if(!Number.isInteger(n.string)||n.string<1||n.string>d.tuning.length||!Number.isInteger(n.fret)||n.fret<0||n.fret+(d.capo??0)>maxFret(d)){errors.push(formatMessage(ko["etudes.valueEnterString1ValueAndFret024"], { value1: e.id, value2: d.tuning.length }));return null;}if(n.dead!=null&&typeof n.dead!=='boolean')errors.push(formatMessage(ko["etudes.valuePerStringMutedNoteValuesMustBeTrueFalse"], { value1: e.id }));if(n.harmonic&&!NATURAL_HARMONICS[n.fret])errors.push(formatMessage(ko["etudes.valueCheckTheNaturalHarmonicPosition"], { value1: e.id }));const midi=soundingMidi(d,n);return {...n,dead:Boolean(n.dead??e.dead),midi,pitch:pitchForMidi(midi,d.keySignature,n.spelling,d.instrument)};}).filter(Boolean);
  if(e.beamBefore!=null&&!['auto','join','break'].includes(e.beamBefore))errors.push(formatMessage(ko["etudes.valueCheckTheBeamSettings"], { value1: e.id }));
  if(e.dead!=null&&typeof e.dead!=='boolean')errors.push(formatMessage(ko["etudes.valueTheMutedNoteValueMustBeTrueFalse"], { value1: e.id }));
  if(e.palmMute!=null&&typeof e.palmMute!=='boolean')errors.push(formatMessage(ko["etudes.valuePalmMuteMustBeTrueFalse"], { value1: e.id }));
  if(e.vibrato!=null&&typeof e.vibrato!=='boolean')errors.push(formatMessage(ko["etudes.valueCheckTheVibratoSetting"], { value1: e.id }));
  if(e.arpeggio!=null&&!['up','down'].includes(e.arpeggio))errors.push(formatMessage(ko["etudes.valueCheckTheArpeggioDirection"], { value1: e.id }));
  if(e.slideIn!=null&&!['up','down'].includes(e.slideIn))errors.push(ko["etudes.checkTheSlideInDirection"]);
  if(e.slurTo!=null&&typeof e.slurTo!=='string')errors.push(formatMessage(ko["etudes.valueCheckTheSlurTarget"], { value1: e.id }));
  if(e.technique&&!['H','P','S'].includes(e.technique))errors.push(formatMessage(ko["etudes.valueUnsupportedConnectingTechnique"], { value1: e.id }));
  if(e.notes.some(n=>n.finger!=null&&![1,2,3,4].includes(n.finger)||n.rightFinger!=null&&!['p','i','m','a'].includes(n.rightFinger)))errors.push(formatMessage(ko["etudes.valueCheckTheFingeringSymbol"], { value1: e.id }));
  if(e.pickStroke!=null&&!['up','down'].includes(e.pickStroke))errors.push(formatMessage(ko["etudes.valueCheckThePickingDirection"], { value1: e.id }));
  if(e.letRing!=null&&typeof e.letRing!=='boolean')errors.push(ko["etudes.checkTheOpenTieSetting"]);
  if(e.slideOut!=null&&!['up','down'].includes(e.slideOut))errors.push(ko["etudes.checkTheSlideOutDirection"]);
  for(const n of e.notes){if(n.parenthesized!=null&&typeof n.parenthesized!=='boolean')errors.push(ko["etudes.checkTheParenthesizedNoteSetting"]);if(n.bendEffect&&(![.5,1,2].includes(n.bendEffect.amount)||!['up','hold','release','up-release','prebend'].includes(n.bendEffect.phase)))errors.push(ko["etudes.checkTheBendIntervalAndShape"]);if(n.bendEffect&&(n.dead||e.dead||n.harmonic))errors.push(ko["etudes.bendsCannotBeAppliedToMutedNotesOrNaturalHarmonics"]);}
  for(const key of ['bend','ghost','grace'])if(e[key]!=null)issues.push(formatMessage(ko["etudes.valueDisplayAndPlaybackOfValueAreNotCurrentlySupportedInputData"], { value1: e.id, value2: key }));
  events.push({...e,...(tones[0]??{string:1,fret:0,midi:d.tuning[0]??60,pitch:pitchForMidi(d.tuning[0]??60,d.keySignature,undefined,d.instrument)}),id:e.id,...(tones.length>1||d.instrument==='drums'&&tones.length?{tones}:{}),rest:Boolean(e.rest),duration:e.duration,technique:e.technique??null});
 }
 for(const group of tupletGroups(bar.events)){const first=bar.events[group[0]];if(group.length!==3||group.some((index,j)=>bar.events[index].duration!==first.duration||bar.events[index].onset!==first.onset+j*ticksOf(first)))errors.push(ko["etudes.tripletsMustConsistOfThreeConsecutivePositionsOfEqualDuration"]);}
 for(const group of tupletGroups(bar.events)){if(group.some(i=>isBlankEvent(bar.events[i])))issues.push(formatMessage(ko["etudes.beatValueIncompleteTripletGroup"], { value1: Math.floor(bar.events[group[0]].onset/TICKS)+1 }));}
 if(end!==capacity)issues.push(formatMessage(ko["etudes.barLengthValueValueBeatsValue"], { value1: end/TICKS, value2: capacity/TICKS, value3: end>capacity?ko["etudes.tooLong"]:ko["etudes.tooShort"] }));
 if(bar.chord&&(!Array.isArray(bar.chord.frets)||bar.chord.frets.length!==d.tuning.length||bar.chord.frets.some(f=>f!==null&&(!Number.isInteger(f)||f<0||f>24))||typeof bar.chord.name!=='string'))errors.push(ko["etudes.checkTheChordDiagramNameAndFretForEachString"]);
 if(bar.chord&&(!Array.isArray(bar.chord.fingers)||bar.chord.fingers.length!==d.tuning.length||bar.chord.fingers.some(f=>f!==null&&![1,2,3,4].includes(f))))errors.push(ko["etudes.chordDiagramFingerNumbersMustBe14OrNullForEach"]);
 if(bar.chord?.barre){const b=bar.chord.barre;if(!Number.isInteger(b.fret)||b.fret<1||b.fret>24||!Number.isInteger(b.from)||!Number.isInteger(b.to)||b.from>d.tuning.length||b.to<1||b.from<=b.to)errors.push(ko["etudes.checkTheChordDiagramSBarreFretAndStartEndStrings"]);}
 errors.push(...chordDiagramErrors(bar.chord,d.tuning.length,capacity,maxFret(d)-(d.capo??0)));
 const result={errors,issues,events};cache.set(bar,{context,result});return result;
}
export function compileDocumentV2(d,base={}) {
 d=normalizeInstrumentDocument(d);
 const errors=[],issues=[];
 if(!isFretted(d?.instrument)&&d?.capo)errors.push(ko["etudes.aCapoCannotBeAppliedToKeyboardOrDrumScores"]);
 if(d?.capo!=null&&(!Number.isInteger(d.capo)||d.capo<0||d.capo>Math.min(12,maxFret(d))))errors.push(ko["etudes.checkTheCapoRange"]);
 if(d?.instrument!=null&&!Object.hasOwn(SCORE_INSTRUMENTS,d.instrument))errors.push(ko["etudes.thisInstrumentIsNotSupported"]);
 if(d?.format!=='fretiva.etude'||d.version!==2||!d.id)return {score:null,errors:[ko["etudes.checkTheScoreFormatAndId"]],issues};
 if(!Array.isArray(d.tuning)||d.tuning.length!==scoreInstrument(d.instrument).tuning.length||d.tuning.some(v=>!Number.isInteger(v)||v<24||v>88))errors.push(ko["etudes.checkTheStringCountAndEachStringSMidiPitchForThis"]);
 if(!Array.isArray(d.meter)||![2,3,4,6].includes(d.meter[0])||![4,8].includes(d.meter[1]))errors.push(ko["etudes.supportedMeters234648"]);
 if(!Number.isInteger(d.bpm)||d.bpm<30||d.bpm>240)errors.push(ko["etudes.bpmMustBe30240"]);
 if(!['C','G','D','A','E','B','F','Bb','Eb','Ab','Db','Gb','Am','Em','Bm','F#m','C#m','G#m','Dm','Gm','Cm','Fm'].includes(d.keySignature))errors.push(ko["etudes.checkTheKeySignature"]);
 if(['title','english','purpose'].some(k=>typeof d[k]!=='string'||d[k].length>2000)||!Array.isArray(d.tips)||d.tips.some(t=>typeof t!=='string'))errors.push(ko["etudes.checkTheTitleAndDescriptionFormat"]);
 if(!Array.isArray(d.measures)||!d.measures.length||d.measures.length>64)errors.push(ko["etudes.theScoreMustContain164BarsScoremodel"]);
 else if(d.measures.some(m=>!m||!Array.isArray(m.events)||m.events.some(e=>!e||typeof e.rest!=='boolean'||!Array.isArray(e.notes)||e.notes.some(n=>!n||typeof n!=='object'))))errors.push(ko["etudes.checkTheNoteAndRestStructure"]);
 if(errors.length)return {score:null,errors,issues};
 issues.push(...repeatIssues(d.measures));
 const slurEvents=d.measures.flatMap(m=>m.events),slurPositions=new Map(slurEvents.map((e,i)=>[e.id,i]));
 slurEvents.forEach((e,i)=>{if(!e.slurTo)return;const end=slurPositions.get(e.slurTo);if(end===undefined||end<=i||slurEvents.slice(i,end+1).some(n=>n.rest))issues.push(ko["etudes.checkTheSlurSStartingAndEndingNotes"]);});
 const meters=measureMeters(d);
 for(const meter of meters)if(!Array.isArray(meter)||![2,3,4,6].includes(meter[0])||![4,8].includes(meter[1]))errors.push(ko["etudes.checkTheBarSTimeSignature"]);
 if(errors.length)return {score:null,errors,issues};
 const ids=new Set(),measures=d.measures.map((m,i)=>{for(const id of [m.id,...m.events.flatMap(e=>[e.id,...e.notes.map(n=>n.id)])]){if(!id||ids.has(id))errors.push(formatMessage(ko["etudes.barValueMissingOrDuplicateIdentifier"], { value1: i+1 }));ids.add(id);}const result=compileBar(m,{...d,meter:meters[i]});errors.push(...result.errors.map(s=>formatMessage(ko["etudes.barValueValue"], { value1: i+1, value2: s })));issues.push(...result.issues.map(s=>formatMessage(ko["etudes.barValueValue"], { value1: i+1, value2: s })));return result.events;});
 measures.forEach((bar,b)=>bar.forEach((e,i)=>{const next=e.voice?bar.slice(i+1).find(n=>n.voice===e.voice)??measures[b+1]?.find(n=>n.voice===e.voice):bar[i+1]??measures[b+1]?.[0];if(e.technique&&i===bar.length-1)issues.push(formatMessage(ko["etudes.barValueNoteValueHPSlConnectionsAcrossBarlinesAreNot"], { value1: b+1, value2: i+1 }));if(e.technique&&(e.technique==='S'?(!slidePairs(e,next).length||next.onset!==e.onset+ticksOf(e)):(e.rest||e.tones||!next||next.rest||next.tones||next.string!==e.string||next.fret===e.fret||(e.technique==='H'&&next.fret<e.fret)||(e.technique==='P'&&next.fret>e.fret))))issues.push(formatMessage(ko["etudes.barValueNoteValueCheckTheValueConnectionTarget"], { value1: b+1, value2: i+1, value3: e.technique }));if(e.tieTo&&(!next||next.id!==e.tieTo||e.rest||next.rest||JSON.stringify((e.tones??[e]).map(n=>`${n.string}:${n.midi}`).sort())!==JSON.stringify((next.tones??[next]).map(n=>`${n.string}:${n.midi}`).sort())))issues.push(formatMessage(ko["etudes.barValueNoteValueTieTargetOrPitchMismatch"], { value1: b+1, value2: i+1 }));}));
 const score=errors.length?null:{...base,id:d.id,templateId:d.templateId,title:d.title||ko["etudes.untitled"],english:d.english||d.title||'Untitled',purpose:d.purpose,tips:d.tips,bpm:d.bpm,meter:d.meter,tuning:d.tuning,capo:d.capo??0,autoTab:d.autoTab,instrument:d.instrument??'guitar',keySignature:d.keySignature,measures,document:d,edited:true,reviewStatus:ko["etudes.userScoreNotReviewedForTeaching"],chordShapes:d.measures.some(m=>m.chord)?d.measures.map(m=>m.chord):undefined,harmony:d.measures.map(m=>m.chord?.name??m.harmony),accompaniment:Boolean(base.accompaniment),issues};
 return {score,errors,issues};
}
