import {readFile,writeFile}from'node:fs/promises';
import assert from'node:assert/strict';
import {loadChordRuntime,snapshotChordRuntime}from'../tests/helpers/chord-runtime.mjs';
import {FIXED_ADD_VOICINGS}from'../src/chords/fixedAddVoicings.js';
const r=await loadChordRuntime(),before=JSON.parse(await readFile('tests/fixtures/before-add-family.json')),after=snapshotChordRuntime(r);
const protectedKeys=Object.keys(before).filter(k=>!/:major:add[29]$/.test(k)||k==='B:major:add9');
for(const k of protectedKeys)assert.deepEqual(after[k],before[k],k);
const aliases={C:'C','C#':'C#',Cb:'B',Db:'C#',D:'D','D#':'D#',Eb:'D#',E:'E','E#':'F',Fb:'E',F:'F','F#':'F#',Gb:'F#',G:'G','G#':'G#',Ab:'G#',A:'A','A#':'A#',Bb:'A#',B:'B','B#':'C'};
const rows=[];
for(const [label,root]of Object.entries(aliases))for(const extension of ['add9','add2']){
 const args={root,quality:'major',extension,displayName:label+extension};
 const positions=r.buildChordReferencePositionMap(args);
 const records=root==='B'&&extension==='add9'&&label==='B'?null:FIXED_ADD_VOICINGS[root]?.[extension];
 const chords=records?r.buildFixedAddReferenceChords(args):null;
 for(const [index,p]of Object.values(positions).entries()){
  const stringNotes=[6,5,4,3,2,1].map(s=>{
   const fret=p.stringStates[s]==='x'?null:p.stringStates[s]==='o'?0:p.notes.find(n=>n.stringNumber===s)?.fretNumber;
   const pitch=fret===null?null:r.getPitchForStringFret(s,fret);
   const midi=pitch?r.pitchToMidi(pitch):null;
   const tone=midi===null?null:r.getChordToneDescriptors(root,'major',extension).find(t=>r.pitchToMidi(t.noteName+'4')%12===midi%12);
   assert.ok(fret===null||tone,`${label}${extension}/${index}/${s}`);
   const spelling=tone?r.spellAdditionalChordTone(label,tone.interval,tone.degreeOffset):null;
   return {string:s,fret,pitch,label:spelling,degree:tone?(tone.interval===0?'1':tone.interval===2?'2':tone.interval===4?'3':tone.interval===7?'5':'9'):null};
  });
  rows.push({name:label+extension,root,position:index+1,shape:stringNotes.map(n=>n.fret??'x').join(' '),notes:stringNotes.map(n=>n.label??'X').join('–'),stringNotes,kind:records?.[index].kind??'preserved-closed',rootString:records?.[index].rootString??stringNotes.find(n=>n.fret!==null).string,barres:p.barres,reason:records?.[index].reason??'사용자 명시 보호 대상: 작업 전 Badd9 position 전체를 고정 스냅샷으로 보존. 재선정하지 않음.',sources:records?.[index].sources??['사용자 명시 보존 요청','https://www.guitar-chord.org/badd9.html'],theory:chords?.[index].voicing.theoreticalTones??['B','D#','F#','C#']});
 }
}
let md=`# add2/add9 고정 position 적용 결과\n\n검증일 2026-09-08. Major add2/add9 표시 데이터만 변경. Minor add9 및 다른 코드 계열은 변경하지 않음. 공통 generator 함수는 수정하지 않았으며 표시 어댑터의 add2/add9 분기에서 생성기 호출을 우회한다.\n\n## 자연음 루트 1구간\n\n| 코드 | 6→1 fret | 실제 음 6→1 (X=뮤트) | 분류 | 선정 근거 |\n|---|---|---|---|---|\n`;
for(const x of rows.filter(x=>x.position===1&&['C','D','E','F','G','A','B'].some(n=>x.name===n+'add2'||x.name===n+'add9')))md+=`| ${x.name} | ${x.shape} | ${x.notes} | ${x.kind} | ${x.reason} |\n`;
md+=`\n## 전체 root 및 고정 position\n\n각 row는 고정 배열의 순서다. 개방형 전조/음별 fret 탐색/span 정렬을 사용하지 않는다. 검증된 4번줄 root의 닫힌 F형만 명시적 다른 root 위치로 등록했다. 2/3/4구간이 없는 경우 후보를 임의 생성하지 않는다.\n\n| 코드 | 구간 | fret | 실제 음 | rootString | 분류 | 출처 |\n|---|---|---|---|---|---|---|\n`;
for(const x of rows)md+=`| ${x.name} | ${x.position} | ${x.shape} | ${x.notes} | ${x.rootString} | ${x.kind} | ${x.sources.map(s=>s.startsWith('https:')?`[자료](${s})`:s).join(' / ')} |\n`;
md+=`\n## 표기와 보호 범위\n\nadd2는 이론 1–2–3–5, add9는 1–3–5–9이며 pitch class는 같다. 실제 음역은 stringNotes의 pitch로 따로 관리한다. A/F/F#/Ab 등 자료에서 같은 운지를 두 표기에 사용하는 경우 공유한다. 다른 운지를 억지로 만들지 않으며 C/D/E/G의 배열과 순서는 구분했다. Cadd2 x30010은 교육 출처가 있는 2구간 대안으로 남겼다.\n\nBadd9은 명시적 보존 요청에 따라 과거 전체 출력 스냅샷을 사용한다. 이는 기존 출력 보존이며 각 과거 고포지션을 새로 검증/승인했다는 뜻은 아니다. Badd9의 기존 Eb 화면 라벨도 이번에 변경하지 않았고 위 표는 화성 문맥의 실제음 D#로 기록했다. Badd2 x2464x 역시 자료에는 있으나 넓은 운지이므로 초급자에게 쉽다고 단정하지 않는다.\n\n원형 자료의 오류도 검산했다. add9 자료의 Ab XX7657은 실제 A이므로 사용하지 않고, 올바른 Ab XX6546(별도 add2 자료 및 검증된 이동형)을 사용한다. sus2처럼 3도가 없는 형태는 이번 데이터에 포함하지 않았다.\n\n## 회귀 및 테스트\n\n보호 대상 ${protectedKeys.length}개 root/type 조합의 chord와 모든 positions를 작업 전 JSON과 deepEqual 확인했다. C, Cm, C7, Cmaj7, Cm7, C#m7b5, Cdim7, Badd9 모두 동일하다. 신규 고정 데이터는 12음고 및 Cb/Fb/E#/B#를 포함한 21개 표기에 대해 모든 위치의 음·필수음·X/O·손가락·바레를 검증했다. generator를 예외 발생 함수로 바꿔도 고정 데이터의 순서와 출력이 유지되는 테스트를 통과했다.\n\n- 명령: node --test tests/fixed-add-voicings.test.mjs tests/additional-chords.test.mjs (9 통과)\n- 명령: npm run build (통과; 기존 대형 chunk 안내 존재)\n- 실제 사람이 연주하는 실기 세션을 새로 수행한 것은 아니다. 연주 자료의 shape를 선정하고 정적 운지/음 검산으로 확인했다.\n- 배포하지 않았다.\n`;
await writeFile('docs/add2-add9-fixed-results.md',md);
await writeFile('artifacts/chord-voicing-audit/fixed-add-family.json',JSON.stringify({protectedCombinations:protectedKeys.length,roots:aliases,rows},null,2));
console.log(JSON.stringify({protected:protectedKeys.length,positions:rows.length,first:rows.filter(x=>x.position===1).length}));


