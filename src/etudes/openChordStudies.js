// Each course has its own concert-pitch progression and actual chord grips.
const grip=(frets,fingers,barre)=>({frets,fingers,...(barre?{barre}:{})});
const CHORDS={
 D:grip([null,null,0,2,3,2],[null,null,null,1,3,2]),
 Dm:grip([null,null,0,2,3,1],[null,null,null,2,3,1]),
 E7:grip([0,2,0,1,0,0],[null,2,null,1,null,null]),
 C:grip([null,3,2,0,1,0],[null,3,2,null,1,null]),
 Am:grip([null,0,2,2,1,0],[null,null,2,3,1,null]),
 F:grip([null,null,3,2,1,1],[null,null,3,2,1,1],{fret:1,from:2,to:1}),
 G:grip([3,2,0,0,0,3],[2,1,null,null,null,3]),
 Em:grip([0,2,2,0,0,0],[null,2,3,null,null,null]),
 D7:grip([null,null,0,2,1,2],[null,null,null,2,1,3]),
 Bmaj7:grip([null,2,4,3,4,2],[null,1,3,2,4,1],{fret:2,from:5,to:1}),
 'D#m':grip([null,6,8,8,7,6],[null,1,3,4,2,1],{fret:6,from:5,to:1}),
 Emaj7:grip([null,7,9,8,9,7],[null,1,3,2,4,1],{fret:7,from:5,to:1}),
 Em7:grip([null,7,9,7,8,7],[null,1,3,1,2,1],{fret:7,from:5,to:1}),
};
// The fifth is selected for this voicing; it is not always the adjacent string.
const FIFTH={D:3,Dm:3,E7:5,C:3,Am:4,F:2,G:4,Em:5,D7:3,Bmaj7:4,'D#m':4,Emaj7:4,Em7:4};
const B='bass', V='fifth';
const FIRST=[[[B,2],3,1,3],[[B,2],4,3,-1],[[B,1],3,2,3],[[B,2],4,B,-1],[[B,2],3,[B,1],3],[[B,1],2,3,-1],[[B,2],4,3,-1],[[B,2],3,1,B]];
const CHANGES=[[[B,2],3,1,-1],[[B,1],4,3,-1],[[B,2],3,1,-1],[[B,1],4,3,-1],[[B,2],3,[B,1],-1],[[B,1],2,3,-1],[[B,2],3,1,-1],[[B,2],3,1,B]];
const ADDITIONAL_PROGRESSIONS={
 'chord-bass-answer':{fixedRoot:'G',chords:['G','D','Em','C','Am','D7','G','G'],name:'G장조 교대 베이스 반주',english:'G Major Alternating Bass',purpose:'G–D–Em–C에서 Am–D7–G로 돌아옵니다. 코드마다 루트와 5음을 교대합니다.',goal:'G장조의 코드 전환과 교대 베이스를 연결합니다.'},
 'chord-sixteenths':{fixedRoot:'A',family:'minor',chords:['Am','Dm','G','C','F','Dm','E7','Am'],name:'Am 단조 순환과 16분 반주',english:'A Minor Circle Arpeggio',purpose:'Am–Dm–G–C–F–Dm–E7–Am의 단조 진행입니다. E7의 G♯이 마지막 Am으로 이어집니다.',goal:'단조의 긴장과 해결을 독립 베이스·16분 반주로 표현합니다.'},
 'chord-density':{fixedRoot:'G',chords:['Em','C','G','D','Em','Am','D7','G'],name:'Em에서 G로 · 동시 뜯기와 엇박',english:'Em to G Offbeat Arpeggio',purpose:'Em에서 시작해 C–G–D를 거쳐 Am–D7–G로 마무리합니다. 쉼 뒤 재진입을 정확히 맞춥니다.',goal:'상대단조 출발과 장조 해결을 엇박·쉼표로 구분합니다.'},
 'chord-melody-response':{fixedRoot:'C',chords:['C','G','Am','Em','F','C','G','C'],name:'C장조 하행 흐름 · 8·16 응답',english:'C Major Mixed Rhythm Response',purpose:'C–G–Am–Em–F–C–G–C 위에서 베이스와 높은 음이 8분·16분 리듬으로 응답합니다.',goal:'서로 다른 리듬 밀도와 긴 도착음을 코드 진행에 맞춥니다.'},
};
function study(spec) {
 const chordShapes=spec.chords.map(name=>CHORDS[name]),shape=[];
 const patterns=spec.rows.map((row,bar)=>{
  const chord=chordShapes[bar],bass=6-chord.frets.findIndex(f=>f!==null);
  const add=token=>{
   const string=token===B?bass:token===V?FIFTH[spec.chords[bar]]:token;
   const fret=chord.frets[6-string];
   if(fret===null)throw new Error(spec.id+': muted string '+string);
   shape.push([string,fret]);return shape.length-1;
  };
  return row.map(cell=>cell===-1?-1:Array.isArray(cell)?cell.map(add).filter((index,i,indices)=>indices.findIndex(other=>shape[other][0]===shape[index][0])===i):add(cell));
 });
 return {...spec,type:'아르페지오',style:'발라드',family:spec.family??'major',complete:true,accompaniment:true,
  shape,patterns,chordShapes,chordNames:spec.chords,rhythms:spec.rhythms??spec.rows.map(row=>Array(row.length).fill(String(row.length))),difficultyReason:spec.level+' · '+spec.goal};
}
export function chordStudies() {
 const progression=['C','Am','F','G','C','Am','G','C'];
 const sevenths=['Bmaj7','D#m','Emaj7','Em7','Bmaj7','D#m','Em7','Bmaj7'];
 const mixed=(id,root,chords,name)=>study({id,fixedRoot:root,family:root==='A'?'minor':'major',level:'중급',name,english:name,bpm:56,chords,
 rows:chords.map((_,i)=>i%2?[[B,1],2,3,2,1,3,B]:[[B,2],3,1,2,3,1,B,2]),
 rhythms:chords.map((_,i)=>i%2?['8','8','8','8','8','4','4']:['8','16','16','8','8','4','8','8']),
 tupletMap:chords.map((_,i)=>i%2?[[0,1,2]]:[]),purpose:'8분·16분 응답과 8분 셋잇단을 마디마다 번갈아 연주합니다.',goal:'같은 템포에서 2분할·4분할·3분할을 구분합니다.'});
 return [
  mixed('chord-am-triplet','A',['Am','G','F','E7','Dm','Am','E7','Am'],'Am · 셋잇단과 8·16 반주'),
  mixed('chord-g-triplet','G',['G','Em','C','D','Am','D7','G','G'],'G장조 · 셋잇단과 8·16 반주'),
  study({id:'chord-small-barre',fixedRoot:'C',level:'초급',name:'C에서 작은 F 바레 준비',english:'Open C to Small F Barre',bpm:44,chords:['C','C','F','F','C','F','C','C'],rows:[[[B,2],3,1,-1],[[B,1],2,3,-1],[[B,2],3,1,-1],[[B,1],2,3,-1],[[B,2],3,1,-1],[[B,1],2,3,-1],[[B,2],3,[B,1],-1],[[B,1],3,2,B]],purpose:'3–4마디에서 처음 F의 1·2번줄만 검지로 누릅니다. 마지막 쉼에 압력을 풀고 다음 코드표를 준비합니다.',goal:'C·Am 다음 단계로 작은 F 바레를 느린 4분음표와 준비 쉼에 적용합니다.'}),
  study({id:'chord-moving-preparation',fixedRoot:'B',level:'중급',name:'같은 바레 모양 이동 준비',english:'Barre Shape Shift Preparation',bpm:48,chords:['Bmaj7','Bmaj7','Emaj7','Emaj7','D#m','D#m','Em7','Bmaj7'],rows:[[[B,1],3,2,-1],[[B,2],1,3,-1],[[B,1],3,2,-1],[[B,2],1,3,-1],[[B,1],3,2,-1],[[B,2],1,3,-1],[[B,1],3,2,-1],[[B,2],3,1,B]],purpose:'1–4마디 Bmaj7→Emaj7은 같은 모양을 옮기고, 5–6마디 D#m과 7마디 Em7에서는 안쪽 손가락을 바꿉니다. 마지막 박의 쉼 동안 다음 위치를 준비하세요.',goal:'2–9프렛 이동을 느린 4분음표·쉼으로 먼저 준비한 뒤 다음 곡의 연속 8분 반주로 연결합니다.'}),
  study({id:'chord-melody-response',fixedRoot:'B',level:'고급',name:'베이스와 높은 음의 밀도 응답',english:'Bass and Treble Rhythm Response',bpm:60,chords:sevenths,rows:sevenths.map((_,i)=>i%2?[[B,1],2,3,2,[V,1],3,2,B]:[[B,2],3,1,2,[V,2],1,3,B]),rhythms:sevenths.map((_,i)=>i%2?['8','8','8','8','4','8','16','16']:['8','8','16','16','8','4','8','8']),purpose:'1·3·5·7마디는 높은 줄의 16분 응답 뒤 4분음표에 머뭅니다. 짝수 마디는 마지막 박 끝의 짧은 베이스를 다음 코드 첫 박과 연결합니다.',goal:'같은 코드 이동에 베이스·높은 음의 서로 다른 리듬 위치, 긴 도착음, 다음 코드 직전의 짧은 준비음을 결합합니다.'}),
  study({id:'chord-three-strings',fixedRoot:'C',level:'초급',name:'기본 C 코드로 첫 반주',english:'Open C Chord First Accompaniment',bpm:44,chords:Array(8).fill('C'),rows:FIRST,
   purpose:'C 기본형 x32010을 잡습니다. 첫 박의 5번줄 베이스와 높은 음은 함께 뜯고 나머지는 순서대로 이어갑니다. 0은 개방현입니다.',goal:'기본 C 코드 한 개를 유지하며 4분음표로 베이스와 높은 음을 함께 뜯습니다.'}),
  study({id:'chord-two-grips',fixedRoot:'C',level:'초급',name:'C·Am 두 오픈 코드 반주',english:'C and Am Open Chord Changes',bpm:48,chords:['C','C','Am','Am','C','C','Am','C'],rows:CHANGES,
   purpose:'C와 Am을 바꿔 잡으며 반주합니다. 쉼표에서 잔향을 정리하고 다음 모양을 준비하세요.',goal:'0–3프렛의 두 오픈 코드를 쉼표 동안 전환합니다.'}),
  study({id:'chord-accompaniment',fixedRoot:'C',level:'중급',name:'C·Am·F·G 코드 진행 반주',english:'C Am F G Chord Progression',bpm:56,chords:progression,
   rows:progression.map((_,bar)=>bar<4?[[B,2],3,2,3,[B,1],2,3,B]:[[B,1],2,3,2,[B,2],3,2,B]),
   purpose:'C–Am–F–G를 미리 잡고 1·3박은 베이스와 높은 음을 함께 뜯습니다. F의 1·2번줄만 짧게 바레하고 나머지 코드에서는 힘을 풉니다.',goal:'네 코드 전환·작은 바레·8분 분산 반주를 연결합니다.'}),
  study({id:'chord-bass-answer',fixedRoot:'B',level:'중급',name:'Bmaj7·D#m·Emaj7·Em7 코드 이동',english:'Moving Between Chord Shapes',bpm:56,chords:sevenths,
   rows:sevenths.map((_,bar)=>bar<4?[[B,1],3,2,3,[V,2],3,1,B]:[[B,2],1,3,2,[V,1],2,3,B]),
   purpose:'Bmaj7(2–4) → D#m(6–8) → Emaj7(7–9) → Em7(7–9)으로 이동합니다. Bmaj7과 Emaj7은 같은 코드 모양을 옮깁니다. Emaj7→Em7에서는 바레와 4번줄을 유지하며 안쪽 두 음을 낮춥니다. 7프렛에서 2프렛으로 돌아갈 때는 바레 압력을 풀고 손 전체를 이동한 뒤 다시 누릅니다. Em7은 B장조에 의도적으로 빌려온 마이너 코드입니다.',goal:'바레 위치와 코드 모양을 바꾸며 8분 반주와 루트·5음 교대 베이스를 이어갑니다.'}),
  study({id:'chord-sixteenths',fixedRoot:'B',level:'고급',name:'코드 이동 위에 독립 베이스·16분 반주',english:'Moving Chords with Steady Bass',bpm:60,chords:sevenths,
   rows:sevenths.map((_,bar)=>[[B,1],3,2,1,[V,2],3,2,1,[B,1],2,3,2,[V,2],3,...(bar<4?[2,B]:[1,B])]),
   purpose:'중급에서 익힌 Bmaj7·D#m·Emaj7·Em7 이동을 그대로 사용합니다. 엄지는 매 박 루트·5음을 교대하고, 높은 줄은 별도로 16분음표를 이어갑니다. 이동 직전에도 베이스의 박과 높은 음의 균형을 유지하세요. Em7은 의도적인 차용화음입니다.',goal:'익힌 코드 이동에 매 박 교대 베이스와 연속 16분 높은 음의 독립적인 리듬·음량 제어를 더합니다.'}),
  study({id:'chord-density',fixedRoot:'B',level:'고급',name:'세 음 동시 뜯기와 엇박 응답',english:'Three-note Pinch and Offbeat Response',bpm:64,chords:sevenths,
   rows:sevenths.map((_,bar)=>bar%2===0?[[B,3,1],2,3,1,[V,2],-1,3,1,[B,1],3,2,-1,[V,2],3,1,B]:[[B,3,1],2,V,1,[B,2],-1,V,B]),
   purpose:'앞 과제의 Bmaj7·D#m·Emaj7·Em7 이동에 세 음 동시 뜯기와 8분·16분 리듬 변형을 더합니다. 이동 직후 첫 박을 놓치지 않고, 쉼표에서는 잔향을 정리합니다. Em7의 G·D는 의도적인 차용화음 음입니다.',goal:'익힌 코드 모양과 포지션 이동을 유지하면서 동시 뜯기·교대 베이스·쉼 뒤 재진입을 결합합니다.'}),
 ].flatMap(original=>{
  const addition=ADDITIONAL_PROGRESSIONS[original.id];
  if(!addition)return [original];
  const id={ 'chord-bass-answer':'chord-g-alternating','chord-sixteenths':'chord-am-circle','chord-density':'chord-em-offbeat','chord-melody-response':'chord-c-response'}[original.id];
  return [original,study({...original,...addition,id})];
 });
}
