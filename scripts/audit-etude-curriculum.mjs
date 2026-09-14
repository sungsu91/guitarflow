import {writeFile} from 'node:fs/promises';
import {ETUDES} from '../src/etudes/catalog.js';
import {TRACKS} from '../src/etudes/tracks.js';
import {curriculumAdditions} from '../src/etudes/curriculumRevision.js';
import {educationIssues} from '../src/etudes/pedagogy.js';
import {createHash} from 'node:crypto';
const added=new Set([...curriculumAdditions().map(e=>e.id),'chord-small-barre','chord-moving-preparation','chord-melody-response']);
const replacement=new Set(['blues-burst','density-switch','advanced-finale']);
const fixes=new Set(['triad-engine','seventh-weave']);
const reordered=new Set(['major-landing','ballad-breath','two-note-answer','intermediate-finale','speed-window']);
const duplicates=new Map();
const records=ETUDES.map(e=>{
 const first=e.measures.flat().find(n=>!n.rest).midi;
 const normalized=e.measures.map(m=>m.map(n=>[n.rest?'rest':(n.tones??[n]).map(t=>t.midi-first),n.duration,n.technique]));
 const fingerprint=createHash('sha256').update(JSON.stringify(normalized)).digest('hex');const group=duplicates.get(fingerprint)??[];group.push(e.id);duplicates.set(fingerprint,group);
 return {id:e.id,type:e.type,level:e.level,title:e.title,status:added.has(e.templateId)?'추가':replacement.has(e.templateId)?'교체':fixes.has(e.templateId)?'보완':reordered.has(e.templateId)?'순서 재배치':'유지',
 reason:added.has(e.templateId)?e.purpose:replacement.has(e.templateId)?'속도 위주 시퀀스를 화성별 목표음·동기·응답 악보로 교체':fixes.has(e.templateId)?'8마디 15번째 D를 E로 수정하여 순수 구성음 규칙 회복':reordered.has(e.templateId)?'같은 단계 안에서 끝맺음→쉼→질문/응답, 엇박→레가토→포지션 순서로 연결':'기존 음표·리듬·운지·주법 유지; 실제 마디 참조와 선행 과정 추가',
 bars:e.measures.length,notes:e.measures.flat().filter(n=>!n.rest).length,frets:[Math.min(...e.measures.flat().filter(n=>!n.rest).map(n=>n.fret)),Math.max(...e.measures.flat().filter(n=>!n.rest).map(n=>n.fret))],fingerprint,pedagogy:e.pedagogy,educationIssues:educationIssues(e)};
});
const dup=[...duplicates.values()].filter(v=>v.length>1);if(dup.length)throw Error('조옮김 중복: '+JSON.stringify(dup));
await writeFile('artifacts/etude-input/curriculum-audit.json',JSON.stringify({count:records.length,transposedDuplicates:dup,records},null,2));
let md='# 에튀드 커리큘럼·편집 점검 결과\n\n2026-09-13. 실제 기타 실연 검수는 수행하지 않았습니다. 아래 검수는 음표 데이터와 브라우저 자동 검사입니다.\n\n';
md+='기존 65곡에서 22곡을 추가했습니다. 3곡은 실제 음형·리듬을 교체하고 2곡은 한 음만 수정했습니다. 9유형 모두 최소 3/3/3곡이며, 스케일 고급은 5곡, 릭 초급은 기존 보충 4곡을 포함해 7곡입니다. 키·BPM·시작 프렛만 다른 곡은 추가하지 않았습니다. 정규화 음정/리듬/주법 지문 중복도 검사합니다.\n\n| 유형 | 초급 | 중급 | 고급 |\n|---|---:|---:|---:|\n';
for(const t of TRACKS)md+=`| ${t.type} | ${t.stages.map(s=>s[1].length).join(' | ')} |\n`;
md+='\n## 곡별 판단과 변경 이유\n\n단계 재배치는 하지 않았으며 순서 재배치는 같은 난이도 안에서만 했습니다. 정상 곡의 음표를 일괄 재선택하지 않았습니다.\n\n| 곡 ID | 유형·단계 | 분류 | 근거 |\n|---|---|---|---|\n';
for(const r of records)md+=`| ${r.id} | ${r.type} ${r.level} | ${r.status} | ${r.reason} |\n`;
md+='\n## 곡별 교육 안내\n\n각 안내는 앱 TIP에도 표시됩니다. 독립적인 과제에서 공통으로 쓰는 피킹·뮤트 원칙과 해당 곡의 실제 마디·음표 참조를 함께 제공합니다.\n';
for(const r of records){const p=r.pedagogy;md+=`\n### ${r.title} (${r.id})\n\n${p.objective}\n\n- 준비: ${p.preparation}\n- 선행곡: ${p.prerequisites.join(', ')||'해당 유형의 입문 준비 수준'}\n- 핵심: ${p.keyBars.map(k=>`${k.bar}마디 ${k.event}음 ${k.text}`).join('; ')}\n- 운지·피킹: ${p.instructions}\n- 템포: ${p.tempo.start} → ${p.tempo.target} BPM\n- 완료: ${p.checks.join(' / ')}\n`;}
await writeFile('docs/etude-curriculum-audit.md',md);console.log(`Audited ${records.length} scores; ${added.size} additions; ${dup.length} normalized duplicates`);
