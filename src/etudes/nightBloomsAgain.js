import ko from '../i18n/locales/ko.js';
import {compileScoreDocument} from './scoreDocument.js';
import {TUNING,validateEtude} from './notationData.js';

// Arrays are in string order 6→1, including two-digit frets; bass is a string.
const grip=(name,frets,bass)=>({name,frets,bass});
export const NIGHT_BLOOMS_VOICINGS={
 AmLow:grip('Am',[null,0,2,2,1,0],5),C:grip('C',[null,3,2,0,1,0],5),
 CE:grip('C/E',[null,3,2,0,1,0],4),G:grip('G',[3,2,0,0,0,3],6),
 F:grip('F',[null,null,3,2,1,1],4),DmF:grip('Dm/F',[null,null,3,2,3,1],4),
 EsusLow:grip('E7sus4',[0,2,0,2,3,0],6),E7Low:grip('E7',[0,2,0,1,3,0],6),
 AmMid:grip('Am',[null,0,7,5,5,5],5),AmHigh:grip('Am',[null,0,10,9,10,8],5),
 Em7High:grip('Em7',[null,7,9,7,8,7],5),FMid:grip('F',[null,8,7,5,6,5],5),
 CMid:grip('C',[null,3,5,5,5,3],5),DmMid:grip('Dm',[null,5,7,7,6,5],5),
 EsusHigh:grip('E7sus4',[null,7,9,7,10,7],5),E7High:grip('E7',[null,7,9,7,9,7],5),
 GHigh:grip('G',[null,10,12,12,12,10],5),CHigh:grip('C',[8,10,10,9,8,8],6),
 FHigh:grip('F',[null,8,10,10,10,8],5),B7High:grip('B7',[7,9,7,8,7,7],6),
 AmPeak:grip('Am',[null,0,14,14,13,12],5),
};
export const NIGHT_BLOOMS_PLAN=[
 ['AmLow','AmLow','I'],['CE','G','I'],['F','DmF','I'],['EsusLow','E7Low','I'],
 ['AmLow','AmLow','V'],['CE','G','V'],['F','C','V'],['DmF','E7Low','V'],
 ['AmLow','C','V'],['F','DmF','V'],['G','C','V'],['EsusLow','E7Low','V'],
 ['F','F','U'],['G','G','U'],['AmMid','AmMid','U'],['EsusHigh','E7High','U'],
 ['AmHigh','AmHigh','L'],['Em7High','Em7High','H'],['FMid','CMid','H'],['DmMid','E7High','H'],
 ['AmHigh','GHigh','H'],['CHigh','Em7High','H'],['FMid','DmMid','H'],['EsusHigh','E7High','H'],
 ['AmMid','Em7High','U'],['FHigh','CHigh','U'],['B7High','B7High','U'],['Em7High','E7High','U'],
 ['AmHigh','AmHigh','L'],['Em7High','Em7High','H'],['FMid','CMid','H'],['DmMid','E7High','H'],
 ['AmHigh','GHigh','H'],['AmPeak','AmPeak','L'],['FHigh','E7High','H'],['AmMid','AmMid','H'],
 ['F','C','U'],['DmF','E7Low','U'],['AmLow','AmLow','U','V'],['AmLow','AmLow','FINAL'],
];
// One-based bar : zero-based half. Only the last accompaniment attack is
// shortened to a sixteenth plus a sixteenth rest, freeing the grip for travel.
// The independent melody continues; L never re-plucks its high note on beat 3.
export const NIGHT_BLOOMS_SHIFTS=new Set([
 '15:1','18:1','19:0','19:1','20:0','21:0','21:1','22:1','23:1','24:1','25:0',
 '30:1','31:0','31:1','32:0','33:0','33:1','34:1','35:1','36:1',
]);
const levels=[
 .33,.34,.35,.36,.52,.53,.54,.55,.56,.57,.58,.60,.62,.66,.70,.74,
 .80,.79,.78,.80,.83,.81,.79,.82,.66,.69,.73,.77,
 .87,.87,.89,.91,.94,1,.87,.78,.64,.57,.51,.45,
];
const sections={0:'INTRO',4:'A',12:'BUILD',16:'CHORUS ×2',24:'BRIDGE',28:'FINAL CHORUS',36:'ENDING'};
const id='A-night-blooms-again',title='다시 피어나는 밤';

