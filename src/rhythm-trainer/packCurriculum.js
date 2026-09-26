import {BEAT_PRESETS,clone} from './model.js';
import {tuplet} from './rhythmMath.js';

// Difficulty is relative to the selected family. Each lesson has one reading task;
// rows are authored, never drawn from the random editor's pool.
const presets=Object.fromEntries(BEAT_PRESETS.map(p=>[p.id,p.beat]));
const beat=id=>clone(presets[id]);
const cells={
 q:beat('quarter'), e:beat('eighths'), s:beat('sixteenths'),
 a:beat('eighth-sixteenths'), b:beat('sixteenth-eighth-sixteenth'), c:beat('sixteenths-eighth'),
 r:beat('quarter-rest'), h:beat('eighth-rest'), o:beat('rest-eighth'),
 l:beat('rest-sixteenth-eighth'), f:beat('eighth-sixteenth-rest'),
 z:[{ticks:3,rest:true},{ticks:3,rest:false},{ticks:3,rest:false},{ticks:3,rest:false}],
 d:beat('dotted-eighth'), v:beat('sixteenth-dotted'), t:tuplet(3),
 u:[{ticks:6,rest:false},...tuplet(3,[],true)],
 w:[...tuplet(3,[],true),{ticks:6,rest:false}],
};
for(const n of [5,6,7])cells[`t${n}`]=tuplet(n);
for(const key of ['q','e','o','d']){cells[`${key}_`]=clone(cells[key]);cells[`${key}_`].at(-1).tie=true;}
const parse=text=>text.split(' ').map(key=>{if(!cells[key])throw Error(`Unknown curriculum cell: ${key}`);return clone(cells[key]);});
const steady=text=>Array(4).fill(Array(4/text.split(' ').length).fill(text).join(' '));
export const CURRICULUM=[];
function add(family,level,bpm,items){
 items.forEach(([id,ko,en,core,rows,goalKo,goalEn,reference],index)=>{
  const measures=rows.map(parse), motif=parse(core);
  const pure=measures.every(row=>row.every((b,i)=>JSON.stringify(b)===JSON.stringify(motif[i%motif.length])));
  CURRICULUM.push({id,family,level,bpm,order:index+1,ko,en,core:motif,measures,goalKo,goalEn,reference,
   step:pure?'foundation':level==='hard'?'application':'combination'});
 });
}
add('basic','easy',80,[
 ['quarter-foundation','4분음표 · 일정한 네 박','Steady quarters','q',steady('q'),'네 박을 같은 간격으로 칩니다.','Keep four evenly spaced beats.'],
 ['eighths-foundation','8분음표 · 한 박에 두 번','Steady eighths','e',steady('e'),'한 박을 둘로 고르게 나눕니다.','Split each beat into two equal parts.'],
 ['quarter-eighth-pair','4분·8분 · 두 박 반복','Quarter/eighth pairs','q e',steady('q e'),'한 번과 두 번 치기를 두 박 단위로 반복합니다.','Repeat one attack then two attacks over two beats.'],
]);
add('basic','medium',88,[
 ['basic-two-beat-switch','두 박씩 4분·8분 전환','Two-beat changes','q e',['q q e e','q q e e','e e q q','e e q q'],'두 박을 유지한 뒤 분할을 바꿉니다.','Hold each subdivision for two beats before changing.'],
 ['basic-eighth-entry','8분음표 진입 위치','Eighth-note entry','e',['e q q q','q e q q','q q e q','q q q e'],'8분음표가 들어가는 박을 놓치지 않습니다.','Place a pair of eighths on each beat in turn.'],
 ['basic-quarter-return','8분 진행 · 한 박 쉬고 복귀','Eighths with a quarter-rest return','e',['e e q q','e e q r','e q e q','e e q r'],'둘째·넷째 마디 끝만 한 박 쉬고 다음 정박에 복귀합니다.','Rest only at the end of bars two and four, then return on the beat.'],
]);
add('basic','hard',96,[
 ['basic-one-three','1+3 박 길이 전환','One/three-beat changes','q e',['q e e e','e e e q','e q q q','q q q e'],'한 박과 세 박 길이로 분할을 바꿉니다.','Switch subdivisions in one- and three-beat phrases.'],
 ['basic-offbeat-entry','2·4박에서 8분 시작','Eighths on beats two and four','q e',['q e q e','e q e q','q e e q','e q q e'],'2·4박의 분할 변화에도 박을 유지합니다.','Keep the pulse through changes on beats two and four.'],
 ['basic-four-bar-phrase','4분·8분 · 짧은 쉼과 복귀','Quarter/eighth phrase with short rests','e q',['e q e e','q e e h','e e q e','e h e q'],'반 박 쉼을 두 곳만 넣어 4분·8분 흐름을 유지합니다.','Keep quarters and eighths flowing through just two half-beat rests.'],
]);
add('sixteenth','easy',60,[
 ['eighth-sixteenths-foundation','8·16·16 · 길게 시작','Eighth + two sixteenths','a',steady('a'),'1은 길게, &와 a는 짧게 칩니다.','Hold the first eighth, then strike on & and a.'],
 ['sixteenths-eighth-foundation','16·16·8 · 길게 마무리','Two sixteenths + eighth','c',steady('c'),'1·e에서 치고 &의 음을 유지합니다.','Strike on 1 and e, then hold the &.'],
 ['sixteenths-foundation','16분 네 개 · 균등 분할','Four equal sixteenths','s',steady('s'),'1 e & a를 같은 간격으로 칩니다.','Keep 1 e & a evenly spaced.'],
]);
add('sixteenth','medium',68,[
 ['sixteenth-eighth-sixteenth-foundation','16·8·16 · 가운데 유지','Sixteenth + eighth + sixteenth','b',steady('b'),'e에서 친 음을 &까지 유지합니다.','Hold the note on e through &.'],
 ['sixteenth-long-short-contrast','긴 음의 앞·뒤 위치 비교','Long note at either end','a c',['a a c c','a c a c','c c a a','c a c a'],'8분음표가 앞에 있을 때와 뒤에 있을 때를 비교합니다.','Compare the long note at the start and end of a beat.'],
 ['eighth-sixteenths-combination','8·16·16 · 한 박 쉬고 복귀','Split eighths with a rest return','a',['a e a e','a e a r','e a e a','a e a r'],'둘째·넷째 마디 끝만 쉬고 익숙한 모양으로 복귀합니다.','Rest only at the end of bars two and four, then return to the same shape.'],
]);
add('sixteenth','hard',76,[
 ['sixteenth-three-shapes','긴 음 위치 세 가지','Three long-note positions','a b',['a b c a','b c a b','c a b c','a c b a'],'8분음표의 앞·가운데·뒤 위치를 구별합니다.','Track the long note at the start, middle and end.'],
 ['sixteenth-fill-return','16분 연속에서 가운데 유지','Sixteenths and a held middle','s b',['s s b b','s b s b','b s b s','b b s s'],'네 번 치기와 가운데 유지 리듬을 전환합니다.','Alternate four attacks with a held middle note.'],
 ['eighth-sixteenths','8·16·16 · 16분 문장','Split-eighth phrase','a',['a c b s','a b c a','c s a b','b c a s'],'세 기본 모양과 균등 분할만 연결합니다.','Link the three basic shapes with even sixteenths.','reference-eighth-sixteenths'],
]);
add('rests','easy',72,[
 ['quarter-rest-return','한 박 쉬고 정박 복귀','Quarter-rest return','q r',steady('q r'),'한 박 동안 쉰 뒤 다음 정박에 들어갑니다.','Rest a full beat and return on the next beat.'],
 ['eighth-rest-foundation','8분 뒤 쉬기','Eighth then rest','h',steady('h'),'앞 반 박만 치고 뒤 반 박은 쉽니다.','Play the first half and rest the second half.'],
 ['rest-eighth-foundation','반 박 쉬고 엇박 진입','Rest then eighth','o',steady('o'),'정박은 쉬고 &에서 칩니다.','Rest on the beat and strike on &.'],
]);
add('rests','medium',72,[
 ['rest-front-back','앞 쉼·뒤 쉼 구별','Leading/trailing eighth rests','h o',['h h o o','h o h o','o o h h','o h o h'],'쉼표가 앞인지 뒤인지 구별합니다.','Distinguish a rest before the attack from one after it.'],
 ['rest-offbeat-return','엇박에서 8분으로 복귀','Offbeat to eighths','o e',['o e o e','e o e o','o o e e','e e o o'],'&에서 시작한 뒤 일정한 8분으로 돌아옵니다.','Return to steady eighths after an offbeat entry.'],
 ['rest-bar-end','마디 끝 한 박 쉬기','Rest at the end of the bar','q r',['e e q r','e q e r','q e e r','e e e r'],'마지막 박을 세며 다음 마디 첫 박을 준비합니다.','Count the final rest and prepare the next downbeat.'],
]);
add('rests','hard',72,[
 ['rest-three-sixteenths','16분쉼표 뒤 진입','Sixteenth-rest entry','z',['z q z q','z e z e','e z e z','z s z q'],'정박의 16분 한 칸을 쉬고 e에서 들어갑니다.','Rest on 1 and enter on e.','reference-rest-three'],
 ['rest-sixteenth-release','마지막 16분 쉬기','Release the final sixteenth','f',['f e f e','f f e e','e f e f','e e f f'],'마지막 a는 쉬고 다음 정박을 정확히 칩니다.','Rest on a and return precisely on the next beat.'],
 ['rest-sixteenth-boundary','앞·뒤 16분쉼표 연결','Leading/trailing sixteenth rests','l f',['l l f f','l f l f','f f l l','f l f l'],'16분쉼표가 박의 앞과 뒤에 올 때를 비교합니다.','Compare sixteenth rests at the two edges of the beat.'],
]);
add('dotted','easy',60,[
 ['dotted-eighth-foundation','점8분·16분 · 3:1','Dotted eighth + sixteenth','d',steady('d'),'세 칸을 유지하고 마지막 한 칸에서 칩니다.','Hold three slots and strike the final slot.'],
 ['sixteenth-dotted-foundation','16분·점8분 · 1:3','Sixteenth + dotted eighth','v',steady('v'),'첫 칸을 치고 다음 음을 세 칸 유지합니다.','Strike one short slot, then hold three slots.'],
 ['dotted-quarter-hold','점4분 길이 · 박을 넘겨 유지','Dotted-quarter duration','q_ e',steady('q_ e'),'4분과 다음 8분을 이어 한 박 반을 유지합니다.','Tie a quarter to the next eighth for one and a half beats.'],
]);
add('dotted','medium',68,[
 ['dotted-vs-even','점음표와 균등 8분 비교','Dotted and even eighths','d',['d e d e','d d e e','e d e d','e e d d'],'3:1과 1:1 간격을 분명하게 구별합니다.','Distinguish the 3:1 and 1:1 spacing.'],
 ['reverse-dotted-vs-even','짧게 시작한 뒤 8분 복귀','Reverse dotted and even eighths','v',['v e v e','v v e e','e v e v','e e v v'],'짧은 시작을 유지하고 균등 분할로 돌아옵니다.','Keep the short entry precise before returning to even notes.'],
 ['dotted-direction','점음표 앞·뒤 비교','Forward/reverse dotted rhythm','d v',['d d v v','d v d v','v v d d','v d v d'],'긴 음이 앞일 때와 뒤일 때를 비교합니다.','Compare long-short and short-long timing.'],
]);
add('dotted','hard',76,[
 ['dotted-sixteenth-return','점음표에서 16분 복귀','Dotted to sixteenths','d',['d s d s','d d s s','s d s d','s s d d'],'점음표의 세 칸 길이를 16분 네 칸과 비교합니다.','Compare the dotted hold with four even slots.'],
 ['reverse-dotted-sixteenth','16분에서 짧은 시작으로','Sixteenths to reverse dotted','v',['v s v s','v v s s','s v s v','s s v v'],'네 칸을 센 채 1:3 리듬으로 바꿉니다.','Keep the four-slot grid while changing to 1:3.'],
 ['dotted-eighth','점음표 양방향 문장','Dotted rhythm phrase','d v',['d v s s','v d s d','d s v s','v s d v'],'점음표 두 모양과 16분만으로 문장을 읽습니다.','Read a phrase with the two dotted shapes and sixteenths.'],
]);
add('ties','easy',60,[
 ['tie-quarter-pair','4분 둘 잇기 · 두 박 유지','Tie two quarters','q_ q',steady('q_ q'),'두 번째 박은 다시 치지 않고 유지합니다.','Hold through the second beat without another attack.'],
 ['tie-eighth-to-quarter','8분에서 다음 정박까지','Eighth tied to next quarter','e_ q',steady('e_ q'),'&에서 친 음을 다음 정박까지 이어 갑니다.','Carry the & across the following downbeat.'],
 ['offbeat-tie-foundation','엇박 이음줄 · 두 박 반복','Repeated offbeat tie','o_ e',steady('o_ e'),'첫 정박을 쉬고 &를 다음 박까지 유지합니다.','Rest on the first downbeat and sustain & across the next beat.'],
]);
add('ties','medium',68,[
 ['tie-position','이음줄 시작 위치 옮기기','Move the tie start','q_ q',['q_ q e e','e q_ q e','e e q_ q','q_ q q_ q'],'2박 길이를 유지하며 시작 위치만 바꿉니다.','Move a two-beat hold without changing its duration.'],
 ['tie-eighth-release','이음줄 뒤 8분으로 복귀','Release into eighths','e_ e',['e_ e q q','q e_ e q','q q e_ e','e_ e e_ e'],'다음 정박은 유지하고 그 박의 &에서 다시 칩니다.','Hold the next downbeat and strike again on its &.'],
 ['tie-barline-basic','마디선을 넘는 이음줄','Tie across a barline','q_ q',['q_ q e q_','q e e q_','q q e q_','q e q q'],'마디가 바뀌어도 연결된 첫 음을 다시 치지 않습니다.','Do not retrigger the tied note when the bar changes.'],
]);
add('ties','hard',72,[
 ['offbeat-tie','엇박 이음줄 · 마디선 연결','Offbeat ties across bars','o_ e',['o_ e q e_','e q o_ e','q o_ e e_','e o_ e q'],'엇박에서 마디를 넘겨도 다음 정박을 다시 치지 않습니다.','Carry offbeat attacks across beats and barlines.'],
 ['tie-sixteenth-release','이음줄에서 16분으로 복귀','Tie into sixteenths','e_ s',['e_ s q e_','s q e_ s','q e_ s e_','s e_ s q'],'연결된 첫 16분은 유지하고 나머지 세 음만 칩니다.','Hold the tied first sixteenth and strike the remaining three.'],
 ['tie-dotted-release','점음표 이음줄 연결','Dotted tie release','d_ e',['d_ e q d_','e q d_ e','q d_ e d_','e d_ e q'],'점음표의 마지막 짧은 음을 다음 박으로 연결합니다.','Tie the short note after a dotted note into the next beat.'],
]);
add('triplet','easy',60,[
 ['triplet-first-entry','셋잇단 첫 진입','First triplet entry','t',['t q q q','t q q q','t q q q','t q q q'],'첫 박만 셋으로 나누고 나머지는 박을 확인합니다.','Divide the first beat into three, then check the pulse.'],
 ['triplet-two-beats','셋잇단 두 박 연결','Two consecutive triplet beats','t',['t t q q','t t q q','t t q q','t t q q'],'두 박 동안 세 음씩 같은 간격으로 칩니다.','Keep even triplets over two consecutive beats.'],
 ['triplets-foundation','셋잇단 · 고른 분할','Steady triplets','t',steady('t'),'한 박에 세 음을 고르게 반복합니다.','Repeat three equal notes per beat.'],
]);
add('triplet','medium',66,[
 ['triplet-entry-position','셋잇단 진입 위치','Move the triplet entry','t',['t q q q','q t q q','q q t q','q q q t'],'1·2·3·4박 각각에서 셋잇단을 시작합니다.','Start triplets on each beat in turn.'],
 ['triplets-combination','8분과 셋잇단 · 둘과 셋','Eighths and triplets','t',['t t e e','e e t t','t e t e','e t e t'],'한 박의 길이는 그대로 두고 둘과 셋을 바꿉니다.','Keep the beat length while alternating two and three.'],
 ['triplet-sixteenth-contrast','셋잇단과 16분 · 셋과 넷','Triplets and sixteenths','t',['t t s s','s s t t','t s t s','s t s t'],'셋과 넷의 간격을 두 박씩 먼저 비교합니다.','Compare groups of three and four in two-beat phrases first.'],
]);
add('triplet','hard',72,[
 ['eighth-triplet-tail','8분 뒤 반 박 셋잇단','Eighth + half-beat triplet','u',['u q u q','u e u e','t u t u','u t e q'],'박의 뒤 절반만 셋으로 나눕니다.','Divide only the second half of the beat into three.','reference-triplet-tail'],
 ['triplet-short-front','반 박 셋잇단 뒤 8분','Half-beat triplet + eighth','w',['w q w q','w e w e','t w t w','w t e q'],'박의 앞 절반을 셋으로 나눈 뒤 8분을 유지합니다.','Divide the first half into three, then hold an eighth.'],
 ['triplets','한 박·반 박 셋잇단 비교','Full- and half-beat triplets','t',['t u t w','u t w t','t t u w','w u t t'],'세 음 묶음이 한 박인지 반 박인지 구별합니다.','Distinguish triplets spanning a full beat from half a beat.'],
]);
// The same pulse-to-subdivision learning sequence is meaningful for each N-tuplet.
// No random missing notes or unrelated tuplet counts are introduced to fill quotas.
for(const [n,family] of [[5,'quintuplet'],[6,'sextuplet'],[7,'septuplet']]){
 const x=`t${n}`,name=`${n}잇단`,en=`${n}-tuplet`;
 add(family,'easy',50,[
  [`${n}-first-entry`,`${name} · 첫 박 진입`,`${en} first entry`,x,[`${x} q q q`,`${x} q q q`,`${x} q q q`,`${x} q q q`],`첫 박을 ${n}등분하고 나머지 박에서 간격을 확인합니다.`,`Divide the first beat into ${n}, then check the pulse.`],
  [`${n}-two-beats`,`${name} · 두 박 연결`,`${en} over two beats`,x,[`${x} ${x} q q`,`${x} ${x} q q`,`${x} ${x} q q`,`${x} ${x} q q`],`두 박 동안 ${n}개씩 이어 치고 정박으로 돌아옵니다.`,`Play ${n} notes per beat twice, then return to quarters.`],
  [`${n}-even-foundation`,`${name} · 고른 분할`,`${en} even subdivision`,x,steady(x),`매 박을 ${n}등분하며 첫 음의 위치를 유지합니다.`,`Keep each beat's first note stable through ${n} equal divisions.`,n===6?'reference-six':n===7?'reference-seven':undefined],
 ]);
 add(family,'medium',56,[
  [`${n}-entry-position`,`${name} · 진입 위치`,`${en} entry positions`,x,[`${x} q q q`,`q ${x} q q`,`q q ${x} q`,`q q q ${x}`],'진입 위치만 옮기며 한 박의 길이를 유지합니다.','Move the entry while keeping one beat unchanged.'],
  [`${n}-eighth-blocks`,`${name}과 8분 · 두 박씩`,`${en} and eighths in pairs`,x,[`${x} ${x} e e`,`e e ${x} ${x}`,`${x} ${x} e e`,`e e ${x} ${x}`],`두 박씩 ${n}등분과 2등분을 비교합니다.`,`Compare ${n} and two subdivisions in two-beat phrases.`],
  [`${n}-eighth-alternate`,`${name}과 8분 · 한 박씩`,`${en} and eighths alternating`,x,[`${x} e ${x} e`,`e ${x} e ${x}`,`${x} e ${x} e`,`e ${x} e ${x}`],`매 박마다 ${n}등분과 2등분을 바꿉니다.`,`Switch between ${n} and two subdivisions every beat.`],
 ]);
 add(family,'hard',60,[
  [`${n}-sixteenth-blocks`,`${name}과 16분 · 두 박씩`,`${en} and sixteenths in pairs`,x,[`${x} ${x} s s`,`s s ${x} ${x}`,`${x} ${x} s s`,`s s ${x} ${x}`],`두 박씩 ${n}등분과 4등분의 간격을 비교합니다.`,`Compare ${n} and four subdivisions in two-beat phrases.`],
  [`${n}-even`,`${name}과 16분 · 한 박씩`,`${en} and sixteenths alternating`,x,[`${x} s ${x} s`,`s ${x} s ${x}`,`${x} s ${x} s`,`s ${x} s ${x}`],`같은 박 길이 안에서 ${n}개와 네 개를 번갈아 칩니다.`,`Alternate ${n} and four notes within equal beats.`],
  [`${n}-pulse-return`,`${name} · 8분에서 16분으로`,`${en} between eighths and sixteenths`,x,[`${x} e ${x} s`,`e ${x} s ${x}`,`${x} s ${x} e`,`s ${x} e ${x}`],'한 종류의 연음만 사용해 8분·16분으로 복귀합니다.','Return from one tuplet type to eighths and sixteenths.'],
 ]);
}
add('mixed','easy',60,[
 ['mixed-eighth-split','8분과 뒤쪽 16분','Eighths and split endings','e a',steady('e a'),'8분의 뒤 절반만 나누는 차이를 익힙니다.','Compare eighths with a subdivided second half.'],
 ['mixed-eighth-short-front','8분과 앞쪽 16분','Eighths and split starts','e c',steady('e c'),'8분의 앞 절반만 나누는 차이를 익힙니다.','Compare eighths with a subdivided first half.'],
 ['mixed-eighth-dotted','균등 8분과 점음표','Even and dotted eighths','e d',steady('e d'),'2:2와 3:1 간격을 두 박 반복으로 익힙니다.','Repeat the difference between 2:2 and 3:1 over two beats.'],
]);
add('mixed','medium',68,[
 ['mixed-held-middle','8분과 가운데 유지','Eighths and held middles','e b',['e e b b','b b e e','e b e b','b e b e'],'균등 분할과 가운데 유지 리듬을 비교합니다.','Compare equal divisions with a held middle note.'],
 ['mixed-dotted-split','점음표와 8·16·16','Dotted and split eighths','d a',['d d a a','a a d d','d a d a','a d a d'],'3:1과 2:1:1의 간격 차이를 익힙니다.','Compare 3:1 and 2:1:1 spacing.'],
 ['paired-sixteenth-rest','8·16·16과 쉼·16·8','Split eighths and a rest entry','a l',['a l e e','e e a l','a l a l','e a l e'],'두 핵심 모양을 비교하고 8분으로 복귀합니다.','Compare the two core shapes and return to eighths.','reference-paired'],
]);
add('mixed','hard',72,[
 ['mixed-two-three-four','2·3·4등분 기본 전환','Two/three/four subdivisions','e t',['e t s q','t s e q','s e t q','e s t q'],'8분·셋잇단·16분을 한 박씩 비교합니다.','Compare eighths, triplets and sixteenths one beat at a time.'],
 ['mixed-dotted-middle','점음표와 가운데 유지','Dotted and held middles','d b',['d d b b','b b d d','d b d b','b d b d'],'긴 음이 놓이는 위치를 바꾸며 박을 유지합니다.','Keep the pulse while changing the long note position.'],
 ['mixed-tie-return','엇박 이음줄에서 16분 복귀','Offbeat tie to sixteenths','o_ e',['o_ e s q','s o_ e q','q s o_ e','o_ e q s'],'두 박 이음줄을 유지한 뒤 16분으로 돌아옵니다.','Hold a two-beat tie before returning to sixteenths.'],
]);
