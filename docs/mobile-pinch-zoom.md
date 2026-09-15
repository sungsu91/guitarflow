# 모바일 악보/PDF 핀치 — 2026-09-15

## 화면과 동작

- 모바일 PDF 및 편집 가능한 악보는 열 때 너비 맞춤으로 시작한다. 모바일의 100%는 현재 보기 영역에 맞춘 너비를 뜻한다. PDF 원본의 포인트 단위 100%와 구분한다.
- 모바일의 배율 select 목록을 제거했다. 작은 `너비 맞춤` 버튼과 누를 수 없는 현재 배율 표시만 제공한다. 편집기의 보기 메뉴에도 배율 목록을 노출하지 않는다.
- 두 손가락 벌리기/오므리기로 25–400% 조절. 확대 후 한 손가락으로 보기 영역을 스크롤한다. 화면 가장자리의 스크롤 한계에서는 위치가 범위 안으로 제한된다.
- 제스처의 중심과 해당 악보 마디/PDF 페이지 안의 상대 위치를 함께 기록한다. 종료 시 새 크기에 맞춰 스크롤을 복원한다. 연속 PDF는 전체 길이의 비율만 쓰지 않고 실제 해당 페이지를 기준으로 보정한다.
- 데스크톱 배율 목록은 유지한다. 모바일에서 임의의 배율을 사용한 뒤 화면이 넓어져도 그 배율을 목록에 표시할 수 있다.
- 악보·PDF 영역에만 touch-action과 비수동 터치 리스너를 적용한다. 브라우저 viewport 배율이나 하단 입력 패널의 크기는 변경하지 않는다.

## 기존 기능 보호

- 핀치 중 임시 CSS transform과 스크롤 범위만 갱신한다. React 배율 상태는 종료 시 한 번 확정한다.
- SVG 음악을 재생성하거나 음표·프렛·피킹·저장 데이터를 수정하지 않는다. PDF는 종료 후 기존 PDF.js 렌더러가 필요한 해상도로 갱신한다.
- 기존 드래그 상태를 취소하고 핀치에서 생기는 클릭을 짧게 차단한다. 드래그 처리의 클릭 차단 상태가 다음 정상 탭까지 남지 않도록 정리했다.
- 터치 드래그에서는 첫 손가락이 닿은 순간의 선택을 지연시켜 두 번째 손가락이 들어올 때 잘못된 선택이 확정되지 않게 했다. 데스크톱 마우스 입력은 기존 방식을 유지한다.
- PDF의 마디 설정 첫 점은 확대 중 생성되지 않는다. 기존 마디 설정·메모·자르기 데이터는 유지한다.
- 배율 변경을 이유로 선택 음표/활성 마디까지 자동으로 스크롤하던 경로를 분리했다. PDF 로딩 표시도 문서 높이를 밀어내지 않게 했다.
- 연속 PDF의 지연 렌더링에서 외부 크기와 실제 페이지 크기가 서로 다른 시점에 바뀌는 경우, 페이지의 새 크기를 확인한 후 중심을 복원한다.
- PDF 원본·IndexedDB·악보 JSON 구조 변경 및 마이그레이션은 없다. 데스크톱의 저장된 배율은 유지하고, 모바일의 새 열기는 요청대로 항상 너비 맞춤을 적용한다. 마지막 페이지는 그대로 복원한다.

## 실행한 검증

- `scripts/verify-mobile-pinch.mjs`: 실제 Chrome의 CDP TouchEvent 입력을 사용했다. 단순 JS 함수 호출로 핀치를 흉내 낸 검사는 아니다.
  - 편집기: 360×800, 375×812, 390×844, 393×852, 430×932.
  - PDF 단일·마디 설정·연속 페이지: 390×844.
  - 확대, 축소, 두 손가락 중심 이동, 확대 후 한 손가락 스크롤, 너비 맞춤 후 세로 위치 유지.
  - 제스처 중/후 SVG 마디 재그리기 횟수 유지, 제스처 중 PDF 재렌더 없음.
  - `visualViewport.scale`은 1 유지. 하단 패널은 화면 안에 그대로 유지.
  - 확대 중 음표 선택·음악 저장 데이터 변경 없음. 완료 후 TAB·오선보·피킹 기호를 실제 터치로 선택 가능.
  - 선택적 모바일 음표 드래그를 켜도 핀치가 음표를 선택/이동시키지 않음.
  - PDF 다시 열 때 100% 너비 맞춤 복귀, 데스크톱 배율 목록 유지.
  - 측정 중심 오차는 검사 지점에서 가로/세로 1 CSS px 미만. React 오류 0.
- `scripts/verify-desktop-score-shortcuts.mjs`: 숫자/방향키, 도구 사용 후 키보드 입력, Delete, Undo/Redo, 음 길이, 폼 포커스 분리 통과.
- `scripts/verify-pdf-fullscreen.mjs`: 데스크톱 native fullscreen, 모바일 fallback, 페이지 이동, 닫기/Escape, 렌더러 유지 통과. 모바일 단언은 새 배율 상태 표시로 갱신했다.
- `node --test tests/etude-input.test.mjs tests/mobile-score-input.test.mjs tests/pdf-practice.test.mjs tests/pdf-annotations.test.mjs`: **39개 통과**.
- `npm run build`: 통과. 기존 대형 번들 경고 유지.

## 변경 파일

- `src/hooks/useScorePinch.js`: 공통 제스처·중심 보정·클릭 보호
- `src/components/MobileScoreZoom.jsx`, `mobileScoreZoom.css`: 모바일 전용 작은 배율 UI
- `src/etudes/EditorScore.jsx`, `ScoreEditor.jsx`, `useScoreDrag.js`, `scoreEditor.css`: 기존 악보 렌더러/입력에 연결
- `src/pdf/PdfViewToolbar.jsx`, `PdfPractice.jsx`, `PdfPage.jsx`, `PdfContinuous.jsx`, `pdfStudio.css`: PDF 단일/연속 보기 연결
- `scripts/verify-mobile-pinch.mjs`, `scripts/verify-pdf-fullscreen.mjs`: 브라우저 검증
- 이 문서

## 캡처·남은 확인

`artifacts/mobile-pinch/results.json`, `390-editor-130.png`, `390-editor-fit.png`, `390-pdf-200.png`, `390-pdf-continuous.png`에 결과를 저장했다.

실제 iPhone/iPad Safari와 Android 기기 하드웨어에서의 터치 사용감 평가는 아직 수행하지 않았다. 검증한 것은 Chrome 모바일 에뮬레이션의 실제 터치 이벤트 및 화면/데이터 동작이다. iOS의 앱 복귀·메모리 압박 상황은 기기 확인이 필요하다.
