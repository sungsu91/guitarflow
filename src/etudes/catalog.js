// Sounding MIDI is the source of truth. Guitar notation is written one octave up.
import { curriculumTemplates, CURRICULUM_ORDER } from './curriculum.js';
import { CHORD_STUDY } from './chordStudy.js';
export const TUNING = Object.freeze([64, 59, 55, 50, 45, 40]);
export const ROOTS = Object.freeze(['C', 'D', 'E', 'F', 'G', 'A', 'B']);
export const LEVELS = Object.freeze(['초급', '중급', '고급']);
const NATURAL = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const SHIFT = { C: 0, D: 2, E: 4, F: -7, G: -5, A: -3, B: -1 };
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const PENTA = [0, 3, 5, 7, 10];
const BLUES = [0, 3, 5, 6, 7, 10];
// Explicit movable two-octave shapes; adjacent notes never require a random
// choice among the many equivalent frets for one pitch.
const MAJOR_SHAPE = [[6,8],[6,10],[5,7],[5,8],[5,10],[4,7],[4,9],[4,10],[3,7],[3,9],[3,10],[2,8],[2,10],[1,7],[1,8]];
const PENTA_SHAPE = [[6,8],[6,11],[5,8],[5,10],[4,8],[4,10],[4,13],[3,10],[3,12],[2,11],[2,13]];
const BLUES_SHAPE = [[6,8],[6,11],[5,8],[5,9],[5,10],[4,8],[4,10],[3,8],[3,10],[3,11],[2,8],[2,11],[1,8]];
// C major notes arranged as beginner finger pairs: 1–2, 1–2, 1–3,
// 1–4, 1–3, 1–2. Other keys transpose the whole hand shape intact.
const BEGINNER_FINGER_PAIR_SHAPE = [[6,7],[6,8],[5,7],[5,8],[4,7],[4,9],[3,7],[3,10],[2,8],[2,10],[1,7],[1,8]];
// Same pitches as MAJOR_SHAPE, connected diagonally across positions.
const CONNECTED_SHAPE = [[6,8],[6,10],[6,12],[5,8],[5,10],[5,12],[4,9],[4,10],[4,12],[3,9],[3,10],[3,12],[2,10],[2,12],[2,13]];
const bars = (...patterns) => patterns;
const techniques = (...rows) => rows.map(row => Object.fromEntries(row.map(([index, kind]) => [index, kind])));
export const TECHNIQUES = Object.freeze({ H: '해머온', P: '풀오프', S: '슬라이드' });
export const TEMPLATES = Object.freeze([
  { id: 'first-path', level: '초급', style: '기초', type: '스케일', name: '스케일 줄 왕복', english: 'Scale String Crossing', bpm: 60, family: 'major', shape: MAJOR_SHAPE,
    purpose: '두 줄을 왕복하며 같은 음형을 다음 줄로 연결합니다.',
    patterns: bars([0,1,2,1,0,1,2,3],[2,3,4,3,2,3,4,5],[4,5,6,5,4,5,6,7],[7,6,5,4,3,2,1,0]) },
  { id: 'pop-answer', level: '초급', style: '팝', type: '릭', name: '상행·하행 릭', english: 'Ascending & Descending Lick', bpm: 72, family: 'major', shape: MAJOR_SHAPE,
    purpose: '짧은 상승 프레이즈와 하강 응답을 일정한 8분음표로 연주합니다.',
    patterns: bars([0,2,1,2,3,2,1,0],[2,4,3,4,5,4,3,2],[4,6,5,6,7,6,5,4],[7,5,6,4,5,3,1,0]) },
  { id: 'ballad-line', level: '초급', style: '발라드', type: '릭', name: '4·8분음표 리듬 릭', english: 'Quarter & Eighth Note Lick', bpm: 64, family: 'major', shape: MAJOR_SHAPE, durations: ['4','8','8','4','4'],
    purpose: '4분음표와 8분음표를 구분하며 프레이즈 끝 음을 충분히 유지합니다.',
    patterns: bars([0,1,2,4,2],[3,4,5,4,3],[4,5,6,7,5],[3,2,1,0,0]) },
  { id: 'rock-penta', level: '중급', style: '락', type: '펜타토닉', name: '펜타토닉 포지션 왕복', english: 'Pentatonic Position Run', bpm: 84, family: 'minor', intervals: PENTA, shape: PENTA_SHAPE,
    purpose: '마이너 펜타토닉의 세 음 묶음을 되짚으며 두 옥타브를 왕복합니다.',
    patterns: bars([0,1,2,1,2,3,4,3],[4,5,6,5,6,7,8,7],[8,9,10,9,8,7,8,6],[7,5,6,4,5,3,1,0]) },
  { id: 'blue-turn', level: '초급', style: '블루스', type: '릭', name: '블루 노트 계단 왕복', english: 'Stepwise Blues Note Run', bpm: 64, family: 'minor', intervals: BLUES, shape: BLUES_SHAPE, complete: true,
    purpose: '인접한 줄만 따라가며 블루 노트(♭5)를 한 음씩 통과합니다. 같은 프렛 수직 이동이나 줄 건너뛰기는 사용하지 않습니다.',
    difficultyReason: '초급 후반 · 연속 8분음표로 블루 노트를 익히되, 줄 이동은 인접 줄로 제한하고 같은 프렛 수직 이동은 피합니다.',
    patterns: bars([0,1,0,1,2,3,4,3],[2,3,4,3,2,3,4,5],[4,5,6,5,4,5,6,7],[6,7,8,7,8,9,8,7],[7,8,9,8,9,10,11,10],[10,11,12,11,10,9,8,7],[7,8,7,6,5,4,3,2],[2,3,4,3,2,1,0,0]) },
  { id: 'jazz-seventh', level: '중급', style: '재즈', type: '아르페지오', name: '재즈 메이저7 아르페지오', english: 'Seventh Arpeggio Workout', bpm: 88, family: 'major', shape: CONNECTED_SHAPE,
    purpose: '메이저 세븐의 1·3·5·7음을 줄 건너뛰기와 포지션 이동으로 연결합니다.',
    patterns: bars([0,2,4,6,4,2,4,6],[7,6,4,6,7,9,11,13],[14,13,11,9,11,13,11,9],[7,6,7,4,6,2,4,0]) },
  { id: 'diagonal-sequence', level: '고급', style: '기초', type: '스케일', name: '16분음표 포지션 이동', english: 'Sixteenth Note Scale Run', bpm: 80, family: 'major', shape: CONNECTED_SHAPE, duration: '16',
    purpose: '네 음 시퀀스를 상승·하강하며 여러 포지션을 연결합니다. 한 박에 네 음입니다.',
    patterns: bars([0,1,2,1,2,3,4,3,4,5,6,5,6,7,8,7],[8,9,10,9,10,11,12,11,12,13,14,13,12,11,10,9],[10,9,8,9,8,7,6,7,6,5,4,5,4,3,2,3],[2,3,4,3,4,5,6,5,6,5,4,3,2,1,2,0]) },
  { id: 'triad-start', level: '초급', style: '기초', type: '스케일', name: '손가락 간격 첫걸음', english: 'Finger Pair Foundation', bpm: 48, family: 'major', shape: BEGINNER_FINGER_PAIR_SHAPE, duration: '4', complete: true,
    purpose: '한 마디 동안 한 줄에 머물며 검지와 다음 손가락의 간격을 차례로 익힌 뒤, 마지막 두 마디에서 천천히 내려옵니다.',
    difficultyReason: '초급 입문 · 한 줄에서 두 음만 4분음표로 반복합니다. 새 줄은 다음 마디에서 시작하고 마지막에만 한 음씩 천천히 내려옵니다.',
    patterns: bars([0,1,0,1],[2,3,2,3],[4,5,4,5],[6,7,6,7],[8,9,8,9],[10,11,10,11],[11,10,9,8],[7,5,2,1]) },
  { id: 'hammer-start', level: '초급', style: '기초', type: '해머온', name: '두 음 해머온', english: 'Two-note Hammer-on Exercise', bpm: 50, family: 'major', shape: MAJOR_SHAPE,
    purpose: 'H로 연결된 두 번째 음은 다시 피킹하지 않고 손가락으로 눌러 냅니다.',
    patterns: bars([0,1,0,1,2,4,2,4],[2,4,2,4,5,6,5,6],[8,9,8,9,11,12,11,12],[5,6,2,4,0,1,1,0]),
    techniqueMap: techniques([[0,'H'],[2,'H'],[4,'H'],[6,'H']],[[0,'H'],[2,'H'],[4,'H'],[6,'H']],[[0,'H'],[2,'H'],[4,'H'],[6,'H']],[[0,'H'],[2,'H'],[4,'H']]) },
  { id: 'pull-return', level: '초급', style: '락', type: '풀오프', name: '하행 풀오프 릭', english: 'Descending Pull-off Lick', bpm: 60, family: 'major', shape: MAJOR_SHAPE,
    purpose: 'P의 도착음을 미리 잡고 높은 음에서 낮은 음으로 소리를 연결합니다.',
    patterns: bars([0,1,0,1,0,4,2,2],[3,2,4,2,6,5,6,5],[9,8,9,8,12,11,12,11],[6,5,4,2,3,2,1,0]),
    techniqueMap: techniques([[1,'P'],[3,'P'],[5,'P']],[[0,'P'],[2,'P'],[4,'P'],[6,'P']],[[0,'P'],[2,'P'],[4,'P'],[6,'P']],[[0,'P'],[2,'P'],[4,'P'],[6,'P']]) },
  { id: 'slide-path', level: '중급', style: '발라드', type: '슬라이드', name: '슬라이드로 포지션 연결', english: 'Position Slide Exercise', bpm: 60, family: 'major', shape: CONNECTED_SHAPE,
    purpose: 'SL 선의 두 음을 같은 손가락으로 연결하며 도착 박자를 지킵니다.',
    patterns: bars([0,1,2,1,3,4,5,4],[6,7,8,7,9,10,11,10],[12,13,14,13,12,13,14,12],[11,10,9,8,7,6,1,0]),
    techniqueMap: techniques([[0,'S'],[2,'S'],[4,'S'],[6,'S']],[[0,'S'],[2,'S'],[4,'S'],[6,'S']],[[0,'S'],[2,'S'],[4,'S'],[6,'S']],[[0,'S'],[3,'S'],[6,'S']]) },
  { id: 'triad-cross', level: '중급', style: '팝', type: '아르페지오', name: '두 옥타브 트라이어드', english: 'Two-octave Triad Arpeggio', bpm: 68, family: 'major', shape: CONNECTED_SHAPE,
    purpose: '1·3·5음을 두 옥타브로 연결하면서 줄을 건너뛰는 피킹을 연습합니다.',
    patterns: bars([0,2,4,2,4,7,4,2],[4,7,9,7,9,11,9,7],[7,9,11,14,11,9,11,9],[7,4,7,4,2,4,2,0]) },
  { id: 'legato-phrase', level: '중급', style: '락', type: '레가토', name: '해머·풀·슬라이드 혼합 릭', english: 'Mixed Legato Lick', bpm: 76, family: 'major', shape: CONNECTED_SHAPE,
    purpose: 'H·P·SL를 섞되 표시 없는 음은 피킹해서 프레이즈를 이어갑니다.',
    patterns: bars([0,1,2,1,3,4,5,4],[6,7,8,7,9,10,11,10],[12,13,14,13,12,13,14,12],[11,10,9,8,7,6,1,0]),
    techniqueMap: techniques([[0,'H'],[1,'S'],[2,'P'],[4,'H'],[5,'S'],[6,'P']],[[0,'H'],[1,'S'],[2,'P'],[4,'H'],[5,'S'],[6,'P']],[[0,'H'],[1,'H'],[2,'P'],[4,'S'],[5,'H'],[6,'P']],[[0,'P'],[1,'P'],[3,'S'],[4,'P'],[6,'P']]) },
  ...curriculumTemplates({major:MAJOR_SHAPE,connected:CONNECTED_SHAPE,penta:PENTA_SHAPE,blues:BLUES_SHAPE,pentaIntervals:PENTA,bluesIntervals:BLUES}),
  CHORD_STUDY,
]);

