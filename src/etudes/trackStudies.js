import { beginnerOpenChordStudies } from './openChordStudies.js';
// Original, deterministic studies. Links are authored inside cells; a cell's
// first note is picked again. Rests give beginners time to prepare a new grip.
const quarter = ['4','4','4','4'];
const eighth = Array(8).fill('8');
const sixteenth = Array(16).fill('16');
const repeat = (cell, times) => Array.from({length:times}, () => cell).flat();

const make = (id, level, type, name, english, bpm, shape, patterns, rhythm, purpose, goal, extra = {}) => ({
  id, level, type, name, english, bpm, shape, patterns, family:'major', style:'기초', complete:true,
  rhythms: patterns.map((_, i) => Array.isArray(rhythm[0]) ? rhythm[i] : rhythm),
  purpose, difficultyReason:`${level} · ${goal}`, ...extra,
});

function techniqueStudies() {
  const result = [];
  const definitions = [
    ['hammer','해머온','H','Hammer-on'], ['pull','풀오프','P','Pull-off'],
    ['slide','슬라이드','S','Slide'], ['legato','레가토','HP','Legato'],
  ];
  const singleShape = [[1,8],[1,10],[2,13],[2,15]]; // C–D on either string.
  // Three notes per string in a connected C-major route; no random voicing lookup.
  const route = [[4,10],[4,12],[4,14],[3,10],[3,12],[3,14],[2,12],[2,13],[2,15],[1,12],[1,13],[1,15]];
  for (const [prefix, type, kind, english] of definitions) {
    const pair = (base, reverse = false) => kind === 'H' ? [base,base+1,base,-1]
      : kind === 'P' ? [base+1,base,base+1,-1]
      : kind === 'HP' ? [base,base+1,base,-1]
      : reverse ? [base+1,base,base+1,-1] : [base,base+1,base,-1];
    const pairMarks = row => {
      const marks={};
      for(let i=0;i<2;i++) {
        if(row[i]<0 || row[i+1]<0 || row[i]===row[i+1]) continue;
        const direction=singleShape[row[i+1]][1]>singleShape[row[i]][1]?'H':'P';
        if(kind==='HP' || (i===0 && (kind==='S'||kind===direction))) marks[i]=kind==='S'?'S':direction;
      }
      return marks;
    };
    const opening = Array.from({length:8}, (_, bar) => pair(0, bar % 2 === 1));
    opening[7] = kind === 'P' ? [1,0,0,0] : [0,1,0,0];
    const beginnerPurpose = kind === 'HP'
      ? '한 줄에서 낮은 음→높은 음→낮은 음을 H·P로 연결합니다. 1–7마디의 마지막 박은 쉬고, 연결 표시가 없는 음에서 다시 피킹하세요.'
      : `${type} 표시가 있는 두 음만 연결합니다. 표시 없는 음은 피킹하고 마지막 박은 쉬면서 손의 힘을 풉니다.`;
    const single = make(`${prefix}-single`, '초급', type, kind === 'HP' ? '한 줄 해머·풀 연결' : `한 줄 두 음 ${type}`,
      `Single-string ${english}`, kind === 'HP' ? 44 : 48, singleShape, opening, quarter,
      beginnerPurpose, '한 줄·두 프렛 간격·4분음표와 쉼으로 한 가지 연결을 익힙니다.',
      {techniqueMap:opening.map(pairMarks)});
    result.push(single);
    if (prefix === 'slide' || prefix === 'legato') {
      const rows = [0,0,2,2,0,2,2,0].map(base => pair(base));
      rows[7] = [0,1,0,0];
      result.push(make(`${prefix}-pairs`, '초급', type, `두 줄에 적용하는 ${type}`, `Two-string ${english}`, 52,
        singleShape, rows, rows.map((_,bar)=>bar===1||bar===3?['8','8','2','4']:quarter),
        '각 마디는 한 줄에서 완성합니다. 쉼표 동안 다음 줄의 시작 위치를 준비하고, 두 줄의 음량을 비슷하게 맞추세요.',
        '연결을 두 줄에 번갈아 적용하고 8분음표 뒤 긴 음을 유지합니다. 위치 변경은 쉼표 동안 준비합니다.',
        {techniqueMap:rows.map(pairMarks)}));
    }
    const cell = (base, variation = false) => kind === 'H' ? (variation ? [base,base+2,base,base+1] : [base,base+1,base+2,base])
      : kind === 'P' ? (variation ? [base+2,base,base+1,base] : [base+2,base+1,base,base+1])
      : kind === 'S' ? (variation ? [base+1,base+2,base+1,base] : [base,base+1,base+2,base+1])
      : variation ? [base+2,base+1,base,base+1] : [base,base+1,base+2,base+1];
    const marksFor = rows => rows.map(row => {
      const marks = {};
      for (let i=0; i<row.length-1; i++) {
        if (i%4===3) continue;
        const a=route[row[i]], b=route[row[i+1]];
        if (!a || !b || a[0]!==b[0] || a[1]===b[1]) continue;
        const direction=b[1]>a[1]?'H':'P';
        if (kind==='HP' || kind==='S' || kind===direction) marks[i]=kind==='S'?'S':direction;
      }
      return marks;
    });
    const finish = row => [...row.slice(0,-4), 2,1,0,0];
    const specifications = [
      ['three','중급',`${type} 세 음 연결`,'Three-note',60,[0,0,0,0,0,0,0,0],2,false,
        '한 줄에서 세 음을 연결합니다. 네 음 묶음의 첫 음을 다시 피킹하고 연결음이 작아지지 않도록 들어 보세요.',
        '세 음과 최대 네 프렛 간격을 8분음표로 제어합니다.'],
      ['crossing','중급',`줄을 옮기는 ${type}`,'String Crossing',64,[0,3,6,9,6,3,0,0],2,false,
        '한 마디마다 다음 줄로 이동합니다. 새 줄의 첫 음은 피킹하고 이전 줄의 잔향은 뮤트하세요.',
        '세 음 연결에 인접 줄 이동과 뮤트를 더합니다.'],
      ['drive','고급',`연속 16분 ${type}`,'Sixteenth Drive',72,[0,3,6,9,9,6,3,0],4,false,
        '네 음 묶음을 일정한 16분음표로 이어갑니다. 피킹하는 시작음과 연결음의 크기를 맞추세요.',
        '연속 16분음표·세 음 연결·줄 이동을 8마디 유지합니다.'],
      ['sequence','고급',`방향을 바꾸는 ${type}`,'Changing Sequence',76,[0,3,6,9,6,3,0,0],4,true,
        '세 음 음형과 간격을 바꾼 음형을 교대합니다. 표시 없는 도약음은 피킹하고 다음 연결을 준비하세요.',
        '16분음표에서 음형·피킹 시점·포지션을 바꿉니다.'],
    ];
    for (const [suffix,level,name,en,bpm,bases,times,varied,purpose,goal] of specifications) {
      // Existing studies already cover these steps in the slide/legato tracks.
      if (prefix==='slide' && suffix==='three') continue;
      if (prefix==='legato' && suffix!=='three' && suffix!=='drive') continue;
      const rows = bases.map((base, bar) => Array.from({length:times}, (_, part) => cell(base,varied&&(part+bar)%2===1)).flat());
      rows[7]=finish(rows[7]);
      const id=prefix==='legato'&&suffix==='drive'?'legato-chain':`${prefix}-${suffix}`;
      result.push(make(id,level,type,name,`${en} ${english}`,bpm,route,rows,times===4?sixteenth:eighth,purpose,goal,
        {techniqueMap:marksFor(rows)}));
    }
  }
  return result;
}

