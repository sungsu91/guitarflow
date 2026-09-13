// Sounding MIDI is the source of truth. Guitar notation is written one octave up.
import { curriculumTemplates } from './curriculum.js';
import { trackStudies } from './trackStudies.js';
import { TRACK_ORDER, getTrack } from './tracks.js';
import { chordStudies } from './openChordStudies.js';
import scoreOverrides from './scoreOverrides.json' with {type:'json'};
import {compileScoreDocument} from './scoreDocument.js';
import { TUNING, ROOTS, NATURAL, MAJOR, MINOR, PENTA, BLUES, TECHNIQUES, spellMidi, parseChord, validateEtude } from './notationData.js';
export { TUNING, ROOTS, TECHNIQUES, spellMidi, parseChord, validateEtude } from './notationData.js';
export const LEVELS = Object.freeze(['초급', '중급', '고급']);
// Authored concert-pitch routes: G major/minor, C major and A blues, all within frets 0–8.
// Different string choices are written explicitly, never guessed at runtime.
const MAJOR_SHAPE = [[6,3],[6,5],[5,2],[5,3],[5,5],[4,2],[4,4],[4,5],[3,2],[3,4],[3,5],[2,3],[2,5],[1,2],[1,3]];
const PENTA_SHAPE = [[6,3],[6,6],[5,3],[5,5],[4,3],[4,5],[4,8],[3,5],[3,7],[2,6],[2,8]];
const BLUES_SHAPE = [[6,5],[6,8],[5,5],[5,6],[5,7],[4,5],[4,7],[3,5],[3,7],[3,8],[2,5],[2,8],[1,5]];
// G-major finger pairs at frets 2–5: one fretted pair per string.
const BEGINNER_FINGER_PAIR_SHAPE = [[6,2],[6,3],[5,2],[5,3],[4,2],[4,4],[3,2],[3,5],[2,3],[2,5],[1,2],[1,3]];
// C-major route with three notes per string, explicitly placed at frets 3–8.
const CONNECTED_SHAPE = [[5,3],[5,5],[5,7],[4,3],[4,5],[4,7],[3,4],[3,5],[3,7],[2,5],[2,6],[2,8],[1,5],[1,7],[1,8]];
const bars = (...patterns) => patterns;
const techniques = (...rows) => rows.map(row => Object.fromEntries(row.map(([index, kind]) => [index, kind])));
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
  { id: 'jazz-seventh', level: '중급', style: '재즈', type: '코드톤 런', name: '재즈 메이저7 아르페지오', english: 'Seventh Arpeggio Workout', bpm: 88, family: 'major', shape: CONNECTED_SHAPE,
    purpose: '메이저 세븐의 1·3·5·7음을 줄 건너뛰기와 포지션 이동으로 연결합니다.',
    patterns: bars([0,2,4,6,4,2,4,6],[7,6,4,6,7,9,11,13],[14,13,11,9,11,13,11,9],[7,6,7,4,6,2,4,0]) },
  { id: 'diagonal-sequence', level: '고급', style: '기초', type: '스케일', name: '16분음표 포지션 이동', english: 'Sixteenth Note Scale Run', bpm: 80, family: 'major', shape: CONNECTED_SHAPE, duration: '16',
    purpose: '네 음 시퀀스를 상승·하강하며 여러 포지션을 연결합니다. 한 박에 네 음입니다.',
    patterns: bars([0,1,2,1,2,3,4,3,4,5,6,5,6,7,8,7],[8,9,10,9,10,11,12,11,12,13,14,13,12,11,10,9],[10,9,8,9,8,7,6,7,6,5,4,5,4,3,2,3],[2,3,4,3,4,5,6,5,6,5,4,3,2,1,2,0]) },
  { id: 'triad-start', fixedRoot:'G', level: '초급', style: '기초', type: '스케일', name: '손가락 간격 첫걸음', english: 'Finger Pair Foundation', bpm: 48, family: 'major', shape: BEGINNER_FINGER_PAIR_SHAPE, duration: '4', complete: true,
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
  { id: 'triad-cross', level: '중급', style: '팝', type: '코드톤 런', name: '두 옥타브 트라이어드', english: 'Two-octave Triad Arpeggio', bpm: 68, family: 'major', shape: CONNECTED_SHAPE,
    purpose: '1·3·5음을 두 옥타브로 연결하면서 줄을 건너뛰는 피킹을 연습합니다.',
    patterns: bars([0,2,4,2,4,7,4,2],[4,7,9,7,9,11,9,7],[7,9,11,14,11,9,11,9],[7,4,7,4,2,4,2,0]) },
  { id: 'legato-phrase', level: '중급', style: '락', type: '레가토', name: '해머·풀·슬라이드 혼합 릭', english: 'Mixed Legato Lick', bpm: 76, family: 'major', shape: CONNECTED_SHAPE,
    purpose: 'H·P·SL를 섞되 표시 없는 음은 피킹해서 프레이즈를 이어갑니다.',
    patterns: bars([0,1,2,1,3,4,5,4],[6,7,8,7,9,10,11,10],[12,13,14,13,12,13,14,12],[11,10,9,8,7,6,1,0]),
    techniqueMap: techniques([[0,'H'],[1,'S'],[2,'P'],[4,'H'],[5,'S'],[6,'P']],[[0,'H'],[1,'S'],[2,'P'],[4,'H'],[5,'S'],[6,'P']],[[0,'H'],[1,'H'],[2,'P'],[4,'S'],[5,'H'],[6,'P']],[[0,'P'],[1,'P'],[3,'S'],[4,'P'],[6,'P']]) },
  ...curriculumTemplates({major:MAJOR_SHAPE,connected:CONNECTED_SHAPE,penta:PENTA_SHAPE,blues:BLUES_SHAPE,pentaIntervals:PENTA,bluesIntervals:BLUES}),
  ...trackStudies({penta:PENTA_SHAPE,pentaIntervals:PENTA}),
  ...chordStudies(),
].map(template=>({...template,fixedRoot:template.fixedRoot ?? (template.shape===MAJOR_SHAPE || template.shape===PENTA_SHAPE ? 'G' : template.family==='minor' ? 'A' : 'C')})));