const COURSE_ORDER = [...CURRICULUM_ORDER.slice(0,24),'chord-accompaniment',...CURRICULUM_ORDER.slice(24)];
// Four development bars between the opening three bars and the final cadence.
// Technique studies rearrange intact two-beat cells, preserving their links.
const DEVELOPMENT = {
  'first-path': bars([7,8,9,8,7,8,9,10],[9,10,11,10,9,10,11,12],[11,12,13,12,11,10,9,8],[9,8,7,6,7,8,7,6]),
  'pop-answer': bars([6,8,7,8,9,8,7,6],[8,10,9,10,11,10,9,8],[10,11,12,11,13,12,11,10],[9,7,8,6,7,5,6,7]),
  'ballad-line': bars([5,6,7,9,7],[7,8,9,11,9],[9,10,11,9,7],[7,6,5,4,3]),
  'rock-penta': bars([5,6,7,6,7,8,9,8],[8,9,10,8,9,7,8,6],[6,7,8,6,7,5,6,4],[4,5,6,4,5,6,7,6]),
  'triad-cross': bars([7,9,11,9,11,14,11,9],[11,9,7,9,7,4,7,9],[7,4,2,4,7,9,7,4],[2,4,7,4,7,9,7,4]),
  'jazz-seventh': bars([9,11,13,11,9,7,6,7],[6,4,2,4,6,7,9,7],[9,11,13,14,13,11,9,7],[6,7,9,7,6,4,6,7]),
  'diagonal-sequence': bars([8,7,6,7,8,9,10,9,10,11,12,11,12,13,14,13],[12,11,10,11,10,9,8,9,8,7,6,7,6,5,4,5],[4,5,6,7,6,7,8,9,8,9,10,11,10,11,12,13],[12,11,10,9,10,9,8,7,8,7,6,5,6,5,4,3]),
};