export function trackStudies({penta, pentaIntervals}) {
  const triad = [[4,10],[3,9],[2,8]]; // C E G on adjacent strings, distinct frets.
  const pentaPairs = [[6,8],[6,11],[5,8],[5,10]];
  const pentaRows = [0,1,2,3,3,2,1,0].map((s, bar) => {
    const cell = bar<4 ? [s,s+2,s+1,s+2,s+3,s+2,s+1,s] : [s+3,s+1,s+2,s+1,s,s+1,s+2,s];
    return repeat(cell,2);
  });
  return [
    ...techniqueStudies(),
    make('penta-pairs','초급','펜타토닉','펜타토닉 두 음 간격','Pentatonic Finger Pairs',48,pentaPairs,
      [[0,1,0,-1],[0,1,1,-1],[2,3,2,-1],[2,3,3,-1],[0,1,0,-1],[2,3,2,-1],[2,3,2,-1],[1,0,0,0]],quarter,
      '한 줄에서 두 음을 4분음표로 짚습니다. 쉼표 동안 다음 줄을 준비하고 세 프렛 간격에 익숙해지세요.',
      '두 줄·4분음표·쉼으로 마이너 펜타토닉의 손가락 간격을 익힙니다.',{family:'minor',intervals:pentaIntervals}),
    make('penta-turns','고급','펜타토닉','펜타토닉 교차 왕복','Pentatonic Crossing Turns',80,penta,pentaRows,sixteenth,
      '두 음을 건너갔다가 한 음 되돌아오는 음형을 연속해서 연주합니다. 방향 전환에서도 16분음표 간격을 유지하세요.',
      '연속 16분음표에서 순차 진행과 도약을 교대합니다.',{family:'minor',intervals:pentaIntervals,style:'락'}),
    make('triad-three-strings','초급','코드톤 런','세 줄 1·3·5음 첫걸음','Three-string Triad',48,triad,
      [[0,1,2,1],[0,1,2,-1],[0,1,2,1],[0,1,0,-1],[0,1,2,1],[0,1,2,-1],[2,1,0,1],[2,1,0,0]],quarter,
      '메이저 코드의 1·3·5음을 인접한 세 줄에서 한 음씩 연주합니다. 지나간 줄을 뮤트해 음을 분리하고, 줄 이동은 4분음표로 천천히 합니다.',
      '한 포지션·세 줄·4분음표로 트라이어드의 세 구성음을 익힙니다.'),
    make('triad-eighth-answer','초급','코드톤 런','세 줄 8분음표 왕복','Triad Eighth-note Return',56,triad,
      [[0,1,2,1,0,1,2,1],[0,1,2,1,0,1,0,-1],[0,1,2,1,2,1,0,1],[2,1,0,1,2,1,0,-1],[0,1,2,1,0,1,0,1],[2,1,0,1,0,1,2,1],[0,1,2,1,0,1,0,-1],[2,1,0,1,2,1,0,0]],eighth,
      '앞 과제의 세 줄 운지를 8분음표로 왕복합니다. 마지막 쉼표에서도 박자를 세고 다시 들어오세요.',
      '세 줄 운지를 유지하며 8분음표와 쉼표를 연결합니다.'),
  ];
}