function makeBar(plan,bar){
 const [a,b,pattern,secondPattern=pattern]=plan,number=bar+1,events=[],level=levels[bar];
 const emit=(voice,onset,duration,strings,shape,extra={})=>{
  const eventId=`${id}:${bar}:${events.length}`,rest=!strings.length;
  const notes=strings.map((string,i)=>{
   const fret=shape.frets[6-string];
   if(!Number.isInteger(fret))throw Error(`${title}: ${number}마디 ${string}번 줄 운지 오류`);
   return {id:`${eventId}:${i}`,string,fret,locked:true};
  });
  const event={id:eventId,...(voice?{voice}:{}),onset,duration,rest,technique:null,notes,...extra};
  events.push(event);return event;
 };
 const expression=(ratio=1)=>({velocity:level*ratio,...(number>=17&&number<=24?{velocityByPass:[level*ratio,(level+.045)*ratio]}:{})});
 if(pattern==='FINAL'){
  const shape=NIGHT_BLOOMS_VOICINGS.AmLow;
  emit('melody',0,'1',[2],shape,{...expression(),releaseTail:1.8});
  emit('accompaniment',0,'1',[5,4,3],shape,{...expression(.6),releaseTail:1.8});
 }else{
  if(pattern==='L')emit('melody',0,'1',[1],NIGHT_BLOOMS_VOICINGS[a],{...expression(),dampAtEnd:true});
  [a,b].forEach((name,half)=>{
   const shape=NIGHT_BLOOMS_VOICINGS[name],kind=half?secondPattern:pattern,start=half*960;
   const shift=NIGHT_BLOOMS_SHIFTS.has(`${number}:${half}`),end=start+(shift?840:960);
   if(kind==='I'){
    // A single voice preserves the requested eighth/eighth/quarter rhythm.
    [[shape.bass,'8'],[3,'8'],[2,'4']].forEach(([string,duration],i)=>{
     const onset=start+i*240;
     emit(null,onset,duration,[string],shape,{...expression(i===2?1:i===0?.65:.48),sustainTicks:start+960-onset,dampAtEnd:true});
    });
    return;
   }
   if(kind!=='L')emit('melody',start,'2',[kind==='V'?2:1],shape,{...expression(),dampAtEnd:true});
   const attacks=kind==='V'?[[shape.bass],[4],[3],[4]]:
    kind==='U'?[[shape.bass],[3],[2],[4]]:[[shape.bass],[3,2],[4],[3,2]];
   attacks.forEach((strings,i)=>{
    const onset=start+i*240,short=shift&&i===3;
    const next=attacks.findIndex((later,j)=>j>i&&later.some(s=>strings.includes(s)));
    const release=next<0?end:Math.min(end,start+next*240);
    emit('accompaniment',onset,short?'16':'8',strings,shape,{
     ...expression(i===0?.70:(kind==='H'||kind==='L')?.43:.39),sustainTicks:release-onset,dampAtEnd:true,
    });
    if(short)emit('accompaniment',end,'16',[],shape);
   });
  });
 }
 events.sort((a,b)=>a.onset-b.onset||(a.voice==='melody'?-1:1));
 // The practice score omits expression text; velocities retain the full arc.
 const names=[a,b].map(key=>NIGHT_BLOOMS_VOICINGS[key].name);
 return {id:`${id}:bar:${bar}`,chord:null,harmony:names[0]===names[1]?names[0]:names.join(' → '),
  sketchVoicings:[a,b].map((key,half)=>({name:NIGHT_BLOOMS_VOICINGS[key].name,frets:NIGHT_BLOOMS_VOICINGS[key].frets,startTick:half*960,endTick:(half+1)*960})),
  events,...(sections[bar]?{sectionLabel:sections[bar]}:{}),
  ...(number===17?{repeatStart:true}:{}),...(number===24?{repeatEnd:true}:{}),...(number===40?{endBarline:'final'}:{}),
 };
}
export const nightBloomsAgainDocument={
 format:'fretiva.etude',version:2,id,templateId:'night-blooms-again',kind:'builtin',origin:{templateId:'night-blooms-again',revision:1},
 title,english:title,purpose:'낮은 2번 줄 선율에서 시작해 후렴의 높은 도를 펼치고, 마지막 후렴의 높은 미에서 정점에 이르는 A단조 핑거스타일.',
 tips:[
  '40마디 기보, 후렴 도돌이 포함 48마디·2분 40초. 1–16 → 17–24 ×2 → 25–40 순서로 한 번 연주합니다.',
  '1–4마디 I는 8분·8분·4분입니다. 5–12마디 V는 2번 줄 멜로디를 2박 유지하며 1번 줄을 연주하지 않습니다.',
  '13마디부터 1번 줄로 올라갑니다. 17·29·34마디는 높은 음을 첫 박에 한 번만 뜯고 4박 유지합니다.',
  '멜로디를 가장 또렷하게, 베이스는 그 아래에, 가운데 반주는 한 단계 작게 연주합니다. 같은 세로 위치의 음은 동시에 시작합니다.',
  '큰 이동 직전에는 반주의 마지막 음을 16분음표로 줄이고 16분쉼표 동안 손을 옮깁니다. 위의 멜로디는 계속 연결합니다.',
  'E7sus4→E7: 낮은 포지션은 3번 줄 2→1, 높은 포지션은 2번 줄 10→9입니다. 28마디는 2번 줄 8→9로 솔→솔♯을 들려줍니다.',
  'Am높음과 Am정점의 베이스는 5번 줄 개방현입니다. 34마디는 12–14프렛에서 곡의 정점을 만들고 천천히 힘을 내려놓습니다.',
  '반주는 다음 같은 줄의 타격 또는 운지 해제까지 자연스럽게 울립니다. 코드 경계를 넘어 이전 운지의 음을 억지로 유지하지 않습니다.',
  '마지막 화음은 5·4·3·2번 줄만 함께 울립니다. 1번 줄을 추가하지 않고 4박 뒤 잔향을 남깁니다.',
  '표준 튜닝 E–A–D–G–B–E, 카포 없음. TAB 숫자는 프렛이며 손가락 번호가 아닙니다.',
 ],
 instrument:'guitar',tuning:[...TUNING],capo:0,bpm:72,meter:[4,4],keySignature:'Am',
 viewSettings:{tabRhythm:true,notationView:'tab'},playback:{repeatCount:1},measures:NIGHT_BLOOMS_PLAN.map(makeBar),
};
const result=compileScoreDocument(nightBloomsAgainDocument,{root:'A',level:ko['etudes.intermediate'],style:ko['etudes.fingerstyle'],type:ko['etudes.arpeggios'],lesson:1006,trackLesson:13,difficultyReason:'중급 이상 · 독립된 멜로디 유지, 12–14프렛 하이코드, 개방현 베이스와 큰 포지션 이동.'});
const errors=[...result.errors,...result.issues,...(result.score?validateEtude(result.score):[])];
if(!result.score||errors.length)throw Error(`${title}: ${errors.join(', ')}`);
export const nightBloomsAgain={...result.score,edited:false,pedagogy:{
 objective:nightBloomsAgainDocument.purpose,prerequisites:[],preparation:'느린 속도에서 중·고음역 운지를 연결하고 33→34마디의 이동을 따로 연습합니다.',
 instructions:nightBloomsAgainDocument.tips[1],keyBars:[],links:[],
 checks:['1–12마디에서 1번 줄을 아껴 둡니다.','17·29·34마디의 긴 선율을 다시 뜯지 않습니다.','34마디를 가장 크게, 40마디를 낮고 부드럽게 마무리합니다.'],
 tempo:{start:54,target:72},review:'낮은 도입·상승·두 번의 후렴·연결부·마지막 정점·엔딩을 하나의 흐름으로 연결합니다.',
}};