function expandedBars(template) {
  if(template.complete) return template.patterns.map(pattern=>({pattern}));
  const opening = template.patterns.map((pattern, i) => ({pattern, marks:template.techniqueMap?.[i]}));
  const development = DEVELOPMENT[template.id]?.map(pattern => ({pattern})) ?? [2,1,0,1].map((bar, section) => {
    const pattern = template.patterns[bar];
    if (section === 3) return {pattern, marks:template.techniqueMap[bar]};
    return {pattern:[...pattern.slice(4), ...pattern.slice(0,4)],
      marks:Object.fromEntries(Object.entries(template.techniqueMap[bar]).filter(([i]) => Number(i)!==3).map(([i,kind]) => [(Number(i)+4)%8,kind]))};
  });
  return [...opening.slice(0,3), ...development, opening[3]];
}
const TECHNIQUE_TIPS = {
  H: '해머온(H): 첫 음을 피킹한 뒤 같은 줄의 높은 프렛을 손가락으로 눌러 두 번째 음을 냅니다. 두 음의 크기를 비슷하게 유지하세요.',
  P: '풀오프(P): 낮은 프렛을 미리 잡아 둡니다. 높은 프렛의 손가락을 줄에 살짝 걸어 떼어 내고, 도착음은 다시 피킹하지 않습니다.',
  S: '슬라이드(SL): 첫 음을 피킹하고 같은 손가락을 줄에 댄 채 목적 프렛으로 이동합니다. 도착음을 표시된 박자에 맞추세요.',
};

