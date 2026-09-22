import {getTrack} from './tracks.js';
import {parseChord,NATURAL} from './notationData.js';
const levels=['초급','중급','고급'];
const pureTriads=new Set(['triad-three-strings','triad-eighth-answer','triad-major-minor','triad-cross','triad-engine']);
const sevenths=new Set(['jazz-seventh','seventh-weave','codetone-guide-tones']);
export function educationIssues(score){
 const errors=[];
 score.measures.forEach((bar,b)=>bar.forEach((e,i)=>{if(e.rest)return;const chord=score.harmony?.[b]?parseChord(score.harmony[b]):null;
  let allowed=null;
  if(pureTriads.has(score.templateId))allowed=chord??{pc:NATURAL[score.root],intervals:[0,4,7]};
  if(sevenths.has(score.templateId))allowed=chord??{pc:NATURAL[score.root],intervals:[0,4,7,11]};
  if(score.templateId==='pop-chord-route'&&Number(e.duration)<=4)allowed=chord;
  if(allowed)for(const n of e.tones??[e])if(!allowed.intervals.includes((n.midi-allowed.pc+120)%12))errors.push(`${b+1}마디 ${i+1}음: 학습목표의 코드 구성음 불일치`);
 }));
 if(score.templateId==='blues-burst')score.measures.forEach((bar,b)=>{const chord=parseChord(score.harmony[b]),last=bar.filter(n=>!n.rest).at(-1);if(!chord.intervals.includes((last.midi-chord.pc+120)%12))errors.push(`${b+1}마디: 코드 목표음 불일치`);});
 return errors;
}
const techniqueInstructions={벤딩:'표시된 반음·온음 목표까지 올립니다. 릴리스 곡선에서는 원래 음으로 돌아온 뒤 다음 H/P·SL 연결을 이어갑니다.',해머온:'H 앞 음만 피킹하고 도착음을 다시 치지 않습니다. 새 줄에서는 다시 피킹하고 이전 줄은 뮤트합니다.',풀오프:'P의 낮은 음을 미리 누릅니다. 출발음만 피킹하고 손가락을 떼어 낮은 음을 냅니다.',슬라이드:'SL의 출발·도착 프렛을 같은 손가락으로 연결합니다. 도착 박을 앞당기지 않습니다.',레가토:'H/P 묶음 첫 음과 표시 없는 음만 피킹합니다. 묶음이 바뀌는 줄을 뮤트하며 음량 차이를 듣습니다.',스케일:'운지의 바뀌는 줄에서 피킹 폭을 작게 유지합니다. 반음 간격은 손가락을 가까이, 온음 간격은 한 프렛을 띄웁니다.',펜타토닉:'두 음 간격의 검지·약지/새끼손가락을 준비합니다. 줄을 건너는 곳에서는 중간 줄을 양손으로 뮤트합니다.',릭:'긴 도착음은 길이를 채우고 쉼표 직전에 잔향을 정리합니다. 짧은 음 수가 달라져도 큰 박은 일정하게 유지합니다.','코드톤 런':'C–E–G=1·3·5, Cmaj7=C–E–G–B를 먼저 말할 수 있어야 합니다. 한 음씩 분리하고 지나간 줄을 뮤트합니다. 같은 프렛의 줄 이동은 손가락 교대/롤링을 느리게 준비합니다.',아르페지오:'코드표의 손가락을 먼저 놓고 베이스는 p, 높은 줄은 i/m/a로 뜯습니다. 세로 TAB은 동시음입니다. 같은 코드에서는 모양을 유지하고 쉼표·코드 변화에 잔향을 정리합니다.'};
const describe=event=>event.rest?'쉼표':(event.tones??[event]).map(n=>`${n.string}번줄 ${n.fret}프렛 ${n.pitch.letter}${n.pitch.alter===1?'♯':n.pitch.alter===-1?'♭':''}`).join(' + ');
export function lessonPedagogy(score){
 const track=getTrack(score.type),stage=levels.indexOf(score.level),course=track.stages[stage][1],position=course.indexOf(score.templateId);
 const prior=position>0?course[position-1]:stage>0?track.stages[stage-1][1].at(-1):null;
 const prerequisites=prior?[prior]:score.type==='레가토'?['hammer-start','pull-return']:score.type==='릭'?['first-path']:[];
 if(score.templateId==='lick-legato-answer')prerequisites.push('hammer-three','pull-three');
 if(score.templateId==='legato-phrase')prerequisites.push('slide-path');
 const keyBars=[0,Math.min(3,score.measures.length-1),score.measures.length-1].map(b=>{
  const bar=score.measures[b],link=bar.findIndex(n=>n.technique),rest=bar.findIndex(n=>n.rest),pinch=bar.findIndex(n=>n.tones);
  const i=link>=0?link:pinch>=0?pinch:rest>=0?Math.max(0,rest-1):0;
  return {bar:b+1,event:i+1,text:`${describe(bar[i])}${bar[i+1]?` → ${describe(bar[i+1])}`:''}${bar[i].technique?` (${bar[i].technique})`:''}${score.harmony?.[b]?` · ${score.harmony[b]}`:''}`};
 });
 const links=score.measures.flatMap((bar,b)=>bar.flatMap((e,i)=>e.technique?[{bar:b+1,event:i+1,kind:e.technique}]:[]));
 const restBars=score.measures.flatMap((bar,b)=>bar.some(e=>e.rest)?[b+1]:[]);
 return {objective:score.purpose,prerequisites,preparation:track.prerequisite,instructions:techniqueInstructions[score.type],keyBars,links,tempo:{start:Math.max(30,score.bpm-12),target:score.bpm},
  checks:[`${keyBars[0].bar}마디 ${keyBars[0].event}음의 ${keyBars[0].text}를 일정한 간격으로 연결할 수 있다.`,links.length?`${[...new Set(links.map(l=>l.kind))].join('·')} 연결음이 작아지지 않고 표시 없는 음에서 피킹을 다시 시작한다.`:score.accompaniment?'첫 박 베이스와 높은 음을 동시에 내고 다음 음과 구별할 수 있다.':`마지막 마디의 ${describe(score.measures.at(-1).filter(n=>!n.rest).at(-1))}까지 운지와 음 길이를 지킨다.`,restBars.length?`${restBars.join('·')}마디의 쉼에서 잔향을 끊고 다음 박을 놓치지 않는다.`:'음표 밀도와 줄이 바뀌어도 큰 박과 음량이 유지된다.'],
  review:'자동 음정·박자·기보 검사 완료 / 실제 기타 실연 검토 필요'};
}
