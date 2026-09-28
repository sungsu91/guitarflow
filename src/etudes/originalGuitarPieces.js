import {lightStays,lightStaysDocument} from './lightStays.js';
import {nightBloomsAgain,nightBloomsAgainDocument} from './nightBloomsAgain.js';
import ko from '../i18n/locales/ko.js';
import {compileScoreDocument} from './scoreDocument.js';
import {TUNING,validateEtude} from './notationData.js';

// Authored grips are 6→1; event notes and tuning use string numbers 1→6.
const grip=(shape,bass,alternateBass)=>({frets:[...shape].map(f=>f==='x'?null:Number(f)),bass,alternateBass});
export const ORIGINAL_GUITAR_VOICINGS={
 moon:{Am:grip('x02210',[5,0]),Dm:grip('xx0231',[4,0]),G:grip('320003',[6,3]),C:grip('x32010',[5,3]),Fmaj7:grip('xx3210',[4,3]),E7:grip('020100',[6,0]),'Am/C':grip('x32210',[5,3])},
 ballad:{C:grip('x32010',[5,3]),'G/B':grip('x20003',[5,2]),Am:grip('x02210',[5,0]),Fmaj7:grip('xx3210',[4,3]),'C/E':grip('x32010',[4,2]),Dm7:grip('xx0211',[4,0]),G7:grip('320001',[6,3]),Em:grip('022000',[6,0]),Cmaj7:grip('x32000',[5,3])},
 pop:{G:grip('320033',[6,3],[4,0]),Em7:grip('022033',[6,0],[4,2]),Cadd9:grip('x32033',[5,3],[4,2]),'G/B':grip('x20033',[5,2],[4,0]),Am7:grip('x02010',[5,0],[4,2]),Dsus4:grip('xx0233',[4,0]),D:grip('xx0232',[4,0],[5,0])},
};

// Each token is one attack. '+' stays in one event with stacked TAB tones.
const K1='B:8 3:8 2:8 1:8 2:8 3:8 2:8 3:8';
const HALF='B:8 3:8 2+1:8 3:8';
const B1='B:4 3:8 2:8 1:4 2:8 3:8';
const P1='B:4 3+2+1:4 A:4 2+1:4';
const twice=`${HALF} ${HALF}`;
const commonTips=[
 '표준 튜닝 E–A–D–G–B–E, 카포 없음, 4/4박자. TAB 숫자는 프렛 번호입니다.',
 '같은 세로 위치의 프렛 숫자는 동시에 연주합니다. 표시된 줄만 울리고 손가락 번호는 표시하지 않습니다.',
 '16마디를 한 번 연주하고 끝납니다. 마지막 음의 잔향을 충분히 들어 주세요.',
];
const pieces=[
 {
  templateId:'moonlight-letter',title:'달빛의 편지',keySignature:'Am',root:'A',bpm:72,voicings:'moon',style:ko['etudes.fingerstyle'],
  purpose:'여린 도입에서 조금 고조되었다가 Am으로 돌아오는 16마디 클래식풍 핑거스타일 소품.',
  tips:['1–8마디는 여리게, 9–12마디는 점차 커지게, 13–16마디는 다시 잦아들게 연주합니다.','1–15마디는 8분음표 8개입니다. 16마디는 B–3–(2+1)–3을 두 번 연주합니다.'],
  chords:['Am','E7','Am','Dm','G','C','Fmaj7','E7','Dm','Am/C','Fmaj7','E7','Am','Dm','E7','Am'],
  patterns:Array.from({length:16},(_,bar)=>bar===15?twice:K1),
  levels:[.55,.55,.55,.55,.55,.55,.55,.55,.62,.68,.75,.82,.64,.59,.54,.48],
  sections:{0:'INT',2:'A',8:'B',12:'A',15:'OUT'},
 },
 {
  templateId:'words-unsent',title:'아직 전하지 못한 말',keySignature:'C',root:'C',bpm:66,voicings:'ballad',style:ko['etudes.ballad'],
  purpose:'1박과 3박을 길게 호흡하며, 내려가는 베이스와 따뜻한 C 화음으로 마무리하는 16마디 어쿠스틱 발라드.',
  tips:['B1은 4분·8분·8분·4분·8분·8분입니다. 9–12마디만 8분음표의 B2를 두 번 사용합니다.','5·12마디 C/E의 베이스는 4번 줄 2프렛입니다. 16마디는 5·3·2·1번 줄을 동시에 울려 온음표로 유지합니다.'],
  chords:['C','G/B','Am','Fmaj7','C/E','Dm7','G7','Cmaj7','Am','Em','Fmaj7','C/E','Dm7','G7','Cmaj7','C'],
  patterns:Array.from({length:16},(_,bar)=>bar===15?'B+3+2+1:1':bar>=8&&bar<=11?twice:B1),
  levels:[.6,.6,.6,.58,.6,.58,.63,.58,.68,.75,.82,.7,.62,.62,.58,.54],
  sections:{0:'A',8:'B',12:'A',15:'OUT'},
 },
 {
  templateId:'open-the-window',title:'창문을 열면',keySignature:'G',root:'G',bpm:96,voicings:'pop',style:ko['components.pop'],
  purpose:'베이스와 높은 화음이 번갈아 걸어가며 Dsus4의 긴장을 G로 풀어내는 16마디 어쿠스틱 팝.',
  tips:['P1은 네 번의 4분음표입니다. 1박의 기본 베이스와 3박의 대체 베이스를 구분합니다.','2·8·15마디는 3박에서 Dsus4→D로 바뀝니다. 1번 줄 3프렛이 2프렛으로 내려옵니다.','12마디 D의 3박은 5번 줄 0프렛입니다. 16마디는 4분·4분·2분이며 마지막 화음의 베이스는 6번 줄 3프렛입니다.','9–12마디는 조금 더 크게 연주하고, 13마디부터 차분하게 마무리합니다.'],
  chords:['G','Dsus4 → D','Em7','Cadd9','G/B','Am7','Cadd9','Dsus4 → D','Em7','Cadd9','G','D','Cadd9','G/B','Dsus4 → D','G'],
  patterns:Array.from({length:16},(_,bar)=>bar===15?'B:4 3+2+1:4 B+3+2+1:2':[1,7,14].includes(bar)?twice:P1),
  levels:[.7,.7,.7,.72,.7,.7,.76,.76,.82,.84,.86,.82,.74,.7,.7,.66],
  sections:{0:'A',8:'B',12:'A',15:'OUT'},
 },
];

