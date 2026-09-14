# 에튀드 키보드 UX 병합 결과 — 2026-09-14

## 비교와 병합 범위

첨부 ZIP을 `tmp/incoming-etude-keyboard-20260914/FRETIVA-LAB`에 별도 해제하고 파일별 바이트 비교를 수행했다. 7개 파일 변경, 문서 1개 추가가 기능 관련 차이였다. 첨부의 PROJECT-HANDOFF.md는 전달본 안내이므로 프로젝트에 추가하지 않았다.

7개 변경 대상의 현재 파일은 전달했던 editing-light ZIP의 공통 원본과 모두 동일했다. 따라서 이 파일들에는 양쪽에서 동시에 변경한 충돌이 없었다. 병합 전 파일은 tmp/etude-keyboard-premerge-20260914에 보관했다. src/public 등 다른 파일은 덮어쓰지 않았으며 제외된 게임 자산도 현재 저장소에서 보존했다.

| 파일 | 처리 |
|---|---|
| src/etudes/ScoreEditor.jsx | 첨부의 2열/문맥형 UI, 길이 입력, 자동 이동 병합. 명시적 숫자 모드, 타이머 취소, 원자적 Undo 보완. 마디 선택 직후 이전 마디로 돌아가던 연속 setter 수정. |
| src/etudes/EditorInputPanel.jsx | 첨부의 단일 문맥형 입력 패널 재사용. 길이 변경 중복 제거. |
| src/etudes/EditorScore.jsx | 첨부의 마디 여백 선택 추가. 기존 덧줄 선택/커서와 마디별 렌더링 유지. |
| src/etudes/editorCommands.js | 첨부의 길이별 입력/쉼표 분할 재사용. 숫자 판정 분리, 주석·연결이 있는 쉼표 보존, 이벤트 수/중첩 보호 보완. |
| src/etudes/scoreEditor.css | 첨부 2열 레이아웃 병합. 숨김 처리 대신 조건부 렌더링, 모바일 키패드 겹침 해소, 입력 모드 버튼 추가. |
| tests/etude-input.test.mjs | 첨부 2개 검사 및 숫자/길이 변경 경계 회귀 검사 추가. |
| scripts/verify-etude-input.mjs | 첨부 Undo 수정 병합 후 현재 입력 모드/길이 UI에 맞게 기존 검사 유지. |
| docs/etude-keyboard-entry-ux.md | 첨부 문서를 실제 최종 입력 동작과 차이가 없도록 갱신. |
| scripts/verify-etude-keyboard-merge.mjs | 요청된 실제 브라우저 입력·성능·동기화·저장 검증 추가. |
| docs/etude-keyboard-merge-report.md | 이 결과 보고서. |

Score.jsx, useScoreDrag.js, scoreModel.js, scoreLibrary.js, scorePlayback.js, 기존 커리큘럼은 변경하지 않았다. 이전 덧줄 소유 음표 판정, 표준 튜닝 문구 제거, 설정 아래 설명 제거는 유지했다.

## 입력 및 안정성 검증

| 시나리오 | 결과 |
|---|---|
| 4분음표 2→3→2→3 / 빈 위치 8분음표 연속 입력 | desktop/mobile 모두 순서·음 길이·시점 일치 |
| 10/12/15/23 두 자리 | F2로 두 자리 모드에서 정상. 기본 연속 모드의 빠른 2→3은 합쳐지지 않음 |
| 첫 숫자가 기존 프렛과 같을 때 Undo | 수정 직전 데이터로 정확히 복원; 이전 작업까지 잘못 취소하지 않음 |
| 빠른 방향키, 자동 이동 On/Off, R | 정상; 선택만으로 컴파일/악보 재그리기 발생하지 않음 |
| Delete → Undo → Redo 3회 | 전체 원본 데이터/ID 비교 통과 |
| 64마디 마지막 부분, 150% 확대, 모바일 터치 키패드 | 선택한 마지막 마디만 변경; 다른 저장본 보존 |
| TAB↔오선보↔재생 | 실제 튜닝+프렛 MIDI와 작성 옥타브(+12), 재생 이벤트 MIDI 일치. UI 합성음 시작/정지 확인 |
| 저장 후 닫기/새로고침/불러오기 | 전체 JSON의 음·운지·리듬·ID 동일 |
| 덧줄 | 기존 스크립트의 위/아래/화음 덧줄 192회 통과. 개방현 및 데이터 불변 |
| 드래그 | desktop/mobile, 실제 CDP 터치, 부분 이동, Undo, Escape 및 이동 중 재그리기 없음 통과 |
| React/브라우저 런타임 오류 | 위 검사 중 0건 |

## 성능 실측

30개 연속 입력 각각 컴파일 1마디·SVG 재그리기 1마디. 관계없는 마디의 draw-count는 불변. 64마디 마지막 위치 입력도 해당 마디만 한 번 컴파일/표시한다. 구조를 다시 쓰거나 의미 없는 memoization을 추가하지 않고 기존 마디별 캐시/참조 보존을 재사용했다.

| 환경 | 입력→다음 화면 프레임 중앙값 | p95 | 최대 | 30음 컴파일 / 마디 재그리기 |
|---|---:|---:|---:|---:|
| 데스크톱 Chrome | 15.2ms | 51.8ms | 55.7ms | 30 / 30 |
| 모바일 Chrome 에뮬레이션 | 13.5ms | 18.7ms | 19.5ms | 30 / 30 |

개발 서버·이 PC·Chrome에서의 관측값이며 실제 휴대폰 성능을 보증하지 않는다. 입력 데이터 누락/누적 지연은 재현되지 않았지만 데스크톱의 일부 입력은 한 프레임(16.7ms)을 넘으므로 모든 입력이 60fps라고 주장하지 않는다.

## 명령 결과 및 남은 문제

- npm run build: 성공. 기존 큰 청크(500kB 초과) 경고 유지.
- 에튀드 관련 Node 검사: 50/50 성공.
- npm test: 842개 중 824개 성공, 18개 실패. tmp/etude-baseline-tests.txt 및 tmp/etude-head-baseline.txt와 실패 제목 집합이 완전히 동일하며 새 실패는 없다. 기존 슈팅게임/레이아웃/리듬 관련 검사 실패는 이번 악보 병합 범위 밖으로 남겨뒀다. 전체 검사가 모두 성공했다고 주장하지 않는다.
- 합성 재생의 H/P/SL 실제 기타 음색/잔향 표현 미지원은 기존 UI 안내대로 유지된다.
- 실제 휴대폰 하드웨어/실물 키보드/기타 연주 검수는 수행하지 않았다. Chrome 마우스·키보드 및 모바일 터치 에뮬레이션 검사다.
- 병합은 로컬 작업 트리에만 반영했다. 커밋/푸시/배포하지 않았다.

결과 데이터: artifacts/etude-keyboard-merge/verification.json, incoming-reproduction.json, all-node-tests.txt. 화면: desktop.png, mobile.png. 덧줄/드래그 결과는 artifacts/etude-input/ledger-hits.json 및 기존 드래그 검증 출력 참고.
