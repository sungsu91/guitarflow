// Actual standard-tuning grips, not transposed copies of open strings.
export const OPEN_CHORD_ROOTS = ['C','D','E','G','A'];
const grip=(frets,fingers,barre)=>({frets,fingers,...(barre?{barre}:{})});
const barre=(fret,from=6,to=1)=>({fret,from,to});
const CHORDS={
  C:grip([null,3,2,0,1,0],[null,3,2,null,1,null]),
  Am:grip([null,0,2,2,1,0],[null,null,2,3,1,null]),
  D:grip([null,null,0,2,3,2],[null,null,null,1,3,2]),
  G:grip([3,2,0,0,0,3],[2,1,null,null,null,3]),
  E:grip([0,2,2,1,0,0],[null,2,3,1,null,null]),
  A:grip([null,0,2,2,2,0],[null,null,1,2,3,null]),
  Em:grip([0,2,2,0,0,0],[null,2,3,null,null,null]),
  F:grip([null,null,3,2,1,1],[null,null,3,2,1,1],barre(1,2)),
  Bm:grip([null,2,4,4,3,2],[null,1,3,4,2,1],barre(2,5)),
  'C#m':grip([null,4,6,6,5,4],[null,1,3,4,2,1],barre(4,5)),
  B:grip([null,2,4,4,4,2],[null,1,3,3,3,1],barre(2,5)),
  Dm:grip([null,null,0,2,3,1],[null,null,null,2,3,1]),
  Bb:grip([null,1,3,3,3,1],[null,1,3,3,3,1],barre(1,5)),
  'F#m':grip([2,4,4,2,2,2],[1,3,4,1,1,1],barre(2)),
  'G#m':grip([4,6,6,4,4,4],[1,3,4,1,1,1],barre(4)),
  'F#':grip([2,4,4,3,2,2],[1,3,4,2,1,1],barre(2)),
};
const BEGINNER_CHANGES={C:['Am',5,'m'],D:['G',3,''],E:['A',3,''],G:['Em',5,'m'],A:['D',3,'']};
const PROGRESSIONS={C:['C','Am','F','G'],D:['D','Bm','G','A'],E:['E','C#m','A','B'],F:['F','Dm','Bb','C'],G:['G','Em','C','D'],A:['A','F#m','D','E'],B:['B','G#m','E','F#']};
const ORDER=[0,1,2,3,0,1,3,0];
const B='bass';
const FIRST=[[[B,2],3,1,3],[[B,2],4,3,-1],[[B,1],3,2,3],[[B,2],4,B,-1],[[B,2],3,[B,1],3],[[B,1],2,3,-1],[[B,2],4,3,-1],[[B,2],3,1,B]];
const CHANGES=[[[B,2],3,1,-1],[[B,1],4,3,-1],[[B,2],3,1,-1],[[B,1],4,3,-1],[[B,2],3,[B,1],-1],[[B,1],2,3,-1],[[B,2],3,1,-1],[[B,2],3,1,B]];

export function resolveOpenChordStudy(root,template) {
  if(!template.openChordCourse)return template;
  const foundation=template.openChordCourse==='foundation';
  const changes=template.openChordCourse==='changes';
  const symbols=foundation?Array(8).fill(root):changes?[root,root,BEGINNER_CHANGES[root][0],BEGINNER_CHANGES[root][0],root,root,BEGINNER_CHANGES[root][0],root]:ORDER.map(i=>PROGRESSIONS[root][i]);
  const harmony=foundation?Array.from({length:8},()=>[0,'']):changes?[0,0,1,1,0,0,1,0].map(i=>i?BEGINNER_CHANGES[root].slice(1):[0,'']):ORDER.map(i=>[[0,''],[5,'m'],[3,''],[4,'']][i]);
  const chordShapes=symbols.map(symbol=>CHORDS[symbol]);
  const shape=[];
  const patterns=chordShapes.map((chord,bar)=>{
    const bass=6-chord.frets.findIndex(f=>f!==null);
    const row=foundation?FIRST[bar]:changes?CHANGES[bar]:bar<4?[[B,2],3,2,3,[B,1],2,3,B]:[[B,1],2,3,2,[B,2],3,2,B];
    const add=string=>{const s=string===B?bass:string;shape.push([s,chord.frets[6-s]]);return shape.length-1;};
    return row.map(cell=>cell===-1?-1:Array.isArray(cell)?cell.map(add):add(cell));
  });
  return {...template,shape,patterns,chordShapes,harmony,concertFrets:true};
}

export function beginnerOpenChordStudies() {
  return [
    {id:'chord-three-strings',openChordCourse:'foundation',name:'기본 오픈 코드로 첫 반주',english:'Open Chord First Accompaniment',bpm:44,
      purpose:'코드표의 기본 오픈 코드를 먼저 잡습니다. 첫 박의 베이스와 높은 줄은 함께 뜯고 나머지는 순서대로 이어갑니다. 0은 손가락으로 누르지 않는 개방현입니다.',
      difficultyReason:'초급 입문 · 0–3프렛의 기본 오픈 코드 한 개를 잡고 4분음표로 반주합니다.'},
    {id:'chord-two-grips',openChordCourse:'changes',name:'두 오픈 코드 바꾸며 반주',english:'Two Open Chord Changes',bpm:48,
      purpose:'두 기본 오픈 코드를 바꿔 잡으며 반주합니다. 매 마디 첫 박은 해당 코드의 루트와 높은 음을 함께 뜯고, 쉼표에서 잔향을 정리하며 다음 모양을 준비하세요.',
      difficultyReason:'초급 · 0–3프렛의 오픈 코드 두 개를 전환합니다. 바레나 하이코드 없이 쉼표 동안 다음 운지를 준비합니다.'},
  ].map(t=>resolveOpenChordStudy('C',{...t,roots:OPEN_CHORD_ROOTS,level:'초급',type:'아르페지오',style:'발라드',family:'major',complete:true,accompaniment:true,duration:'4'}));
}