// Editorial difficulty, evaluated at the recommended tempo, not a certificate
// of player proficiency. Genre and technique names do not determine level.
const DIFFICULTY = {
  'triad-start': '초급 입문 · 한 줄에서 두 음만 4분음표로 반복합니다. 새 줄은 다음 마디에서 시작하고 마지막에만 한 음씩 천천히 내려옵니다.',
  'ballad-line': '초급 · 4분·8분음표 구분과 짧은 음형 연결이 중심입니다.',
  'first-path': '초급 · 일정한 8분음표와 인접 줄 이동을 익힙니다.',
  'pop-answer': '초급 · 한 포지션의 짧은 상행·하행 음형을 연결합니다.',
  'hammer-start': '초급 · 느린 두 음 해머온 한 가지 기법에 집중합니다.',
  'pull-return': '초급 · 느린 두 음 풀오프 한 가지 기법에 집중합니다. 낮은 음의 사전 운지가 필요합니다.',
  'blue-turn': '초급 · 일정한 8분음표와 좁은 포지션의 반음 진행입니다. 블루스라는 이름 때문에 난도가 올라가지는 않습니다.',
  'slide-path': '중급 · 여러 줄의 포지션 이동과 슬라이드 도착 박자를 함께 제어합니다.',
  'rock-penta': '중급 · 여러 포지션을 연결하면서 세 음 묶음의 방향을 바꿉니다.',
  'triad-cross': '중급 · 8분음표로 두 옥타브를 이동하며 줄 건너뛰기와 뮤트를 유지합니다.',
  'jazz-seventh': '중급 · 1·3·5·7음의 도약과 포지션 이동이 중심입니다. 단일 메이저7 음형이라 고급 재즈 즉흥 연습으로 분류하지 않습니다.',
  'legato-phrase': '중급 · 8분음표에서 해머온·풀오프·슬라이드를 전환합니다. 복합 기법이지만 속도와 리듬 부담은 제한적입니다.',
  'diagonal-sequence': '고급 · 이 커리큘럼의 상위 단계입니다. 80 BPM의 연속 16분음표(초당 약 5.3음)를 8마디 유지하면서 포지션과 진행 방향을 바꿉니다.',
};