export function chordTrackStudies(chordStudy) {
  const produce = (id,level,name,english,bpm,grips,harmony,stringRows,rhythm,purpose,goal) => {
    const shape=[];
    const patterns=stringRows.map((row,bar)=>row.map(cell=>{
      if(cell===-1)return -1;
      const position=string=>{shape.push([string,grips[bar].frets[6-string]]);return shape.length-1;};
      return Array.isArray(cell) ? cell.map(position) : position(cell);
    }));
    return make(id,level,'아르페지오',name,english,bpm,shape,patterns,rhythm,purpose,goal,
      {style:'발라드',accompaniment:true,chordShapes:grips,harmony});
  };
  const result=beginnerOpenChordStudies();
  for(const [id,level,name,english,bpm,mode] of [
    ['chord-bass-answer','중급','루트·5음 교대 베이스 반주','Alternating Bass Fingerpicking',60,'eighth'],
    ['chord-sixteenths','고급','동시 뜯기와 16분 분산 반주','Pinch and Sixteenth Picking',60,'sixteenth'],
    ['chord-density','고급','세 음 동시 뜯기와 리듬 전환','Three-note Pinch Rhythm',64,'mixed'],
  ]) {
    const rows=chordStudy.chordShapes.map((grip,bar)=>{
      const bass=grip.frets[0]===null?5:6;
      const fifth=bass===6?5:4;
      const a=[[bass,2],3,2,3,[fifth,1],2,3,bass];
      if(mode==='eighth') return bar<4?a:[[bass,1],2,3,2,[fifth,2],3,2,bass];
      const opening=mode==='mixed'?[bass,3,1]:[bass,1];
      if(mode==='mixed'&&bar%2===1)return [opening,3,2,3,[fifth,2],3,2,bass];
      return [opening,3,2,1,2,3,4,3,[fifth,2],3,2,1,...(bar<4?[2,3,4,bass]:[3,2,3,bass])];
    });
    result.push(produce(id,level,name,english,bpm,chordStudy.chordShapes,chordStudy.harmony,rows,
      rows.map(row=>row.length===16?sixteenth:eighth),
      mode==='eighth'?'엄지는 1박의 루트와 3박의 5음을 교대로 뜯습니다. 두 박 모두 높은 음을 함께 뜯고, 사이의 8분음표는 손 모양을 유지하며 분산합니다.'
        :mode==='mixed'?'마디 첫 박의 베이스·3번줄·1번줄을 엄지·검지·약지로 함께 뜯습니다. 8분음표와 16분음표 마디가 바뀌어도 베이스의 박자는 유지하세요.'
        :'1박에는 루트와 1번줄을, 3박에는 5음 베이스와 2번줄을 함께 뜯습니다. 사이를 16분음표로 채우고 베이스보다 높은 음이 지나치게 크지 않게 조절하세요.',
      mode==='eighth'?'바레 코드 전환과 8분음표 위에서 루트·5음 교대 베이스와 동시 뜯기를 제어합니다.'
        :mode==='mixed'?'세 손가락 동시 뜯기·바레 전환·8분/16분 리듬 밀도 전환을 함께 연습합니다.'
        :'바레 코드 진행과 연속 16분음표 안에서 두 음 동시 뜯기와 분산음을 교대합니다.'));
  }
  return result;
}
