# 빈 입력 슬롯과 실제 쉼표 구분

2026-09-16. 로컬 수정, 배포하지 않음.

## 원인

기존 blankEvent는 실제 쉼표와 똑같은 rest:true 데이터였다. deleteTone도 마지막 음을 없앤 후 rest:true로 되돌렸기 때문에 쉼표 기호가 남았다. 초록색 사각형은 음악 데이터가 아닌 EditorScore의 별도 입력 커서였다.

기존 저장본에는 자동 빈칸인지 직접 입력한 쉼표인지 구분할 정보가 없다. 기존 rest를 추측으로 숨기지 않는다. 해당 위치에서 삭제하면 빈 슬롯으로 바뀌며 Undo로 복원된다.

## 변경

- 새 빈 슬롯/길이 분할 자리/삭제한 음의 자리에는 blank:true를 저장한다. rest:true와 onset/duration은 무음 시간 계산을 위해 유지한다.
- 직접 입력한 쉼표와 음에는 blank:false를 저장한다.
- 렌더러는 빈 슬롯을 VexFlow GhostNote로 구성한다. CSS로 쉼표를 숨기지 않는다. 오선보·TAB 리듬·보기 화면에 불필요한 쉼표 기호를 생성하지 않는다.
- 삭제는 선택한 음 또는 명시적인 쉼표를 비운다. 뒤쪽 event의 onset/ID는 그대로 유지한다. 빈 슬롯 삭제는 아무 변경도 만들지 않는다.
- 삭제된 음으로 연결되는 붙임줄/H/P/SL도 정리해 존재하지 않는 연결 대상 때문에 재생이 막히지 않게 한다.
- 피킹 지움은 pickStroke만 지우고 음표/길이는 유지한다.
- 입력 커서는 얇은 세로선으로 표시한다. 이전 선택 위치의 커서는 제거하고, 마디 배경 선택과 재생 중에는 숨긴다. 연습 보기에는 생성하지 않으며 인쇄용 SVG에서도 제거한다.
- 데스크톱 속성의 빈 위치/쉼표 문구 및 삭제 버튼 활성 상태도 구분했다.

## 파일

src/etudes/scoreModel.js
src/etudes/editorCommands.js
src/etudes/scoreDocument.js
src/etudes/Score.jsx
src/etudes/tabRhythm.js
src/etudes/EditorScore.jsx
src/etudes/ScoreEditor.jsx
src/etudes/EditorInputPanel.jsx
src/etudes/printScore.js

tests/score-empty-slots.test.mjs
scripts/verify-score-empty-slots.mjs

## 검증

- 관련 단위/회귀 테스트 55개 통과. 빌드 통과(기존 대형 번들 경고 유지).
- Chrome 390×844 터치 에뮬레이션 및 1440×1000 데스크톱에서 실제 편집 화면 검증.
- 마지막 두 빈 슬롯은 기호가 없고, 실제 쉼표 입력 시 쉼표 한 개가 추가됨.
- 음표/쉼표 삭제 및 Undo/Redo, 뒤쪽 시간 위치 유지, 빈 슬롯 삭제 no-op 확인.
- 피킹 지움 후 프렛/음 길이 보존 확인.
- 저장 후 실제 보관함에서 연습 화면 재진입 시 커서 없음, 편집 재진입 후 저장 데이터 동일성 확인.
- legacy rest는 표시를 유지하고 사용자 삭제 시 사라지는 동작 확인.
- 한 마디 수정 후 다른 마디의 draw count가 변하지 않음.
- 브라우저 pageerror 없음. 실제 iPhone 실기기 검증은 수행하지 않음.

캡처: artifacts/score-empty-slots/390-trailing-empty.png, 390-explicit-rest.png, 390-deleted-note.png.
