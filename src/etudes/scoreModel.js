import {soundingMidi,maxFret,HARMONICS} from './scoreTuning.js';
import {measureMeters} from './scoreMeters.js';
import {SCORE_INSTRUMENTS,scoreInstrument} from './scoreInstruments.js';
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
 const d=structuredClone(input);
 if(d.version===2)return d;
 if(d.version!==1||d.format!=='fretiva.etude')throw Error('지원하지 않는 악보 파일입니다.');
 d.version=2;d.id=`copy-${d.templateId}`;d.origin={templateId:d.templateId,revision:1};d.kind='user';d.meter=[4,4];d.tuning=[...TUNING];d.keySignature='C';
 d.measures.forEach((bar,b)=>{bar.id=`${d.id}:bar:${b}`;let onset=0;bar.events.forEach((e,i)=>{e.id=`${bar.id}:event:${i}`;e.onset=onset;onset+=ticksOf(e);e.notes.forEach((n,j)=>{n.id=`${e.id}:tone:${j}`;n.locked=true;});});});
 return d;
}
export function createBlankDocument(){return {format:'fretiva.etude',version:2,id:newId('score'),templateId:'custom',kind:'user',origin:null,viewSettings:{tabRhythm:true,notationView:'tab'},title:'새 악보',english:'Untitled Study',purpose:'직접 입력한 악보',tips:[],bpm:60,meter:[4,4],keySignature:'C',instrument:'guitar',tuning:[...TUNING],measures:[blankMeasure()]};}
export function copyDocument(source){const d=structuredClone(source);d.id=newId('score');d.kind='user';d.title=`${d.title} · 복사`;return d;}
export function cloneMeasures(measures){const result=structuredClone(measures),ids=new Map();result.forEach(m=>{m.id=newId('bar');m.events.forEach(e=>{const old=e.id;e.id=newId('event');ids.set(old,e.id);e.notes.forEach(n=>{n.id=newId('tone');});});});result.forEach(m=>m.events.forEach(e=>{if(e.tieTo)e.tieTo=ids.get(e.tieTo)??`outside-copy:${e.tieTo}`;if(e.tuplet?.groupId)e.tuplet.groupId=ids.get(e.tuplet.groupId)??e.tuplet.groupId;}));return result;}
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
 compileStats.bars++;
 const errors=[],issues=[],events=[];let end=0;
 const capacity=d.meter[0]*1920/d.meter[1];
 if(!Array.isArray(bar.events)||!bar.events.length||bar.events.length>64)return {errors:['마디에 1–64개의 음표/쉼표가 필요합니다.'],issues,events};
 for(const e of bar.events){
  if(!e.id||!['1','2','4','8','16',...(isBlankEvent(e)?['32']:[])].includes(e.duration)||!Number.isInteger(e.onset)||e.onset<0||!Array.isArray(e.notes)||e.notes.length>128){errors.push('음표 ID·시점·길이·동시음을 확인하세요.');continue;}
  if(e.dotted!=null&&(typeof e.dotted!=='boolean'||(e.dotted&&Boolean(e.tuplet))))errors.push('점음표와 셋잇단음표를 함께 적용할 수 없습니다.');
  if(e.tuplet&&(e.tuplet.actualNotes!==3||e.tuplet.normalNotes!==2||!['8','16'].includes(e.duration)))errors.push(`${e.id}: 지원 연음은 8분·16분음표의 3:2입니다.`);
  if(e.onset!==end)issues.push(`${e.id}: ${e.onset<end?'앞 음과 겹침':'입력되지 않은 박'} (${e.onset/TICKS}박 시작)`);
  end=Math.max(end,e.onset+ticksOf(e));
  if(!e.rest&&(!e.notes.length||new Set(e.notes.filter(n=>!n.unplaced).map(n=>n.string)).size!==e.notes.filter(n=>!n.unplaced).length))errors.push(`${e.id}: 같은 줄 중복 또는 빈 음표`);
  const tones=e.notes.map(n=>{if(n.unplaced&&Number.isInteger(n.midi)&&n.midi>=0&&n.midi<=127)return {...n,pitch:pitchForMidi(n.midi,d.keySignature,n.spelling,d.instrument)};if(!Number.isInteger(n.string)||n.string<1||n.string>d.tuning.length||!Number.isInteger(n.fret)||n.fret<0||n.fret+(d.capo??0)>maxFret(d)){errors.push(`${e.id}: 줄 1–${d.tuning.length}, 프렛 0–24를 입력하세요.`);return null;}if(n.dead!=null&&typeof n.dead!=='boolean')errors.push(`${e.id}: 줄별 뮤트음 값은 true/false입니다.`);if(n.harmonic&&!NATURAL_HARMONICS[n.fret])errors.push(`${e.id}: 자연 하모닉스 위치를 확인하세요.`);const midi=soundingMidi(d,n);return {...n,dead:Boolean(n.dead??e.dead),midi,pitch:pitchForMidi(midi,d.keySignature,n.spelling,d.instrument)};}).filter(Boolean);
  if(e.beamBefore!=null&&!['auto','join','break'].includes(e.beamBefore))errors.push(`${e.id}: 빔 설정을 확인하세요.`);
  if(e.dead!=null&&typeof e.dead!=='boolean')errors.push(`${e.id}: 뮤트음 값은 true/false입니다.`);
  if(e.palmMute!=null&&typeof e.palmMute!=='boolean')errors.push(`${e.id}: 팜 뮤트 설정은 true/false입니다.`);
  if(e.vibrato!=null&&typeof e.vibrato!=='boolean')errors.push(`${e.id}: 비브라토 설정을 확인하세요.`);
  if(e.arpeggio!=null&&!['up','down'].includes(e.arpeggio))errors.push(`${e.id}: 아르페지오 방향을 확인하세요.`);
  if(e.technique&&!['H','P','S'].includes(e.technique))errors.push(`${e.id}: 지원하지 않는 연결 주법`);
  if(e.notes.some(n=>n.finger!=null&&![1,2,3,4].includes(n.finger)||n.rightFinger!=null&&!['p','i','m','a'].includes(n.rightFinger)))errors.push(`${e.id}: 손가락 기호를 확인하세요.`);
  if(e.pickStroke!=null&&!['up','down'].includes(e.pickStroke))errors.push(`${e.id}: 피킹 방향을 확인하세요.`);
  for(const key of ['bend','letRing','ghost','grace'])if(e[key]!=null)issues.push(`${e.id}: ${key}는 현재 표시·재생을 지원하지 않습니다. 입력 데이터는 보존합니다.`);
  events.push({...e,...(tones[0]??{string:1,fret:0,midi:d.tuning[0],pitch:pitchForMidi(d.tuning[0],d.keySignature,undefined,d.instrument)}),id:e.id,...(tones.length>1?{tones}:{}),rest:Boolean(e.rest),duration:e.duration,technique:e.technique??null});
 }
 for(const group of tupletGroups(bar.events)){const first=bar.events[group[0]];if(group.length!==3||group.some((index,j)=>bar.events[index].duration!==first.duration||bar.events[index].onset!==first.onset+j*ticksOf(first)))errors.push('셋잇단음표는 같은 길이의 연속된 세 위치로 구성해야 합니다.');}
 for(const group of tupletGroups(bar.events)){if(group.some(i=>isBlankEvent(bar.events[i])))issues.push(`${Math.floor(bar.events[group[0]].onset/TICKS)+1}박: 셋잇단음표 그룹 미완성`);}
 if(end!==capacity)issues.push(`마디 길이 ${end/TICKS} / ${capacity/TICKS}박 (${end>capacity?'초과':'부족'})`);
 if(bar.chord&&(!Array.isArray(bar.chord.frets)||bar.chord.frets.length!==d.tuning.length||bar.chord.frets.some(f=>f!==null&&(!Number.isInteger(f)||f<0||f>24))||typeof bar.chord.name!=='string'))errors.push('코드표의 이름·각 줄 프렛을 확인하세요.');
 if(bar.chord&&(!Array.isArray(bar.chord.fingers)||bar.chord.fingers.length!==d.tuning.length||bar.chord.fingers.some(f=>f!==null&&![1,2,3,4].includes(f))))errors.push('코드표 손가락은 각 줄 각각 1–4 또는 null입니다.');
 if(bar.chord?.barre){const b=bar.chord.barre;if(!Number.isInteger(b.fret)||b.fret<1||b.fret>24||!Number.isInteger(b.from)||!Number.isInteger(b.to)||b.from>d.tuning.length||b.to<1||b.from<=b.to)errors.push('코드표 바레의 프렛과 시작·끝 줄을 확인하세요.');}
 const result={errors,issues,events};cache.set(bar,{context,result});return result;
}
export function compileDocumentV2(d,base={}) {
 const errors=[],issues=[];
 if(d?.capo!=null&&(!Number.isInteger(d.capo)||d.capo<0||d.capo>Math.min(12,maxFret(d))))errors.push('카포 범위를 확인하세요.');
 if(d?.instrument!=null&&!Object.hasOwn(SCORE_INSTRUMENTS,d.instrument))errors.push('지원하지 않는 악기입니다.');
 if(d?.format!=='fretiva.etude'||d.version!==2||!d.id)return {score:null,errors:['악보 형식과 ID를 확인하세요.'],issues};
 if(!Array.isArray(d.tuning)||d.tuning.length!==scoreInstrument(d.instrument).tuning.length||d.tuning.some(v=>!Number.isInteger(v)||v<24||v>88))errors.push('악기에 맞는 줄 수와 각 줄의 MIDI 음높이를 확인하세요.');
 if(!Array.isArray(d.meter)||![2,3,4,6].includes(d.meter[0])||![4,8].includes(d.meter[1]))errors.push('지원 박자: 2·3·4·6 / 4·8');
 if(!Number.isInteger(d.bpm)||d.bpm<30||d.bpm>240)errors.push('BPM은 30–240입니다.');
 if(!['C','G','D','A','E','B','F','Bb','Eb','Ab','Db','Gb','Am','Em','Bm','F#m','C#m','G#m','Dm','Gm','Cm','Fm'].includes(d.keySignature))errors.push('조표를 확인하세요.');
 if(['title','english','purpose'].some(k=>typeof d[k]!=='string'||d[k].length>2000)||!Array.isArray(d.tips)||d.tips.some(t=>typeof t!=='string'))errors.push('제목·설명 형식을 확인하세요.');
 if(!Array.isArray(d.measures)||!d.measures.length||d.measures.length>64)errors.push('악보는 1–64마디입니다.');
 else if(d.measures.some(m=>!m||!Array.isArray(m.events)||m.events.some(e=>!e||typeof e.rest!=='boolean'||!Array.isArray(e.notes)||e.notes.some(n=>!n||typeof n!=='object'))))errors.push('음표·쉼표 구조를 확인하세요.');
 if(errors.length)return {score:null,errors,issues};
 issues.push(...repeatIssues(d.measures));
 const meters=measureMeters(d);
 for(const meter of meters)if(!Array.isArray(meter)||![2,3,4,6].includes(meter[0])||![4,8].includes(meter[1]))errors.push("마디 박자표를 확인하세요.");
 if(errors.length)return {score:null,errors,issues};
 const ids=new Set(),measures=d.measures.map((m,i)=>{for(const id of [m.id,...m.events.flatMap(e=>[e.id,...e.notes.map(n=>n.id)])]){if(!id||ids.has(id))errors.push(`${i+1}마디: 식별자가 없거나 중복됩니다.`);ids.add(id);}const result=compileBar(m,{...d,meter:meters[i]});errors.push(...result.errors.map(s=>`${i+1}마디: ${s}`));issues.push(...result.issues.map(s=>`${i+1}마디: ${s}`));return result.events;});
 measures.forEach((bar,b)=>bar.forEach((e,i)=>{const next=bar[i+1]??measures[b+1]?.[0];if(e.technique&&i===bar.length-1)issues.push(`${b+1}마디 ${i+1}음: 마디 경계를 잇는 H/P/SL 표시는 아직 지원하지 않습니다. 데이터를 보존합니다.`);if(e.technique&&(e.rest||e.tones||!next||next.rest||next.tones||next.string!==e.string||next.fret===e.fret||(e.technique==='H'&&next.fret<e.fret)||(e.technique==='P'&&next.fret>e.fret)))issues.push(`${b+1}마디 ${i+1}음: ${e.technique} 연결 대상을 확인하세요.`);if(e.tieTo&&(!next||next.id!==e.tieTo||e.rest||next.rest||JSON.stringify((e.tones??[e]).map(n=>`${n.string}:${n.midi}`).sort())!==JSON.stringify((next.tones??[next]).map(n=>`${n.string}:${n.midi}`).sort())))issues.push(`${b+1}마디 ${i+1}음: 붙임줄 대상·음높이가 다릅니다.`);}));
 const score=errors.length?null:{...base,id:d.id,templateId:d.templateId,title:d.title||'제목 없음',english:d.english||d.title||'Untitled',purpose:d.purpose,tips:d.tips,bpm:d.bpm,meter:d.meter,tuning:d.tuning,capo:d.capo??0,autoTab:d.autoTab,instrument:d.instrument??'guitar',keySignature:d.keySignature,measures,document:d,edited:true,reviewStatus:'사용자 악보 · 교육 검수 안 됨',chordShapes:d.measures.some(m=>m.chord)?d.measures.map(m=>m.chord):undefined,harmony:d.measures.map(m=>m.chord?.name??m.harmony),accompaniment:Boolean(base.accompaniment),issues};
 return {score,errors,issues};
}