export function spellMidi(midi, root, family, blue = false) {
  const degrees = family === 'major' ? MAJOR : MINOR;
  const interval = ((midi - NATURAL[root]) % 12 + 12) % 12;
  const degree = blue && interval === 6 ? 4 : degrees.indexOf(interval);
  if (degree < 0) throw new Error(`음계 밖의 음: ${root} ${midi}`);
  const letter = ROOTS[(ROOTS.indexOf(root) + degree) % 7];
  let alter = ((midi % 12) - NATURAL[letter] + 18) % 12 - 6;
  const octave = (midi - NATURAL[letter] - alter) / 12 - 1;
  return { letter, alter, octave, key: `${letter.toLowerCase()}${alter === -1 ? 'b' : alter === 1 ? '#' : ''}/${octave + 1}` };
}

export function buildEtude(root, template) {
  const measures = expandedBars(template).map(({pattern, marks}, bar) => pattern.map((index, i) => {
    const [string, baseFret] = template.shape[Math.max(0,index)];
    const fret = baseFret + SHIFT[root];
    const midi = TUNING[string - 1] + fret;
    const nextPosition = template.shape[pattern[i+1]];
    const automatic = template.autoTechnique && index>=0 && nextPosition?.[0]===string && nextPosition[1]!==baseFret
      ? (i%4===1 ? 'S' : nextPosition[1]>baseFret?'H':'P') : null;
    return { string, fret, midi, rest:index<0, duration: template.rhythms?.[bar]?.[i] ?? template.durations?.[i] ?? template.duration ?? '8', technique: marks?.[i] ?? automatic,
      pitch: spellMidi(midi, root, template.family, template.intervals === BLUES) };
  }));
  return { id: `${root}-${template.id}`, root, templateId: template.id, title: `${root} ${template.family === 'major' ? 'Major' : 'Minor'} ${template.name}`,
    english: template.english, level: template.level, style: template.style, type: template.type,
    purpose: template.purpose, bpm: template.bpm, lesson: COURSE_ORDER.indexOf(template.id) + 1,
    difficultyReason: template.difficultyReason ?? DIFFICULTY[template.id],
    accompaniment:Boolean(template.accompaniment),
    chordShapes:template.chordShapes?.map(shape=>({...shape,frets:shape.frets.map(f=>f===null?null:f+SHIFT[root]),barre:shape.barre?{...shape.barre,fret:shape.barre.fret+SHIFT[root]}:null})),
    harmony:template.harmony?.map(([degree,quality])=>{
      const pitch=spellMidi(48+NATURAL[root]+MAJOR[degree],root,'major');
      return `${pitch.letter}${pitch.alter===1?'♯':pitch.alter===-1?'♭':''}${quality}`;
    }),
    tips: [template.difficultyReason ?? DIFFICULTY[template.id], template.purpose, template.complete ? '2마디씩 익힌 뒤 4마디, 8마디로 연결하세요. 같은 음형이 다시 나오는 곳과 변형되는 곳을 귀로 구별해 보세요.' : '1–3마디는 기본 음형, 4–7마디는 음역·음형 변형, 8마디는 으뜸음으로 마무리합니다. 구간별로 익힌 뒤 8마디를 연결하세요.', ...[...new Set(measures.flat().map(n => n.technique).filter(Boolean))].map(t => TECHNIQUE_TIPS[t]),
      template.accompaniment ? '코드표는 왼쪽부터 6→1번줄입니다. ×는 뜯지 않는 줄, 굵은 선은 바레, 왼쪽 숫자는 시작 프렛, 아래 1·2·3·4는 검지·중지·약지·새끼입니다. 3이 연속된 줄은 약지 미니 바레로 잡습니다. 오른손은 엄지로 6·5·4번줄, 검지·중지·약지로 3·2·1번줄을 뜯는 방법부터 연습하세요. 이 과제는 매 음을 끊는 얼터네이트 피킹 과제가 아닙니다.' : template.type === '아르페지오' ? '음을 동시에 울리는 코드가 아닙니다. 한 음씩 연주하고 지나간 줄은 가볍게 뮤트하세요.' : '표시 없는 음은 피킹합니다. 먼저 한 마디씩 반복하고, 리듬이 안정되면 다음 마디와 연결하세요.',
      `권장 시작 템포는 ${template.bpm} BPM입니다. 느리게 시작해 음량과 박자가 고르게 유지되는지 확인하세요.`,
      '같은 템포에서 3회 연속 끊김 없이 연주한 뒤 4 BPM씩 올려 보세요. 손에 불편함이 생기면 쉬고 힘을 줄이세요.'],
    keySignature: root + (template.family === 'minor' ? 'm' : ''),
    meter: [4,4], intervals: template.intervals ?? MAJOR, measures };
}

