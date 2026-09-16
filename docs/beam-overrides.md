# 사용자 지정 빔 연결

2026-09-16 로컬 구현. 아직 배포하지 않음.

- 기존 VexFlow 자동 빔 계산은 그대로 호출한다. 사용자 설정이 없으면 그 결과를 변경하지 않는다.
- event.beamBefore: join / break. 필드가 없거나 auto이면 자동. 자동 버튼은 해당 필드를 제거한다.
- 선택 음 속성에 빔 [자동] [← 연결] [끊기] 한 줄을 추가했다. 모바일은 메뉴 → 음표, 데스크톱은 기존 음표 속성에서 사용한다.
- 4/4의 8분음표 여덟 개: 자동 2+2+2+2 유지. 3번째와 7번째 음을 연결하고 5번째 음 앞을 끊으면 4+4.
- 경계 정보만 저장하므로 duration/onset/notes/BPM/마디 길이는 변경하지 않는다. 기존 저장·JSON 불러오기·Undo/Redo 경로를 사용한다.
- 오선보와 TAB 리듬 표시는 같은 경계 보정 함수를 사용한다. 8분은 빔 1줄, 16분은 2줄이다.
- 마디 첫 음, 쉼표, 빈 슬롯, 시간 간격/겹침, 4분 이상의 음 길이를 넘어 연결할 수 없다. 붙어 있는 8분+16분 혼합은 표준 빔/보조 빔으로 표시할 수 있으므로 허용한다. 이후 음 길이를 수정해 연결이 불가능해지면 렌더러가 해당 연결을 적용하지 않는다.
- 기존 범위 선택은 마디 복사용이며 음표 범위 선택은 없다. 이번에는 새 범위 선택 UI를 추가하지 않고 선택 음 단위로 제공한다.

## 검증

관련 테스트 45개 통과. 프로덕션 빌드 통과(기존 번들 크기 경고 유지).

Chrome 390×844 모바일 터치 에뮬레이션 및 1440×1000 데스크톱에서:
- 자동 2+2+2+2 저장 → 닫기/새로고침 → 다시 열기 → 실제 재생 시작/정지.
- UI로 3·7번 연결 및 5번 끊기 → 4+4 저장 → 닫기/새로고침 → 다시 열기 → 실제 재생 시작/정지.
- 두 문서의 guitarVoiceTimeline 전체 데이터 동일성 확인.
- 자동 복원, 첫 음 연결 버튼 비활성 확인.
- 실제 SVG 경로 검사: 8분 빔 한 줄, 16분 빔 두 줄. TAB 4+4 연결선도 확인.
- 브라우저 pageerror 없음. 실기기/iOS 청취 테스트는 수행하지 않음.

## 변경 파일

src/etudes/beamOverrides.js (신규)
src/etudes/Score.jsx
src/etudes/tabRhythm.js
src/etudes/scoreModel.js
src/etudes/ScoreEditor.jsx
src/etudes/scoreEditor.css

tests/beam-overrides.test.mjs (신규)
scripts/verify-beam-overrides.mjs (신규)

## 캡처

artifacts/beam-overrides/390-auto.png
artifacts/beam-overrides/390-custom.png
artifacts/beam-overrides/390-controls.png
