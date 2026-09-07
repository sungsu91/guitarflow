// Evidence report only. Does not mutate application code or voicing data.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {ADDITIONAL_CHORD_SHAPES} from '../src/chords/additionalChords.js';
const audit=JSON.parse(await readFile('artifacts/chord-voicing-audit/audit.json','utf8'));
for(const [path,hash] of Object.entries(audit.summary.sourceHashes))assert.equal(createHash('sha256').update(await readFile(path)).digest('hex'),hash,`Audit stale: ${path}`);
const src={
 P:['Guitar-Chord / Power','https://www.guitar-chord.org/power-chords.html'],
 F:['Fretjam / Power','https://www.fretjam.com/guitar-power-chords.html'],
 J:['Dirk Laukens / 기타 코드 사전','https://www.jazzguitar.be/blog/jazz-guitar-chord-dictionary/'],
 T:['Richard Barrett / 13th','https://www.guitarworld.com/lessons/chords/13th-chords-demystified'],
 U:['Richard Barrett / 11th','https://www.guitarworld.com/lessons/extended-chords-11ths'],
 V:['Richard Barrett / Altered','https://www.guitarworld.com/lessons/chords/5-altered-chords-you-need-to-know'],
 A:['Guitar-Chord / add2','https://www.guitar-chord.org/add2.html'],
 B:['Guitar-Chord / add11','https://www.guitar-chord.org/add11.html'],
 C:['Guitare Improvisation / 개방형 교육 PDF','https://www.guitare-improvisation.com/img/pdf/Pleins_de_positions_d%27accords_ouverts_enrichis.pdf'],
 D:['Guitar-Chord / 13','https://www.guitar-chord.org/13.html'],
 E:['Guitar-Chord / maj13','https://www.guitar-chord.org/13maj.html'],
 H:['Guitar-Chord / 7b5','https://www.guitar-chord.org/7flat5.html'],
 I:['Guitar-Chord / 7#5','https://www.guitar-chord.org/7sharp5.html'],
 K:['Guitar-Chord / 7#9','https://www.guitar-chord.org/7sharp9.html'],
 L:['Howard Wright / 기타 코드 이론','https://www.hakwright.co.uk/music/chord.html'],
 M:['Stef Ramin / 6/9','https://www.jazz-guitar-licks.com/pages/chords/6-9-guitar-chords-diagrams-and-voicings.html'],
 N:['Guitar-Chord / Em11','https://www.guitar-chord.org/em11.html'],
 O:['Guitar-Chord / m13','https://www.guitar-chord.org/13-minor.html'],
 Q:['Guitar-Chord / m7b5','https://www.guitar-chord.org/7b5-minor.html'],
 R:['Guitar-Chord / dim7','https://www.guitar-chord.org/dim7.html'],
 S:['ChordWizard / Required degrees','https://www.chordwizard.net/Support/Briefing/F25/Cwf3/Matching'],
 W:['Gock / 7b9 도표','https://chords.gock.net/chords/dominant-seventh-flat-ninth'],
 Y:['Gock / 6/9 도표','https://chords.gock.net/chords/major-six-nine'],
};
const links=keys=>keys.split('').map(k=>`[${src[k][0]}](${src[k][1]})`).join(' · ');
// Status concerns the existing template as a reusable data record, not just one pitch set.
// K=keep recommendation, R=replace representative assignment, P=unresolved.
const reviews={
 'e-power':['E',0,'K','PF','기본 6번줄 1–5–1 이동형. 3도 없음은 생략이 아니라 power 코드 정의.','기본 후보 가능. C처럼 다른 루트에서는 A형과 별도 순서 결정.','이동형; E 개방 원형과 닫힌 3지 운지 모두 가능.','동일 형태 유지 후보'],
 'a-power':['C',3,'K','PF','기본 5번줄 1–5–1 이동형. 검지·약지·소지로 연주 가능.','C5 기본 후보 가능; 모든 루트에서 1순위라는 뜻은 아님.','이동형; A의 개방 버전은 손가락 1을 누르지 않음.','동일 형태 유지 후보'],
 'full-e11':['E',0,'P','U','완전 구성음은 맞음. 현재 정확한 6현 형태에 대한 교육 자료의 교차 확인 부족. 3도와 11도의 밀집은 오류가 아니지만 표준 대표성의 근거도 아님.','보류. 전체 음 강제 보존으로 1구간을 확정하면 안 됨.','개방 E 원형. 닫힌 바레 변형은 별도 실전 검증 필요.','C11 x3333x [U], omit3/5. sus 계열과 같은 발음임을 명시할 조건부 후보'],
 'a13':['C',3,'K','JD','두 기타 사전에서 C x32335 확인. 검지 2f, 중지 루트, 약지 G/B 부분바레, 소지 5f. 저포지션에서는 넓지만 실제 교육 도표가 있는 운지.','C13 기본 재즈 후보 가능. E형과 루트별 우선순위는 미확정.','5번줄 루트 이동형.','동일 C13 x32335 유지 후보'],
 'full-e13':['E',0,'P','JTD','5현 shell의 자료는 충분하나 5번줄을 추가한 정확한 6현 형태의 독립 교육 근거 부족. 개방 E와 닫힌 바레 난이도 차이 큼.','보류. 완전성 우선 점수로 shell보다 자동 우선 금지.','6번줄 루트 바레 후보; 개방형과 이동형 별도 검수.','G13 3x3455 [T/D] 또는 C13 x32335 [J/D]'],
 'shell-e13':['G',3,'K','JTD','5도·11도 생략과 실제 5현 형태가 복수 자료에서 일치. 낮은 검지 바레와 상단 부분바레, 5번줄 뮤트 필요.','G13 등 기본 재즈 후보 가능. 모든 코드의 고포지션 1구간 승격은 금지.','6번줄 루트 이동형. 5현이라도 단순 3음 shell과는 구별.','동일 G13 3x3455 유지 후보'],
 'c-add2':['C',3,'P','CA','C 개방 x30010은 교육 PDF에 있음. 그러나 현재 레코드는 이 원형을 모든 루트로 이동함. 개방형 근거만으로 이동형 승인 불가.','C 개방형은 보존 후보, 전 루트 대표 배정은 보류.','open-position으로 분리할 후보. 닫힌 C형의 3프렛 벌림·바레 별도 검증.','C x30010 [C]; A x02420 [C]는 다른 개방형 후보'],
 'g-add2':['G',3,'R','AC','G 300003의 사용 근거 있음. 이를 A 522225로 이동하면 내부 4줄 2f 바레와 양 끝 5f 동시 운지. 음은 맞지만 대표 이동형으로 일반화할 근거 부족.','현재 전 루트 대표 배정 교체 필요. G 개방 원형 삭제 제안 아님.','G open-position으로 분리. 원형의 O를 계속 O로 두면 조옮김 오류; 모두 닫아도 연주성은 별개.','Aadd2 x02420 [C]: A–E–B–C#–E, 3도 있음. 기타 교육 자료의 개방형 후보'],
 'e-add11':['E',0,'P','BC','E 002100을 add11 또는 add4로 두 교육 자료에서 확인. 현재의 모든 루트 이동형 지위까지 검증된 것은 아님.','E 개방 원형 보존 가능; 전체 루트 순위 보류.','개방 E와 닫힌 E형 구분. F 113211은 [B]에 있으나 독립 교차 근거 추가 필요.','E 002100 [B/C] 유지 후보'],
 'c-add11':['C',3,'P','BC','C x33010은 두 자료에서 add11/add4로 확인. 4도 음역이며 3도 E도 유지. 이동하면 부분바레와 넓은 C형을 요구.','C 개방형 보존 후보. 이동형 대표 배정 보류.','개방 C형으로 분리 후보; 닫힌 이동형은 미승인.','C x33010 [B/C] 또는 x32011 [B], 후자는 F4가 위에 놓임'],
 'full-emaj11':['E',0,'P','U','이론·실제 6음 일치. E 001102의 정확한 shape와 대표성에 대한 교차 교육 근거 미확보. maj11을 maj9#11로 바꿔서는 안 됨.','보류. 자연11을 포함한 표준 대표 운지 추가 검증 필요.','개방 E 원형; 닫힌 형태는 검지+중지 바레가 필요한 별도 후보.','Cmaj11 x3343x [U], omit3/5. 출처는 있으나 3도 생략 허용과 명칭 구분 추가 검수'],
 'full-emaj13':['E',0,'P','EJT','정확한 021122 교차 근거 부족. 자료의 E 021120과는 1번줄 음이 다름. 유사한 예를 동일 shape로 승인하지 않음.','보류. 9도 강제 보존이 6현 형태 우선의 근거가 될 수 없음.','개방 E와 닫힌 6번줄 형태 별도 검수.','Emaj13 021120 [E] 또는 Cmaj13 8x99(10)x [J/E]; 생략 내역 별도'],
 'shell-emaj13':['E',0,'P','EJ','[E]의 6번줄 maj13 및 1번줄 추가 바레 설명과 부합. [J]는 1번줄 없는 형을 확인. 정확한 5현 형태의 독립 교차 확인 부족.','4현 기본형과 5현 변형의 우선순위 보류.','6번줄 루트 이동형 후보.','Cmaj13 8x99(10)x [J/E], omit5/9/11'],
 'a-seven-flat-five':['C',3,'P','H','[H] 비교 섹션의 음 배치는 일치. 정확한 x3435x의 독립 기타 도표 추가 확인 필요. 검지 부분바레 자체는 성립.','보류; 6번줄 확인형과 루트별 비교 필요.','5번줄 루트 이동형 후보.','C7b5 8x897x [V/H]'],
 'e-seven-flat-five':['C',8,'K','VH','Guitar World 도표 8x897x와 [H] 6번줄 음 배열 교차 확인. 4손가락, 5번줄과 1번줄 뮤트.','기본 이동형 가능. C의 8프렛을 무조건 대표 1구간으로 지정하지 않음.','6번줄 루트 이동형.','동일 C7b5 8x897x 유지 후보'],
 'a-seven-sharp-five':['C',3,'P','I','현재 x3635x는 5–3프렛 사이 바레를 유지하며 4번줄 6f를 요구. [I]의 A x03021과도 다른 형태. 이론 일치만 확인.','기본 대표성 보류. 3프렛 벌림 자체로 불가능 판정하지 않음.','5번줄 루트 이동형 후보.','C7#5 8x899x [I], A7#5 x03021 [I]; 다른 생략 없는 후보'],
 'e-seven-sharp-five':['E',0,'P','I','현재 E 0x0110은 루트를 1번줄에 중복. [I]의 6번줄 4음 형태와 1번줄이 달라 동일 shape로 확인하지 않음.','중복 루트 추가형의 대표성 보류.','6번줄 루트; 개방 원형/닫힌 이중 바레 분리 필요.','C7#5 8x899x [I] (1번줄 뮤트, 생략 없음)'],
 'e-seven-flat-nine':['E',0,'P','JV','정확한 E 020101의 교육 자료 교차 근거 부족. [J]의 8x8989는 5번줄이 뮤트인 별도 voicing. 개방형이 쉽다는 이유로 이동형까지 승인 불가.','보류. 모든 음 포함 6현보다 사전의 4/5현 형태도 검토.','6번줄 루트 이동 후보; 개방 E 별도 검수.','C7b9 x3232x [V] omit5 또는 8x8989 [J/W] 생략 없음'],
 'a-seven-flat-nine':['C',3,'P','SWV','x32323의 정확한 발음은 ChordWizard/Gock에서 확인. [V]의 연주 도표는 x3232x로 1번줄이 다름. 수학적 매칭 자료와 연주 근거를 구별.','5도 추가 5현 형태와 기본 4현의 대표 순위 보류.','5번줄 루트; 검지 D/B 바레 위 G는 더 높은 음. 정상 구조이나 독립 실기 검수 필요.','C7b9 x3232x [V] omit5; 현재 x32323은 보존 검토 후보'],
 'e-seven-sharp-nine':['E',0,'P','KJ','E 020133은 [K] 개방형 항목과 정확히 일치. [J] 이동형과는 5번줄 및 상단 중복이 달라 전 루트 공통 운지로 승인하지 않음.','E 개방형 보존 후보; 전체 루트 대표성 보류.','개방 E 별도, 닫힌 이동형 3프렛 벌림과 바레 검증 필요.','C7#9 x3234x [J/K] omit5'],
 'a-seven-sharp-nine':['C',3,'P','JK','현재 x32343은 유명 x3234x에 1번줄 5도를 추가. 약지 G~E 바레 중 B는 소지로 더 높은 fret. 구조상 모순 없으나 동일 교육 도표 교차 근거 부족.','기본 4음형보다 우선할 근거 미확보.','5번줄 루트 이동형 후보.','C7#9 x3234x [J/K] omit5. 3도 E와 #9 D# 모두 유지'],
 'a-six-nine':['C',3,'K','LYM','Howard Wright의 정확한 x32233 예제와 별도 코드 도표 일치. D/G 검지 바레, B/E 약지 바레. 모든 구성음 포함.','C6/9 기본 후보 가능. [J] x3223x와는 5도 유무를 구분.','5번줄 루트 이동형.','동일 C6/9 x32233 유지 후보'],
 'e-six-nine':['G',3,'P','JM','3도 추가된 현재 32223x와 [J]의 3x223x 계열은 다른 줄 구성. 근접한 quartal 형태만으로 정확한 전현 운지 승인 불가.','보류. 루트+검지 3줄 바레의 실제 음 분리 추가 검수.','6번줄 루트 이동형 후보.','C6/9 8x778x [J], omit3 아님: C–A–D–G로 실제 3도 누락 → 이 후보는 제외. C6/9 x32233 [L/Y] 채택 검토'],
 'full-em11':['E',0,'P','NU','E 000002를 [N]에서 정확히 확인. 5개 개방현은 쉬우나 이를 전 루트 바레로 만드는 근거는 별도.','E 개방 대안 보존 후보. 모든 루트 1구간으로는 보류.','open E 원형과 6번줄 닫힌 이동형 구분.','E 000002 [N] 또는 E 000033 [N] omit5/9'],
 'am13':['C',3,'R','OT','현재 x31335는 1~5f에 걸친 5현 운지. 정적 모순은 없지만 기본 대표로 유지할 실전 근거 부족. 9도 의무 보존으로 선택 폭을 좁힌 정책 영향.','대표 1구간 배정 교체 필요. 악기/손 크기에 따라 불가능하다고 단정하지 않음.','5번줄 루트 이동 후보이나 넓은 저포지션의 정상 운지 실증 미확보.','Cm13 x3x345 [O], omit5/9/11. 또는 Gm13 353355 [T], omit11'],
 'full-em13':['G',3,'P','TO','Gm13 353355는 [T] 연주 예제의 6음 순서와 일치. [O]의 Am13 575575와 9도 포함 여부가 다름. 독립 동일형 교차 검증 부족.','실사용 근거 있음. 일반 대표 순위는 보류.','6번줄 루트 이동형 후보; 검지 바레와 상단 부분바레.','Gm13 353355 [T] 보존 검토; Cm13 x3x345 [O]'],
 'shell-em13':['E',0,'P','TO','[T]의 5도 생략 가능 설명은 관례 근거. 정확한 0x0022/이동형의 별도 교차 도표는 미확보.','관례상 가능과 대표 shape 승인을 구분해 보류.','6번줄 루트 이동 후보; 중간 5번줄 뮤트.','Gm13 353355 [T] 또는 Cm13 x3x345 [O]'],
 'a-half-diminished':['C',3,'K','JQ','두 사전의 5번줄 형태가 일치. 각 음 4손가락, 바레 없음.','Cm7b5 기본 후보 가능. flat 코드명 parser 문제는 별도 미수정.','5번줄 루트 이동형.','동일 Cm7b5 x3434x 유지 후보'],
 'e-half-diminished':['C',8,'K','JQ','두 사전의 6번줄 형태가 일치. 현재 D/G 약지 부분바레는 도표의 개별 손가락 대안과 구별. 음형 유지 가능, 손가락 선택은 후속 검수.','다른 포지션 기본 후보 가능. C에서 A형보다 자동 우선하지 않음.','6번줄 루트 이동형.','동일 Cm7b5 8x887x 유지 후보'],
 'a-diminished-seven':['C',3,'K','JR','사전 도표와 Bdim7 x2313x의 동일 이동형 확인. 네 손가락, 낮은 G와 높은 D/B를 분리.','Cdim7 기본 후보 가능. 이명동음 대칭과 루트 기준 이름은 별도 유지.','5번줄 루트 이동형.','동일 Cdim7 x3424x 유지 후보'],
 'e-diminished-seven':['C',8,'K','JR','두 자료의 6번줄 이동형 일치. 검지 D/B 부분바레 위 G는 높은 fret.','기본 대체 포지션 가능. C의 고프렛을 무조건 1구간으로 삼지 않음.','6번줄 루트 이동형.','동일 Cdim7 8x787x 유지 후보'],
};
const names={K:'유지 가능',R:'교체 필요',P:'추가 검증 필요'};
const natural={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
const spellingPc=n=>natural[n[0]]+[...n.slice(1)].reduce((v,c)=>v+(c==='#'?1:-1),0);
const noteAt=(label,midi)=>label+((midi-spellingPc(label))/12-1);
const formula={5:'1–5',add2:'1–2–3–5',add11:'1–3–5–11',maj11:'1–3–5–7–9–11',11:'1–3–5–b7–9–11',13:'1–3–5–b7–9–11–13',maj13:'1–3–5–7–9–11–13',m13:'1–b3–5–b7–9–11–13',m11:'1–b3–5–b7–9–11','7b5':'1–3–b5–b7','7#5':'1–3–#5–b7','7b9':'1–3–5–b7–b9','7#9':'1–3–5–b7–#9','6/9':'1–3–5–6–9',m7b5:'1–b3–b5–b7',dim7:'1–b3–b5–bb7'};
const rows=[];
for(const [quality,extensions]of Object.entries(ADDITIONAL_CHORD_SHAPES))for(const [extension,templates]of Object.entries(extensions))for(const t of templates){
 const [root,base,status,sources,finding,representative,movement,alternative]=reviews[t.id]??[]; assert.ok(root,t.id);
 const r=audit.rows.find(r=>r.root===root&&r.displayName===root+extension&&r.template===t.id&&r.baseFret===base);assert.ok(r,t.id);
 const tones=r.strings.filter(s=>s.fret!==null); const counts={};tones.forEach(s=>counts[s.label]=(counts[s.label]??0)+1);
 const actual=r.strings.map(s=>s.fret===null?'X':noteAt(s.label,s.midi)).join(' · ');
 const shape=r.strings.map(s=>s.fret??'x').join(' ');
 const barres=t.barres.filter(b=>base>=b.minBaseFret).map(b=>`${base+b.fretOffset}f / ${b.fromString}→${b.toString}번줄 / 손가락${b.label}`).join('; ')||'없음';
 const required=r.theory.filter(n=>!r.omitted.includes(n));
 rows.push({id:t.id,quality,extension,root,base,status:names[status],sources,shape,actual,theory:r.theory.join('–'),formula:formula[extension],required:required.join('–'),omitted:r.omitted.join('·')||'없음',duplicates:Object.entries(counts).filter(([,n])=>n>1).map(([p,n])=>`${p}×${n}`).join(', ')||'없음',mute:r.strings.filter(s=>s.fret===null).map(s=>s.string).join(',')||'없음',open:r.strings.filter(s=>s.fret===0).map(s=>s.string).join(',')||'없음',fingers:r.strings.map(s=>s.fret===null?'X':s.fret===0?'O':s.finger).join(' '),barres,rootString:t.rootString,relative:[6,5,4,3,2,1].map(s=>t.strings.find(a=>a[0]===s)?.[1]??'x').join(' '),finding,representative,movement,alternative,errors:r.errors});
}
assert.equal(rows.length,31);assert.equal(Object.keys(reviews).length,31);
const counts=Object.fromEntries(Object.values(names).map(s=>[s,rows.filter(r=>r.status===s).length]));
const header=`# 신규/보충 기타 voicing 31개 검증 대기 보고서\n\n검토일: 2026-09-08. 범위: 신규 14타입 + 6/9·m7b5 보충, 31개 템플릿. **앱 데이터·기존 generator·Badd9 교체/수정 없음.** 모든 항목의 정식 서비스 승인은 사용자 검토 대기다.\n\n판정: 유지 가능 ${counts['유지 가능']} / 교체 필요 ${counts['교체 필요']} / 추가 검증 필요 ${counts['추가 검증 필요']}. 유지 가능은 음형을 보존할 근거가 있다는 제안이며 모든 루트에서 1구간으로 승인한다는 뜻이 아니다. 교체 필요 2건은 대표 배정/이동형 취급에 대한 판정이다. 원형을 삭제하거나 연주 불가능하다고 단정하지 않는다.\n\n## 검증 수준과 한계\n\n- 이론: 표준 튜닝 E2 A2 D3 G3 B3 E4와 독립 공식으로 각 string/fret를 검산했다. 아래 음열은 6→1번줄 순서이며 X/O, 중복과 생략을 함께 기록한다. 옥타브 숫자는 실제 발음 MIDI 기준이다(예: Bbb3는 A3와 같은 음높이).\n- 31개 원형뿐 아니라 기존 감사의 12 pitch-class 루트 712개 후보를 대조했다. 허용 외 음·미신고 생략·X/O 불일치·정적 바레 충돌은 0건이다. **이 결과는 운지 실기나 대표성 인증이 아니다.**\n- 기타 자료는 저자 있는 교육 자료와 기타 코드 사전을 우선 사용했다. 도표는 음을 다시 계산했다. 서로 다른 줄, 중복 또는 생략을 가진 근접 형태는 동일 shape 확인으로 세지 않았다. 단일 출처/간접 설명만 있는 항목은 보류했다. 검색에 나오지 않는다는 사실은 그 운지가 존재하지 않는다는 증거가 아니다.\n- 사람의 실기 녹음·손가락 시연 검수는 하지 않았다. 자료에 확인되는 기본 운지와 정적 구조 검사를 구분했다. 유지 가능 항목도 손 크기/스케일 길이/현 장력에 관계없는 편안함을 보장하지 않는다.\n- 자료 자체에도 오기가 있다. Guitar-Chord 일부 construction 항목의 줄 순서와 이명동음, Guitar World altered 본문의 C #9 표기(D)를 그대로 가져오지 않았다. C7#9는 D#로 검산한다.\n\n## 생략 정책 검토\n\n현재 구현은 13/maj13/m13에만 11 또는 5+11 생략을 허용하며 9도를 필수로 고정한다. 이는 기타 관례 전체가 아니라 현재 구현의 좁은 정책이다. 이 정책과 6현 full 형의 우선 점수가 결합되어 검증되지 않은 넓은 형태를 대표로 선택할 수 있다.\n\n기본 보존 우선순위 제안: 7b5/7#5는 3·b7·변화5도, 7b9/7#9는 3·b7·변화9도, m11은 b3·b7·11, 13 계열은 해당 3도·7도·13을 우선한다. 일반 5도, 경우에 따라 9도 또는 11도 생략은 **개별 출처 voicing에 한해** 기록한다. rootless는 별도 합주용으로 구분한다. 11 계열의 omit3는 sus와 같은 발음이 될 수 있어 무표시 대체하지 않는다. 현재 add2/add11/변화5도/dim7의 구성음을 편의상 삭제하는 제안은 없다.\n\n이론적 7음 공식은 유지한다. 아래 '필수'는 **현재 레코드가 선언한 생략을 제외하고 기대하는 음**이며, 음악에서 모든 voicing이 반드시 같은 음을 요구한다는 보편 법칙이 아니다. 대체 후보의 추가 생략은 아직 구현에서 허용/적용하지 않았다. 관례 근거: ${links('TUJS')}.\n\n## 31개 판정표\n\n현재 shape와 실제 음은 비교하기 위한 특정 루트의 예다. 고프렛 C 예시는 추천 위치가 아니다. 전체 상대 fret와 루트 줄은 상세 항목에 기록했다.\n\n| ID | 코드 | 현재 shape (6→1) | 실제 발음 (6→1) | 이론적 전체 구성음 | 판정 | 핵심 문제/근거 |\n|---|---|---|---|---|---|---|\n`;
let md=header+rows.map(r=>`| ${r.id} | ${r.root}${r.extension} | ${r.shape} | ${r.actual} | ${r.theory} | **${r.status}** | ${r.finding} |`).join('\n');
md+='\n\n## 개별 검증 및 출처\n';
for(const r of rows){md+=`\n### ${r.id} — ${r.status}\n\n| 검증 항목 | 결과 |\n|---|---|\n| 정확한 코드/전체 공식 | ${r.root}${r.extension}: ${r.formula}; ${r.theory} |\n| 현재 shape / 루트 기준 | ${r.shape}; ${r.rootString}번줄 root, base ${r.base}f; 상대 fret ${r.relative} |\n| 실제 6→1번줄 음 | ${r.actual} |\n| 현재 정책상 필수음 / 실제 생략 | ${r.required} / ${r.omitted} |\n| 중복음 | ${r.duplicates} |\n| X / O | X: ${r.mute}번줄; O: ${r.open}번줄 |\n| 손가락 6→1 / 바레 | ${r.fingers} / ${r.barres} |\n| 허용 외 음·필수 누락·X/O 정적 오류 | ${r.errors.length?'감사 오류: '+r.errors.join(', '):'없음'} |\n| 실제 연주·사용 근거 | ${r.finding} |\n| 개방/이동 가능성 | ${r.movement} |\n| 대표 1구간 판단 | ${r.representative} |\n| 출처에서 확인한 대체/보존 후보 | ${r.alternative} |\n\n근거: ${links(r.sources)}. 대체 후보의 [문자]는 아래 출처 키에 대응한다.\n`;}
md+=`\n## add2/add9 음역 대조\n\nCadd2 x30010: C3–D3–G3–C4–E4. D3는 베이스 C3 위 장2도이고 3도 E4가 존재한다. Gadd2 300003: G2–A2–D3–G3–B3–G4로 역시 장2도와 3도를 유지한다. A 이동 결과 522225도 A2–B2–E3–A3–C#4–A4로 이론은 맞지만 운지 대표성은 별개다.\n\n교육 자료의 Aadd2 x02420은 A2–E3–B3–C#4–E4로, 베이스 대비 B가 9도임에도 add2라고 표기된다. 따라서 베이스와 2반음/14반음 차이만으로 코드명을 강제 분리할 수 없다. Cadd9 x32030은 C3–E3–G3–D4–E4다. pitch class 관계와 표기 관습을 함께 보존하고, 실제 register와 3도 존재를 각 voicing의 속성으로 기록해야 한다. 두 버튼을 단순 복제하거나 관계없는 공식을 만들지 않는다. ${links('CA')}.\n\n## 후속 데이터 설계 제안 — 이번에는 미적용\n\n1. theoryDefinition과 voicingRecord를 분리. 각 레코드에 source URL/도표 위치, 실제 strings/frets, soundingDegrees, omittedDegrees/reason, fingering, barre, tuning, open/movable, rootString을 기록한다.\n2. open 원형의 검증으로 닫힌 이동형을 승인하지 않는다. 전 줄을 같은 반음만큼 이동하면 음정 구조는 보존되지만 바레 운지 가능성은 별도다. 일부 O만 남긴 조옮김은 승인하지 않는다.\n3. 각 root+type에 검증된 레코드 ID의 고정 position1/2/3 목록을 작성한다. scoring은 승인된 후보 안의 보조 정보로만 두고 순위를 재작성하지 않게 한다. '가장 낮은 fret' 또는 '가장 좁은 span'만으로 1구간을 선정하지 않는다.\n4. 이번 범위에서 교체 필요인 g-add2의 대표 이동형 배정, am13의 기본 대표 배정을 먼저 검토하되, 실제 교체는 사용자 확인 후 진행한다.\n5. 유지 가능 10개도 전체 root의 1/2/3순위 승인이 완료된 것은 아니다. 나머지 19개는 정확한 도표의 독립 대조/실기/대표성 중 남은 항목을 확보하기 전 서비스 승인 보류.\n\n## 기존 코드/화면 문제의 경계\n\nFadd9은 이번 31개에 속하지 않는다. 기존 감사에서 현재 Fadd9은 135211 = F–C–G–A–C–F였다. 사용자 제보 135311은 Bb 외부음과 A 누락으로 검출된다. 이 차이의 실행 환경 원인은 미확정이며 이번 작업에서 수정하지 않았다. Badd9과 기존 generator도 그대로다.\n\n기존 감사에서 확인한 flat m7b5 직접 이름 parser 및 m(add9) mini-label roundtrip 문제도 이 보고서의 shape 승인과 별개인 미수정 항목이다. 음형 검증 통과를 화면의 모든 경로가 정상이라는 뜻으로 해석하지 않는다.\n\n## 출처 키와 확인 범위\n\n`;
for(const [key,[title,url]]of Object.entries(src))md+=`- **${key}** [${title}](${url})\n`;
const alternatives=[
 ['C','11','x3333x','U'],['C','maj11','x3343x','U'],['C','13','x32335','JD'],['G','13','3x3455','TD'],
 ['E','maj13','021120','E'],['C','maj13',[8,null,9,9,10,null],'JE'],
 ['C','7b5','8x897x','VH'],['C','7#5','8x899x','I'],['A','7#5','x03021','I'],
 ['C','7b9','x3232x','V'],['C','7b9','8x8989','JW'],['C','7b9','x32323','SW'],['C','7#9','x3234x','JK'],
 ['C','6/9','x32233','LY'],['E','m11','000033','N'],['C','m13','x3x345','O'],['G','m13','353355','T'],
 ['A','add2','x02420','C'],['C','add2','x30010','C'],['C','add11','x32011','B'],['E','add11','002100','BC'],
 ];
md+='\n## 출처 후보의 독립 발음 검산\n\n다음은 새로 계산해 만든 운지가 아니라 위 출처에서 확인한 후보를 그대로 검산한 표다. 생략 허용 확대나 후보 채택은 아직 하지 않았다. 한 출처만 확인된 후보는 최종 교체안으로 승인하지 않는다.\n\n| 코드 | 출처 shape 6→1 | 실제 6→1 발음 | 실제 생략 | 필수 정체성 확인 | 출처 |\n|---|---|---|---|---|---|\n';
for(const [root,extension,shape,sources]of alternatives){
 const oracle=audit.rows.find(r=>r.root===root&&r.displayName===root+extension);assert.ok(oracle);
 const frets=Array.isArray(shape)?shape:[...shape].map(c=>c==='x'?null:Number(c));
 const theory=oracle.theory;const sounding=[];
 const notes=frets.map((f,i)=>{if(f===null)return'X';const midi=[40,45,50,55,59,64][i]+f;const label=theory.find(n=>(spellingPc(n)%12+12)%12===midi%12);assert.ok(label,`${root}${extension} foreign note in ${shape}`);sounding.push(label);return noteAt(label,midi);});
 const omissions=theory.filter(n=>!sounding.includes(n));
 md+=`| ${root}${extension} | ${frets.map(f=>f??'x').join(' ')} | ${notes.join(' · ')} | ${omissions.join('·')||'없음'} | ${['11','maj11'].includes(extension)&&omissions.includes(theory[1])?'3도 생략: sus 동일 발음/문맥 구분 필요':'3도(해당 장/단), 7도(해당 시), 명시 확장·변화음 보존'} | ${links(sources)} |\n`;
}
md+='\n[J] 사전의 C13, Cmaj13, Cm7b5, Cdim7, C69, C7b9, C7#9 원도표를 브라우저로 확인했다. [V] C7b5/C7b9 및 [U] Cmaj11 도표도 직접 대조했다. [C] PDF와 [L] 본문은 검색 인덱스의 명시적 fret 텍스트를 확인했으나 원문 직접 열기는 실패했다. [Y/W/S]는 음형/이론의 보조 확인이며 연주 시연 증거가 아니다. [M]은 6/9 구조 및 root-string 계열 근거이며 현재 e-six-nine와 정확히 같은 도표를 확인했다는 뜻이 아니다. 출처 존재만으로 인기도 1위를 증명하지 않는다.\n\n## 재현 및 변경 검증\n\n`node scripts/report-pending-chord-templates.mjs`는 기존 audit.json과 31개 레코드를 대조하고 보고서만 작성한다. 원 감사 이후 App.jsx, additionalChords.js, chordTheory.js, Fretboard.jsx SHA-256이 모두 같음을 assert한다. 기존 감사 원시 데이터는 `artifacts/chord-voicing-audit/audit.json`에 보존했다.\n';
await writeFile('docs/chord-voicing-validation-31.md',md);
await writeFile('artifacts/chord-voicing-audit/template-review-31.json',JSON.stringify({date:'2026-09-08',approval:'PENDING_USER_REVIEW',counts,sourceHashes:audit.summary.sourceHashes,sources:src,rows},null,2));
const columns=['id','status','root','extension','shape','actual','theory','required','omitted','duplicates','mute','open','fingers','barres','movement','representative','finding','alternative'];
const csvCell=v=>'"'+String(v??'').replaceAll('"','""')+'"';
await writeFile('artifacts/chord-voicing-audit/template-review-31.csv','\uFEFF'+[columns.map(csvCell).join(','),...rows.map(r=>columns.map(k=>csvCell(r[k])).join(','))].join('\r\n'));
console.log(JSON.stringify({templates:rows.length,counts,productionHashesUnchanged:true}));