export function validateEtude(etude) {
  const errors = [];
  etude.measures.forEach((measure, bar) => {
    if (measure.reduce((sum, n) => sum + 4 / Number(n.duration), 0) !== 4) errors.push(`마디 ${bar + 1}: 박자 합계`);
    measure.forEach((n, i) => {
      const label = `${bar + 1}:${i + 1}`;
      if(etude.chordShapes && !n.rest && etude.chordShapes[bar]?.frets[6-n.string]!==n.fret) errors.push(`${label}: 코드표와 TAB 불일치`);
      if (n.string < 1 || n.string > 6 || !Number.isInteger(n.fret) || n.fret < 0 || n.fret > 24) errors.push(`${label}: 운지 범위`);
      if (TUNING[n.string - 1] + n.fret !== n.midi) errors.push(`${label}: TAB 음높이`);
      if ((n.pitch.octave + 1) * 12 + NATURAL[n.pitch.letter] + n.pitch.alter !== n.midi) errors.push(`${label}: 기보 음높이`);
      if (!etude.intervals.includes((n.midi - NATURAL[etude.root] + 120) % 12)) errors.push(`${label}: 음계`);
      if (n.technique) {
        const next = measure[i + 1];
        if (!TECHNIQUES[n.technique] || n.rest || !next || next.rest || next.string !== n.string || next.fret === n.fret) errors.push(`${label}: 기법 연결`);
        else if ((n.technique === 'H' && next.fret < n.fret) || (n.technique === 'P' && next.fret > n.fret)) errors.push(`${label}: 기법 방향`);
      }
    });
  });
  return errors;
}

export const ETUDES = ROOTS.flatMap(root => TEMPLATES.map(template => buildEtude(root, template))).sort((a,b) => a.lesson - b.lesson || ROOTS.indexOf(a.root) - ROOTS.indexOf(b.root));
for (const etude of ETUDES) {
  const errors = validateEtude(etude);
  if (errors.length) throw new Error(`${etude.id}: ${errors.join(', ')}`);
}