const COURSE_ORDER = TRACK_ORDER;
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
  if(template.complete) return template.patterns.map((pattern,i)=>({pattern, marks:template.techniqueMap?.[i]}));
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

export function buildEtude(template) {
  const root = template.fixedRoot;
  const spelling = (midi,bar) => {
    const chord=template.chordNames?.[bar] ? parseChord(template.chordNames[bar]) : null;
    return spellMidi(midi,chord?.root??root,chord?.family??template.family,template.intervals===BLUES);
  };
  const measures = expandedBars(template).map(({pattern, marks}, bar) => pattern.map((index, i) => {
    const indices = Array.isArray(index) ? index : [index];
    const [string, baseFret] = template.shape[Math.max(0,indices[0])];
    const fret = baseFret;
    const midi = TUNING[string - 1] + fret;
    const nextPosition = template.shape[pattern[i+1]];
    const automatic = template.autoTechnique && index>=0 && nextPosition?.[0]===string && nextPosition[1]!==baseFret
      ? (i%4===1 ? 'S' : nextPosition[1]>baseFret?'H':'P') : null;
    const tones = indices.length > 1 ? indices.map(position => {
      const [s, f] = template.shape[position];
      const sounding = TUNING[s-1] + f;
      return {string:s, fret:f, midi:sounding, pitch:spelling(sounding,bar)};
    }) : undefined;
    return { string, fret, midi, tones, rest:index<0, duration: template.rhythms?.[bar]?.[i] ?? template.durations?.[i] ?? template.duration ?? '8', technique: marks?.[i] ?? automatic,
      pitch: spelling(midi,bar) };
  }));
  return { id: `${root}-${template.id}`, root, templateId: template.id, title: template.name,
    english: template.english, level: template.level, style: template.style, type: template.type,
    purpose: template.purpose, bpm: template.bpm, lesson: COURSE_ORDER.indexOf(template.id) + 1,
    trackLesson: getTrack(template.type).stages[LEVELS.indexOf(template.level)][1].indexOf(template.id) + 1,
    difficultyReason: template.difficultyReason ?? DIFFICULTY[template.id],
    accompaniment:Boolean(template.accompaniment),
    chordShapes:template.chordShapes,
    harmony:template.chordNames ?? template.harmony?.map(([degree,quality])=>{
      const pitch=spellMidi(48+NATURAL[root]+MAJOR[degree],root,'major');
      return `${pitch.letter}${pitch.alter===1?'♯':pitch.alter===-1?'♭':''}${quality}`;
    }),
    tips: [template.difficultyReason ?? DIFFICULTY[template.id], template.purpose, template.complete ? '2마디씩 익힌 뒤 4마디, 8마디로 연결하세요. 같은 음형이 다시 나오는 곳과 변형되는 곳을 귀로 구별해 보세요.' : '1–3마디는 기본 음형, 4–7마디는 음역·음형 변형, 8마디는 으뜸음으로 마무리합니다. 구간별로 익힌 뒤 8마디를 연결하세요.', ...[...new Set(measures.flat().map(n => n.technique).filter(Boolean))].map(t => TECHNIQUE_TIPS[t]),
      template.accompaniment ? 'TAB 숫자가 세로로 겹친 곳은 동시에 뜯습니다. 엄지(p)로 베이스, 검지(i)·중지(m)·약지(a)로 3·2·1번줄을 맡으세요. 같은 코드 안에서는 왼손 모양을 유지해 음이 겹쳐 울리게 하고(let ring), 쉼표나 코드가 바뀔 때 이전 음을 정리합니다.' : template.type === '코드톤 런' ? '리드용 코드 구성음 연습입니다. 한 음씩 연주하고 지나간 줄은 가볍게 뮤트하세요. 코드 모양을 유지하며 베이스와 높은 음을 함께 뜯는 반주는 아르페지오 과정에 있습니다.' : '표시 없는 음은 피킹합니다. 먼저 한 마디씩 반복하고, 리듬이 안정되면 다음 마디와 연결하세요.',
      ...(template.accompaniment ? ['코드표는 위에서 아래로 1→6번줄이며 프렛은 오른쪽으로 높아집니다. ×는 뜯지 않는 줄, ○는 개방현, 굵은 세로선은 바레, 아래 fr는 시작 프렛입니다. 원 안의 1·2·3·4는 검지·중지·약지·새끼손가락입니다. 같은 프렛도 손 모양을 유지하므로 매번 손가락을 옮겨 누르지 않습니다.'] : []),
      `권장 시작 템포는 ${template.bpm} BPM입니다. 느리게 시작해 음량과 박자가 고르게 유지되는지 확인하세요.`,
      '같은 템포에서 3회 연속 끊김 없이 연주한 뒤 4 BPM씩 올려 보세요. 손에 불편함이 생기면 쉬고 힘을 줄이세요.'],
    keySignature: root + (template.family === 'minor' ? 'm' : ''),
    meter: [4,4], intervals: template.intervals ?? MAJOR, measures };
}

export const BASE_ETUDES = TEMPLATES.map(buildEtude).sort((a,b) => a.lesson - b.lesson);
export const ETUDES = BASE_ETUDES.map(base=>{
  const document=scoreOverrides[base.templateId];
  if(!document)return base;
  const result=compileScoreDocument(document,base);
  if(!result.score)throw new Error(`${base.templateId}: ${result.errors.join(', ')}`);
  return {...result.score,edited:false};
});
for (const etude of ETUDES) {
  const errors = validateEtude(etude);
  if (errors.length) throw new Error(`${etude.id}: ${errors.join(', ')}`);
}
