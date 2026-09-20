import {readFileSync,writeFileSync} from 'node:fs';
import {RECOMMENDED_GROOVE_PACKS} from '../src/metronome/recommendedGrooves.js';
import {GROOVE_SAMPLE_GAIN} from '../src/metronome/groove.js';
const audit=JSON.parse(readFileSync('output/groove-sample-audit.json')),render=JSON.parse(readFileSync('output/groove-render-audit.json'));
const text=`# 그루브 추천 팩 구현·검증

## 등록 데이터

모두 4/4 한 마디 반복, 4분음표 BPM 기준입니다. 특정 곡의 복제나 장르의 유일한 정형 패턴이 아닌 기타 연습용 편곡입니다.
기존 기본 8비트·16비트는 새 12개와 타격 위치/강약이 동일하지 않아 유지했습니다. 총 14개입니다.

| 팩 | 분류 | 권장 BPM | 격자 | 트랙 |
|---|---|---:|---|---:|
${RECOMMENDED_GROOVE_PACKS.map(p=>`| ${p.title} | ${p.category} | ${p.bpm} | ${p.subdivision==='sixteenth'?'16칸':'셋잇단 12칸'} | ${p.pattern.rows.length} |`).join('\n')}

## 실제 샘플과 음량 보정

기존 public/sounds의 20개 파일을 모두 디코딩하여 길이·피크·RMS·10구간 에너지 변화를 확인했습니다. 음색 선택에는 이 파일들과 합성 클릭을 유지합니다.
아래 보정 gain은 트랙 볼륨 및 타격 강약과 별도로 적용하며, 귀로 맞춘 최종 마스터링 값이 아닙니다.

| ID | 실제 파일 | 길이(초) | 피크 | RMS | 음색 보정 gain |
|---|---|---:|---:|---:|---:|
${audit.map(a=>`| ${a.id} | ${a.src} | ${a.seconds} | ${a.peak} | ${a.rms} | ${GROOVE_SAMPLE_GAIN[a.id]} |`).join('\n')}

- closedhihat.wav 대신 실제 파일명 closed hihat.wav, triangle.wav 대신 trangle.wav를 연결했습니다. 기존 options.js 매핑을 재사용합니다.
- brushsnare.wav는 0.475초이며 구간 RMS가 0.1712에서 0.0052로 감쇠합니다. 지속 루프가 아닌 단발 감쇠 샘플로 판단하여 원본을 사용합니다.
- ride.wav는 4.464초 감쇠 꼬리입니다. 반복 누적을 줄이기 위해 1.8초에 25ms 페이드 종료합니다.
- rim.wav와 stick.wav는 모두 초반 에너지에 집중된 단발 샘플입니다. 실제 청취를 하지 않았으므로 음색의 주관적 질감은 단정하지 않았습니다. 지정된 rim을 유지하되 샘플 gain 0.55와 낮은 트랙 볼륨으로 완화했습니다.
- 오픈 하이햇은 최대 0.35초 페이드 종료. 닫힌 하이햇이 예약되면 이전 열린 하이햇을 해당 오디오 시각부터 12ms 동안 감쇠합니다. 마디 경계를 넘어 동일하게 적용합니다.
- 다른 음원으로 대체한 항목은 없습니다. gpg4.wav 및 bass_a~g.wav는 사용하지 않았고 외부 음원도 추가하지 않았습니다.
- 샘플 일부 디코딩 피크가 1을 넘지만, 음색 보정·트랙 볼륨·마스터 헤드룸 적용 후 실제 출력은 아래와 같습니다.

## 재생·편집

- 기존 공통 AudioContext와 메트로놈 look-ahead scheduler에서 예약합니다. 추가 재생 타이머로 마디를 구동하지 않습니다.
- 12칸은 각 박을 정확히 3분할하며 12/8로 바꾸지 않습니다. 16칸은 4분할, 두 경우 모두 한 마디는 240/BPM초입니다.
- 각 행은 steps, velocities(100/70/45/25), volume(0~1), muted를 별도로 저장합니다. 구형 저장 팩에는 중=70, volume=.75, muted=false 기본값을 부여합니다.
- 기본 클릭/해제 또는 강약 선택 후 칸을 눌러 편집합니다. 트랙 음색·삭제·음소거·볼륨을 편집할 수 있습니다. 트랙 추가는 8개에서 비활성화합니다.
- 기본 뷰는 가로 스크롤 없이 한 마디를 표시하며, 190px 높이의 트랙 목록만 세로 스크롤합니다. 이름과 칸은 함께 움직이고 박자 헤더는 고정됩니다. 스크롤바 폭을 측정해 데스크톱에서도 열을 맞춥니다.
- 확대 편집은 같은 패턴 상태·오디오 시계를 사용하며 열기/닫기 중 재생을 유지합니다.
- 권장 BPM 체크박스는 기본 해제이며 현재 BPM을 유지합니다. 추천 팩 편집본은 새 이름의 사용자 팩으로 저장하며 원본을 덮어쓰지 않습니다.
- 미리 듣기는 편집 데이터를 적용하지 않고 현재 BPM으로 한 마디 재생합니다. 메인 메트로놈을 먼저 정지하고, 다른 팩/탭/검색으로 전환하거나 창을 닫으면 해당 미리 듣기 소스를 취소합니다.

## 검증 결과

- 데이터/메트로놈/레이아웃 Node 테스트 45개 통과: 모든 위치, 허용 강약, 범위, 샘플 경로, 12/16칸 마디 길이, 구형 데이터, gain 비율 및 choke 포함.
- 360/390/430px에서 8트랙 스크롤, 음색 선택, 한 줄 16칸, 헤더 정렬, 음소거·볼륨·강약, 확대 편집 공유, 재생 유지, 저장을 검증했습니다.
- 390px·1440px 다크 테마에서 팩 분류와 그리드 정렬을 확인했습니다. 화이트 테마도 유지합니다.
- 저장소 편집·덮어쓰기·복사·순서 보존과 미리 듣기 재생/정지/자동 종료/닫기 검증 통과.
- 실제 디코딩 음원으로 팩별 3마디 OfflineAudioContext 렌더링. 피크/RMS는 리미터 이전 출력이며 모든 피크가 1 미만입니다.

| 팩 | 3마디 타격 수 | 피크 | RMS |
|---|---:|---:|---:|
${render.results.map(r=>`| ${r.title} | ${r.scheduledHits} | ${r.peak.toFixed(4)} | ${r.rms.toFixed(4)} |`).join('\n')}

강 100 / 고스트 25 단독 스네어의 렌더 진폭 비율은 ${(render.strong/render.ghost).toFixed(4)}:1, 음소거 피크는 ${render.muted}입니다. 8개 음색을 강=100·볼륨=100%로 동시에 16회 반복한 스트레스 출력 피크는 ${render.stressPeak.toFixed(4)}였습니다.

실제 스피커/헤드폰 청취는 수행하지 않았습니다. 샘플 특성과 팩 음량 균형은 파형·출력 수치 기준의 초기 조정이며, 주관적인 최종 청감 튜닝은 남아 있습니다.
`;
writeFileSync('docs/groove-recommendations-verification.md',text);
