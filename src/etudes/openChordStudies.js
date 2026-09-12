// Each course has its own concert-pitch progression and actual chord grips.
const grip=(frets,fingers,barre)=>({frets,fingers,...(barre?{barre}:{})});
const CHORDS={
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
const FIFTH={C:3,Am:4,F:2,G:4,Em:5,D7:3,Bmaj7:4,'D#m':4,Emaj7:4,Em7:4};
const B='bass', V='fifth';
const FIRST=[[[B,2],3,1,3],[[B,2],4,3,-1],[[B,1],3,2,3],[[B,2],4,B,-1],[[B,2],3,[B,1],3],[[B,1],2,3,-1],[[B,2],4,3,-1],[[B,2],3,1,B]];
const CHANGES=[[[B,2],3,1,-1],[[B,1],4,3,-1],[[B,2],3,1,-1],[[B,1],4,3,-1],[[B,2],3,[B,1],-1],[[B,1],2,3,-1],[[B,2],3,1,-1],[[B,2],3,1,B]];
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
  return row.map(cell=>cell===-1?-1:Array.isArray(cell)?cell.map(add):add(cell));
 });
 return {...spec,type:'아르페지오',style:'발라드',family:'major',complete:true,accompaniment:true,
  shape,patterns,chordShapes,chordNames:spec.chords,rhythms:spec.rows.map(row=>Array(row.length).fill(String(row.length))),difficultyReason:spec.level+' · '+spec.goal};
}
export function chordStudies() {
 const progression=['C','Am','F','G','C','Am','G','C'];
 const sevenths=['Bmaj7','D#m','Emaj7','Em7','Bmaj7','D#m','Em7','Bmaj7'];
 return [
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
 ];
}
