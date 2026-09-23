import {compileScoreDocument} from './scoreDocument.js';

// Authored grips, low E → high E; x means a string that must not sound.
export const SKETCH_VOICINGS = {
 Aa:['Am(add9)','x02410'], A7:['Am7','x02010'], F:['Fmaj7','xx3210'],
 Es:['Esus4','022200'], E7:['E7','020100'], A:['Am','x02210'],
 Em:['Em7','022030'], C7:['Cmaj7','x32000'], D:['Dm7','xx0211'],
 Ac:['Am/C','x32210'], Bh:['Bm7b5','x2323x'], B:['B7','x21202'],
 G6:['G6','320000'], Fg:['F/G','3x3211'], Gs:['Gsus4','3x0013'], G:['G','320003'],
 C9:['Cadd9','x32033'], Gb:['G/B','x20033'], Ce:['C/E','032010'],
 Ah:['Am7','5x5555'], Gh:['G/B','7x9787'], Ch:['Cmaj7','x35453'],
 Fh:['Fmaj7','x87555'], Dh:['Dm7','x57565'], Ach:['Am/C','8x7555'],
 BhH:['Bm7b5','7x776x'], Eh:['E7','x76757'],
 C9h:['Cadd9','x32030'], Emh:['Em7','x79787'],
};
export const SKETCH_SECTIONS = [
 ['INTRO',0,4],['VERSE',4,8],['PRE',12,8],['CHORUS',20,8],
 ['BRIDGE',28,8],['FINAL',36,8],['OUTRO',44,5],
];
// Each token explicitly selects strings and written duration. '+' is a pinch,
// '-' is an entered rest. No transposition or automatic chord assignment.
const rows = [
 ['Aa','5:8 -:8 4:4 3:8 2:8 1:4'],
 ['A7','5:4 4:8 3:8 2:4 1:8 -:8'],
 ['F','4:4 3:8 2:8 1:4 2:8 3:8'],
 ['Es/E7','6:8 4:8 3+2:4 6:8 4:8 3+2+1:4'],
 ['A','5:8 4:8 3:16 2:8 1:16 4:8 3:8 2:4'],
 ['Em','6:8 4:8 3:8 2:16 1:16 5:4 2:8 3:8'],
 ['F','4:8 3:8 2:16 1:8 2:16 4:8 3:8 1:4'],
 ['C7','5:8 4:8 3:8 2:16 1:16 4:4 2:8 -:8'],
 ['D','4:8 3:8 2:16 1:8 2:16 4:8 3:8 1:4'],
 ['Ac','5:8 4:8 3:8 2:16 1:16 5:4 2:8 3:8'],
 ['Bh','5:8 4:8 3:16 2:8 3:16 5:8 4:8 2:4'],
 ['B','5:8 4:8 3:8 2:16 1:16 4:8 3:8 1:4'],
 ['F','4:8 3:16 2:16 1:4 3:16 2:8 1:16 4:8 2:8'],
 ['G6','6:8 4:16 3:16 2:8 1:8 4:16 3:8 2:16 1:4'],
 ['Em','6:8 5:16 3:16 2:4 4:16 3:8 1:16 2:8 1:8'],
 ['A7','5:8 4:16 3:16 2:8 1:8 4:16 3:16 2:8 1:4'],
 ['D','4:8 3:16 2:16 1:4 4:16 3:8 2:16 1:8 2:8'],
 ['Fg','6:8 4:16 3:16 2:8 1:8 4:16 3:8 2:16 1:4'],
 ['Gs','6:8 4:16 3:16 2:4 4:16 3:8 1:16 2:8 1:8'],
 ['G','6:8 2:8 1:4 4+3:4 -:4'],
 ['C9','5+1:8 4:16 3:16 2:4 4:16 3:8 1:16 2:8 1:8'],
 ['Gb','5+1:8 4:16 3:16 2:8 1:8 4:16 3:8 2:16 1:4'],
 ['Ah','6+1:8 4:16 3:16 2:4 4:16 3:8 1:16 2:8 1:8'],
 ['Emh','5+1:8 4:16 3:16 2:8 1:8 4:16 3:16 2:8 1:4'],
 ['Fh','5+1:8 4:16 3:16 2:4 4:16 3:8 1:16 2:8 1:8'],
 ['Ce','6+1:8 4:16 3:16 2:8 1:8 5:16 3:8 2:16 1:4'],
 ['D','4+1:8 3:16 2:16 1:4 4:16 3:8 2:16 1:8 2:8'],
 ['Gs/G','6+2:8 4:16 3:16 1:4 6+2:8 4:8 1:4'],
 ['Ah','6:4 4:8 3:8 2+1:4 -:4'],
 ['Gh','6:4 4:8 3:8 2:8 1:8 -:4'],
 ['Ch','5:8 -:8 4:4 3:8 2:8 1:4'],
 ['Fh','5:4 4:8 3:8 2+1:4 -:4'],
 ['Dh','5:4 4:8 3:8 2:4 1:8 -:8'],
 ['Ach','6:8 4:8 3:4 2:8 1:8 -:4'],
 ['BhH','6:8 4:8 3:16 2:8 3:16 6:4 2:8 4:8'],
 ['Eh','5:8 4:16 3:16 2+1:4 4:16 3:8 2:16 5:8 2:8'],
 ['C9','5+1:8 4:16 3:16 2:8 1:8 4:16 3:8 2:16 1:4'],
 ['Gb','5+1:8 4:16 3:16 2:4 4:16 3:8 1:16 2:16 3:16 1:8'],
 ['Ah','6+1:8 4:16 3:16 2:8 1:8 4:16 3:16 2:8 1:4'],
 ['Emh','5+1:8 4:16 3:16 2:4 4:16 3:8 1:16 2:16 3:16 1:8'],
 ['Fh','5+1:8 4:16 3:16 2:8 1:8 4:16 3:8 2:16 1:4'],
 ['Ce','6+1:8 4:16 3:16 2:4 5:16 3:8 1:16 2:16 3:16 1:8'],
 ['Dh','5+1:8 4:16 3:16 2:8 1:8 4:16 3:16 2:8 1:4'],
 ['Gs/G','6+2:8 4:16 3:16 1:4 6+2:8 4:16 3:16 1:4'],
 ['F','4:4 3:8 2:8 1:4 2:8 3:8'],
 ['Ce','6:4 4:8 3:8 2:4 1:4'],
 ['D','4:4 3:8 2:8 1:4 -:4'],
 ['Gs/G','6:8 2:8 4+1:4 6:8 2:8 4+1:4'],
 ['C9h','5:4 4+3:8 2+1:8 -:4 -:4'],
];
const id='A-together-composition-sketch';
export const compositionSketchDocument={
 format:'fretiva.etude',version:2,id,templateId:'together-composition-sketch',kind:'builtin',
 origin:{templateId:'together-composition-sketch',revision:1},instrument:'guitar',tuning:[64,59,55,50,45,40],
 title:'함께 걷는 길 · 작곡 스케치',english:'Still Walking Together',bpm:64,meter:[4,4],keySignature:'Am',
 purpose:'쓸쓸함을 남긴 채 곁에 있는 존재를 깨닫고 다시 걷는 49마디 핑거스타일 스케치. 마음에 드는 구간을 복사해 직접 바꾸어 보세요.',
 tips:['Intro 1–4 · Verse 5–12 · Pre 13–20 · Chorus 21–28 · Bridge 29–36 · Final 37–44 · Outro 45–49.',
 '베이스는 엄지, 중음은 검지, 2·1번줄은 중지·약지로 뜯습니다. 후렴의 긴 최고음을 노래하듯 유지하세요.',
 '4마디 Esus4→E7, 28·44·48마디 Gsus4→G는 3박에서 전환합니다. 19→20마디는 2번줄 C→B를 들으세요.',
 '12마디 B7은 Em으로 해결하지 않고 Fmaj7으로 옆걸음합니다. D#→E, F#→F의 반음 이동을 느끼세요.',
 '36마디 E7→Cadd9는 예상한 Am을 미루는 연결입니다. G#→G와 공통음 E가 어둠과 온기를 함께 남깁니다.',
 '마지막 마디 쉼표는 새로운 피킹의 여백입니다. let ring 음들은 끝까지 울립니다.'],
 measures:rows.map(([keys,pattern],bar)=>{
  const changes=keys.split('/').map(key=>({key,name:SKETCH_VOICINGS[key][0],frets:[...SKETCH_VOICINGS[key][1]].map(f=>f==='x'?null:Number(f))}));
  let onset=0;
  const events=pattern.split(' ').map((token,i)=>{
   const [strings,duration]=token.split(':'),rest=strings==='-',grip=changes[changes.length===2&&onset>=960?1:0];
   const event={id:`${id}:${bar}:${i}`,onset,duration,rest,technique:null,
    letRing:bar===48&&!rest,
    notes:rest?[]:strings.split('+').map((s,j)=>({id:`${id}:${bar}:${i}:${j}`,string:Number(s),fret:grip.frets[6-Number(s)],locked:true}))};
   onset+=1920/Number(duration);return event;
  });
  const section=SKETCH_SECTIONS.find(([,start])=>start===bar);
  return {id:`${id}:bar:${bar}`,harmony:changes.map(c=>c.name).join(' → '),chord:null,
   ...(section?{sectionLabel:{INTRO:'INT',VERSE:'A',PRE:'B',CHORUS:'C',BRIDGE:'D',FINAL:'C',OUTRO:'OUT'}[section[0]]}:{}),
   events,sketchVoicings:changes};
 }),
};
const result=compileScoreDocument(compositionSketchDocument,{root:'A',level:'중급',style:'발라드',type:'아르페지오',lesson:1000,trackLesson:7});
if(!result.score||result.errors.length||result.issues.length)throw Error(JSON.stringify(result));
export const compositionSketch={...result.score,edited:false,pedagogy:{objective:compositionSketchDocument.purpose,prerequisites:[],preparation:'오픈 코드와 5–9프렛 부분 보이싱을 천천히 연결하세요.',instructions:compositionSketchDocument.tips[1],keyBars:[],links:[],checks:['코드 전환, 최고음, 쉼표의 여백을 듣고 마음에 드는 구간을 저장하세요.'],tempo:{start:52,target:64},review:'작곡 스케치 · 실연과 감정 표현은 직접 탐색하세요.'}};




