import ko from '../i18n/locales/ko.js';
import {compileScoreDocument} from './scoreDocument.js';
import {TUNING,validateEtude} from './notationData.js';

const grip=(name,shape,bass)=>({name,frets:[...shape].map(f=>f==='x'?null:Number(f)),bass});
export const LIGHT_STAYS_VOICINGS={
 EmLow:grip('Em','022000',6),EmG:grip('Em','022003',6),EmPassing:grip('Em(add9)','022002',6),
 C:grip('C','x32010',5),G:grip('G','320003',6),DFs:grip('D/F♯','2x0232',6),Am:grip('Am','x02210',5),
 Dsus:grip('Dsus4','xx0233',4),D:grip('D','xx0232',4),Bsus:grip('B7sus4','x22202',5),B7:grip('B7','x21202',5),
 CHigh:grip('C','x35553',5),DHigh:grip('D','x57775',5),EmHigh:grip('Em','x79987',5),
 Bm7:grip('Bm7','x24232',5),AmHigh:grip('Am','577555',6),
};
const pairs=[
 ['EmLow','EmG'],['C','C'],['Am','Am'],['Bsus','B7'],
 ['EmG','EmPassing'],['C','C'],['G','DFs'],['EmLow','EmLow'],['Am','C'],['Dsus','D'],['C','Am'],['Bsus','B7'],
 ['EmG','DHigh'],['EmHigh','EmHigh'],['EmHigh','DHigh'],['CHigh','Bm7'],['AmHigh','G'],['Dsus','D'],['C','Am'],['Bsus','B7'],
 ['EmG','EmPassing'],['C','C'],['G','DFs'],['EmLow','EmLow'],['Am','C'],['Dsus','D'],['Bsus','B7'],['EmG','EmLow'],
 ['C','C'],['Am','Bsus'],['B7','B7'],['EmLow','EmLow'],
];
// Reviewed position changes: lift for the final sixteenth (208 ms at 72 BPM).
// Open strings can ring until that lift; no old grip is carried across the shift.
export const LIGHT_STAYS_SHIFTS=new Set(['13:0','13:1','15:0','15:1','16:0','16:1','17:0']);
const melodyLevels=[.72,.72,.73,.76,.80,.78,.80,.77,.79,.82,.78,.81,.87,.94,.94,.90,.88,.86,.83,.85,.84,.82,.80,.78,.77,.77,.78,.74,.71,.69,.68,.64];
const id='E-light-stays',title='빛이 머무는 자리';
const sections={0:'INTRO',4:'A ×2',12:'CHORUS ×2',20:'A′',28:'ENDING'};
function makeBar(pair,bar){
 const events=[],number=bar+1,chorus=number>=13&&number<=20,level=melodyLevels[bar];
 const emit=(voice,onset,duration,strings,shape,extra={})=>{
  const eventId=`${id}:${bar}:${events.length}`,rest=!strings.length;
  const event={id:eventId,voice,onset,duration,rest,technique:null,notes:strings.map((string,i)=>({id:`${eventId}:${i}`,string,fret:shape.frets[6-string],locked:true})),...extra};
  events.push(event);return event;
 };
 if(number===32){
  const shape=LIGHT_STAYS_VOICINGS.EmLow;
  emit('melody',0,'1',[1],shape,{velocity:level,releaseTail:1.6});
  emit('accompaniment',0,'1',[6,3,2],shape,{velocity:level*.72,releaseTail:1.6});
 }else pair.forEach((name,half)=>{
  const shape=LIGHT_STAYS_VOICINGS[name],start=half*960,shift=LIGHT_STAYS_SHIFTS.has(`${number}:${half}`),end=start+(shift?840:960);
  const melody={velocity:level,dampAtEnd:true,...(number>=5&&number<=12?{velocityByPass:[level,Math.min(.95,level+.065)]}:{})};
  if(shift){
   // A quarter tied to a dotted eighth sustains 1¾ beats; the rest makes the
   // position change visible in both staff and TAB instead of hiding an audio gate.
   const first=emit('melody',start,'4',[1],shape,melody);
   const continuation=emit('melody',start+480,'8',[1],shape,{...melody,dotted:true});
   first.tieTo=continuation.id;
   emit('melody',end,'16',[],shape);
  }else emit('melody',start,'2',[1],shape,melody);
  const pattern=chorus?[[shape.bass],[3,2],[4],[3,2]]:[[shape.bass],[3],[2],[4]];
  pattern.forEach((strings,index)=>{
   const onset=start+index*240,short=shift&&index===3;
   // Each string rings only to its next attack or to the grip release, whichever
   // comes first. Mid voices stay below the independently accented melody.
   const next=pattern.findIndex((later,j)=>j>index&&later.some(s=>strings.includes(s)));
   const release=next<0?end:Math.min(end,start+next*240);
   emit('accompaniment',onset,short?'16':'8',strings,shape,{velocity:level*(index===0?.72:chorus?.58:.49),sustainTicks:release-onset,dampAtEnd:true});
   if(short)emit('accompaniment',end,'16',[],shape);
  });
 });
 events.sort((a,b)=>a.onset-b.onset||(a.voice==='melody'?-1:1));
 const names=pair.map(k=>LIGHT_STAYS_VOICINGS[k].name);
 return {id:`${id}:bar:${bar}`,chord:null,harmony:names[0]===names[1]?names[0]:names.join(' → '),
  sketchVoicings:pair.map((key,half)=>({name:LIGHT_STAYS_VOICINGS[key].name,frets:LIGHT_STAYS_VOICINGS[key].frets,startTick:half*960,endTick:(half+1)*960})),
  events,...(sections[bar]?{sectionLabel:sections[bar]}:{}),...([4,12].includes(bar)?{repeatStart:true}:{}),...([11,19].includes(bar)?{repeatEnd:true}:{}),...(bar===31?{endBarline:'final'}:{})};
}
export const lightStaysDocument={
 format:'fretiva.etude',version:2,id,templateId:'light-stays',kind:'builtin',origin:{templateId:'light-stays',revision:1},title,english:title,
 purpose:'2박 멜로디 아래에서 반주가 움직이는 E단조 소품. 개방현의 주제에서 높은 후렴으로 올라갔다가 Em으로 돌아옵니다.',
 tips:[
  '32마디 기보, 도돌이 포함 48마디·2분 40초. 1–4 → 5–12 ×2 → 13–20 ×2 → 21–32 순서로 한 번 연주합니다.',
  '위쪽 리듬은 1번 줄 멜로디, 아래쪽 리듬은 반주입니다. 같은 세로 위치의 음은 동시에 시작하며 각 성부가 독립적으로 4박입니다.',
  '13·15·16마디 양쪽 2박 구간과 17마디 앞 2박은 끝의 16분쉼표 동안 이동합니다. 붙임줄의 같은 음은 다시 뜯지 않습니다.',
  'B7sus4의 4번 줄 2프렛을 B7의 1프렛으로 바꿉니다. Dsus4→D는 1번 줄 3→2프렛입니다.',
  '멜로디를 가장 또렷하게, 베이스는 부드럽게, 가운데 반주는 작게 연주합니다. 두 번째 A파트에서는 멜로디를 조금 강조합니다.',
  '코드 전환 때 이전 운지의 잔음을 정리합니다. 마지막 네 개방현 화음은 4박을 센 뒤 자연스럽게 사라지도록 둡니다.',
  '표준 튜닝 E–A–D–G–B–E, 카포 없음. TAB 숫자는 프렛이며 손가락 번호가 아닙니다.',
 ],
 instrument:'guitar',tuning:[...TUNING],capo:0,bpm:72,meter:[4,4],keySignature:'Em',
 viewSettings:{tabRhythm:true,notationView:'tab'},playback:{repeatCount:1},measures:pairs.map(makeBar),
};
const result=compileScoreDocument(lightStaysDocument,{root:'E',level:ko['etudes.intermediate'],style:ko['etudes.ballad'],type:ko['etudes.arpeggios'],lesson:1005,trackLesson:12,difficultyReason:'중급 · 개방현과 3–9프렛 하이코드, 독립된 멜로디 유지와 포지션 이동을 연습합니다.'});
const errors=[...result.errors,...result.issues,...(result.score?validateEtude(result.score):[])];
if(!result.score||errors.length)throw Error(`${title}: ${errors.join(', ')}`);
export const lightStays={...result.score,edited:false,pedagogy:{objective:lightStaysDocument.purpose,prerequisites:[],preparation:'하이코드 전환을 먼저 느린 속도로 확인하고, 멜로디와 반주를 따로 연습합니다.',instructions:lightStaysDocument.tips[1],keyBars:[],links:[],checks:['두 도돌이를 각각 두 번 연주합니다.','이동 직전의 쉼표와 B7의 레♯를 확인합니다.','48마디 연주 후 마지막 잔향을 듣습니다.'],tempo:{start:54,target:72},review:'인트로·주제·후렴·복귀·종지를 연결합니다.'}};
