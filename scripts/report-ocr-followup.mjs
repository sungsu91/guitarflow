import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {checkTabRegression} from './check-tab-32-regression.mjs';
const root='artifacts/ocr-followup-20261005',read=async p=>JSON.parse(await readFile(p));
const reports=[];
for(const name of ['fixed','reference-photos','challenge']){
 const before=await read(`artifacts/instrument-support-20261005/regression/${name}/report.json`),after=await read(`${root}/regression-verified/${name}/report.json`);
 const sum=rows=>rows.reduce((a,r)=>{for(const [k,v]of Object.entries(r.totals))a[k]=(a[k]??0)+v;return a;},{});
 reports.push({name,...checkTabRegression(before,after),before:sum(before),after:sum(after)});
}
const photos=await read(root+'/photo-comparison.json'),instruments=await read(root+'/instruments-verified/bass-results.json');
const build=await read(root+'/build-result.json');
const tuples=await read(root+'/tuplets/report.json'),roundtrip=await read(root+'/roundtrip/import-report.json'),stress=await read(root+'/roundtrip/jpeg-report.json');
const failures=txt=>[...new Set([...txt.matchAll(/^✖ (.+) \([\d.]+ms\)$/gm)].map(m=>m[1]))];
const old=await readFile(root+'/unit-before.log','utf8'),latest=await readFile(root+'/unit-verified.log','utf8');
const counts=txt=>Object.fromEntries(['tests','pass','fail'].map(k=>[k,Number(new RegExp('^ℹ '+k+' (\\d+)','m').exec(txt)?.[1])]));
const unit={before:counts(old),after:counts(latest),existing:failures(old),newFailures:failures(latest).filter(n=>!failures(old).includes(n))};
const totals={cases:instruments.length,correct:instruments.reduce((n,r)=>n+r.correct,0),missing:instruments.reduce((n,r)=>n+r.missing,0),wrong:instruments.reduce((n,r)=>n+r.wrong,0),unflaggedMissing:instruments.reduce((n,r)=>n+r.unflaggedMissing,0)};
const hashes=await read(root+'/final-source-hashes.json'),sourceChanges=[];
for(const [file,hash]of Object.entries(hashes))if(createHash('sha256').update(await readFile(file)).digest('hex')!==hash)sourceChanges.push(file);
const passed=build.exitCode===0&&reports.every(r=>r.passed)&&photos.length===5&&photos.every(p=>!p.lost.length&&p.barsAfter===p.expectedBars)&&totals.cases===36&&totals.correct===1404&&!totals.missing&&!totals.wrong&&!totals.unflaggedMissing&&!unit.newFailures.length&&!sourceChanges.length;
await writeFile(root+'/verified-summary.json',JSON.stringify({passed,reports,photos,instruments:totals,tuplets:tuples.map(r=>({width:r.width,cases:r.checks.length,errors:r.errors})),roundtrip,stress,unit,build,sourceChanges},null,2));
await writeFile(root+'/unit-comparison.json',JSON.stringify(unit,null,2));
const lines=[
 'RIFFLAB 로컬 OCR·연음 보완 검사 결과',
 '',
 '이미 구현되어 있던 기능',
 '- PDF/TAB·오선보 OCR, 악기 튜닝 기반 변환, 사진 보정, 32분음표, 3:2·6:4 연음의 입력·시간 계산은 유지했습니다.',
 '',
 '부분적으로 구현되어 있던 기능',
 '- 실제 촬영 사진의 흐린 줄/기울어진 마디선, JPEG 숫자의 경쟁 판독, 연음 괄호의 표시 범위에 문제가 있었습니다.',
 '',
 '구현되어 있지 않았던 기능',
 '- 복잡한 피아노 다성부·드럼용 추가 엔진과 서버 경로는 사용자 요청에 따라 이번 작업에서 제외했습니다. 설치·연결·배포하지 않았습니다.',
 '',
 '이번에 실제 추가/수정한 기능',
 '- 서로 다른 성부의 음표를 같은 beam으로 묶지 않도록 했습니다.',
 '- TAB 연음 괄호가 첫 음부터 마지막 음까지 걸리도록 수정했습니다. 4분음표에는 beam을 추가하지 않으며 8·16·32분음표는 각각 1·2·3개 beam을 사용합니다.',
 '- 숫자 7의 윗획이 실제로 없는 OCR 대안은 다른 숫자를 막지 않도록 기존 획 검증을 일관되게 적용했습니다.',
 '- 희미한 수평줄을 근거로 실제로 연속된 비스듬한 마디선을 복원했습니다. 마디선 자체의 연속성 기준은 낮추지 않았습니다.',
 '- 사진 가장자리의 그림자를 가짜 선행 마디로 만들지 않도록 했습니다. 실제 줄이 있는 짧은 마디는 유지합니다.',
 '- 흐린 마디선을 새로 복원한 구간에서 애매한 숫자가 마디 전체 확대 결과 선택 때문에 확정되는 경로를 보완했습니다. 나머지 구간의 기존 확대 판독은 유지했습니다.',
 '- 이미지 OCR은 음표 바깥까지 뻗은 연음 괄호도 확인합니다. 양 끝과 중앙 숫자가 있어야 하며 박자 합만으로 연음을 만들지 않습니다.',
 '',
 '추가한 자동 테스트',
 `- 단위 테스트 ${unit.after.tests-unit.before.tests}개를 추가했습니다. 아래 실제 파일·렌더링 검사와 별개로 실행합니다.`,
 '- 음가 4·8·16·32와 3·6연음 조합의 입력·저장 모델·컴파일·재생 시간을 60/137/240 BPM에서 검사했습니다.',
 `- 모바일 390px / 데스크톱 1440px, TAB / 오선+TAB의 표시 검사 ${tuples.reduce((n,r)=>n+r.checks.length,0)}종 통과.`,
 '- 괄호 한쪽 없음, 별개 성부, 잘린 획, 낮은 확신도, 실제 짧은 마디, 종이 그림자, 확대 판독의 상충도 검사했습니다.',
 '- 신규 연음 악보를 앱 렌더러로 PDF 출력한 뒤 재인식했습니다. 수정 전·후 모두 90음/90리듬 일치.',
 '- 같은 출력물을 900px·JPEG 품질 50·0.8도 기울기·밝기 경사로 변형하여 재검사했습니다. 6마디로 잘못 나뉘던 결과가 원래 4마디로 개선됐으며 수정 전·후 표시의 인식 하락은 없었습니다.',
 '',
 '기존 테스트 결과와 비교',
 ...reports.map(r=>`- ${r.name} ${r.cases}종: 음 ${r.before.correct}/${r.before.notes} → ${r.after.correct}/${r.after.notes}, 리듬 ${r.before.rhythmCorrect}/${r.before.events} → ${r.after.rhythmCorrect}/${r.after.events}. 새 실패 위치 ${r.failures.length}건.`),
 `- 악기별 PDF/PNG/JPEG ${totals.cases}종: 1401/1404음 → ${totals.correct}/1404음. 누락 ${totals.missing}, 오답 ${totals.wrong}.`,
 ...photos.map(p=>`- 학원 사진 ${p.id}: ${p.barsBefore} → ${p.barsAfter}마디(원본 ${p.expectedBars}). 기존 확정음 ${p.confirmedBefore}, 현재 ${p.confirmedAfter}, 잃은 기존 위치 ${p.lost.length}.`),
 `- 전체 단위 검사: ${unit.before.pass}/${unit.before.tests} 통과 → ${unit.after.pass}/${unit.after.tests} 통과. 기존 실패 ${unit.existing.length}건 유지, 새 실패 ${unit.newFailures.length}건. 기존 실패 목록은 unit-comparison.json에 기록했습니다.`,
 `- ${build.command}: ${build.exitCode===0?'통과':'실패'}. 배포 산출물의 개인 악보·오디오 제외 검사도 통과했습니다.`,
 '',
 '남아 있는 제약 또는 정확도 문제',
 '- 사진 5장의 검증은 원본 마디 수와 기존 확정음 보존 검사입니다. 전체 음을 수작업 정답표와 대조한 정확도 100% 검사는 아닙니다.',
 '- 저해상도 사진의 일부 음·쉼표·리듬·연음은 계속 검토 대상으로 남습니다. 신규 강한 JPEG 악조건의 6연음 및 일부 숫자도 완전 복원하지 못했습니다.',
 '- 기존 회귀 자료에 남아 있던 오인식/미인식 위치는 결과 JSON에 그대로 남겼습니다. 평균 점수로 새 오류를 숨기지 않았습니다.',
 '- 사진 5번의 흐린 개방현 0은 확대하면 8로 오판되는 경우가 있어 자동 확정하지 않고 해당 위치를 검토 대상으로 유지했습니다.',
 '- iPhone 실제 촬영 장치에서의 실행은 이번 자동 검사에 포함되지 않았습니다.',
 '- 이번 수정은 로컬 작업입니다. 메인 서버 배포/푸시는 하지 않았습니다.',
 '',
 '연음 자료: 재생 음가와 화면 기호의 구분은 MusicXML time-modification / tuplet 구조를 참고했습니다.',
 'https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/time-modification/',
 'https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/tuplet/',
 '',
 `최종 회귀 통과: ${passed?'예':'아니오 — verified-summary.json 확인'}`,
];
await writeFile(root+'/RESULT.txt',lines.join('\n')+'\n');
console.log(JSON.stringify({passed,instruments:totals,unit:unit.after,regression:reports.map(r=>({name:r.name,passed:r.passed,failures:r.failures}))}));
assert(passed,'A regression or missing verification remains; inspect verified-summary.json');