function makeDocument(piece){
 const id=`${piece.root}-${piece.templateId}`,voicings=ORIGINAL_GUITAR_VOICINGS[piece.voicings];
 return {
  format:'fretiva.etude',version:2,id,templateId:piece.templateId,kind:'builtin',origin:{templateId:piece.templateId,revision:1},
  // Existing readers use `english` as their display title; keep the authored name.
  title:piece.title,english:piece.title,purpose:piece.purpose,tips:[...piece.tips,...commonTips],
  instrument:'guitar',tuning:[...TUNING],capo:0,bpm:piece.bpm,meter:[4,4],keySignature:piece.keySignature,
  viewSettings:{tabRhythm:true,notationView:'tab'},playback:{repeatCount:1},
  measures:piece.chords.map((harmony,bar)=>{
   const names=harmony.split(' → '),span=1920/names.length,pattern=piece.patterns[bar];
   const sketchVoicings=names.map((name,i)=>{
    const frets=[...voicings[name].frets];
    // D's optional open A is an explicitly requested bass outside xx0232.
    if(pattern.split(' ').includes('A:4')){const [string,fret]=voicings[name].alternateBass;frets[6-string]=fret;}
    return {name,frets,startTick:i*span,endTick:(i+1)*span};
   });
   let onset=0;
   const events=pattern.split(' ').map((token,index)=>{
    const [strings,duration]=token.split(':'),name=names[Math.floor(onset/span)],shape=voicings[name];
    const eventId=`${id}:${bar}:${index}`;
    const notes=strings.split('+').map((string,tone)=>{
     const [s,fret]=string==='B'?shape.bass:string==='A'?shape.alternateBass:[Number(string),shape.frets[6-Number(string)]];
     if(!Number.isInteger(fret))throw Error(`${piece.title}: ${bar+1}마디 ${s}번 줄에 프렛이 없습니다.`);
     return {id:`${eventId}:${tone}`,string:s,fret,locked:true};
    });
    const event={id:eventId,onset,duration,rest:false,technique:null,velocity:piece.levels[bar],notes};
    onset+=1920/Number(duration);return event;
   });
   if(onset!==1920)throw Error(`${piece.title}: ${bar+1}마디의 길이가 4박이 아닙니다.`);
   return {id:`${id}:bar:${bar}`,chord:null,harmony,sketchVoicings,events,...(piece.sections[bar]?{sectionLabel:piece.sections[bar]}:{}),...(bar===15?{endBarline:'final'}:{})};
  }),
 };
}

const shortDocuments=pieces.map(makeDocument);
export const originalGuitarDocuments=[...shortDocuments,lightStaysDocument,nightBloomsAgainDocument];
export const originalGuitarPieces=shortDocuments.map((document,index)=>{
 const piece=pieces[index],result=compileScoreDocument(document,{root:piece.root,level:ko['etudes.beginner'],style:piece.style,type:ko['etudes.arpeggios'],lesson:1002+index,trackLesson:9+index,difficultyReason:`${ko['etudes.beginner']} · 개방 코드와 1–3프렛을 사용하며 베이스 교대, 음길이, 동시 발음을 연습합니다.`});
 const errors=[...result.errors,...result.issues,...(result.score?validateEtude(result.score):[])];
 if(!result.score||errors.length)throw Error(`${document.title}: ${errors.join(', ')}`);
 return {...result.score,edited:false,pedagogy:{objective:document.purpose,prerequisites:[],preparation:'표준 튜닝으로 맞추고, 느린 속도에서 각 마디의 베이스와 높은 음을 확인합니다.',instructions:document.tips[0],keyBars:[],links:[],checks:['각 마디를 정확히 4박으로 연주합니다.','동시에 표시된 음을 함께 울립니다.','16마디 끝에서 멈추고 마지막 잔향을 듣습니다.'],tempo:{start:Math.round(piece.bpm*.8),target:piece.bpm},review:'16마디의 시작·전개·종지를 연결하여 한 곡으로 연주합니다.'}};
}).concat(lightStays,nightBloomsAgain);
