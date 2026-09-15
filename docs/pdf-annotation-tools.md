# PDF 주석 도구 변경 및 검증 (2026-09-15)

## 실제 변경

모바일 편집은 PDF 아래, 연습 시작 바 바로 위의 고정 아이콘 툴바(이동/선택, 펜, 텍스트, 자르기, Undo, Redo)를 사용한다. 데스크톱은 같은 기능과 데이터로 문서 아래 도구를 표시하며 모바일 고정 배치를 강제하지 않는다. 도구별 상단 대형 텍스트 폼과 자르기 두 점 입력은 제거했다. 마디 설정은 별도 작은 버튼과 기존 1~4마디 입력을 유지한다.

- 펜: PDF 위에서 직접 입력. 색상/두께/불투명도는 작은 팝오버에 둔다. 바깥 터치로 닫힌다. 선택 도구에서 필기 경로를 터치·끌어 이동하고 속성/삭제를 사용할 수 있다.
- 텍스트: T → 위치 터치 → 해당 위치 인라인 입력 → 체크 또는 Enter. 새 입력에는 확인·취소만 둔다. 기존 메모를 선택하면 이동 손잡이, 색상/크기, 삭제가 나온다. 화면 오른쪽 끝에서는 입력 UI가 화면 안쪽으로 펼쳐진다. 저장 좌표는 사용자가 터치한 PDF 위치다.
- 자르기: 유지 사각형, 바깥 어두운 영역, 네 모서리와 네 변 손잡이. 적용/취소/초기화를 제공한다. 기존 제거 영역 두 점 선택 방식은 사용하지 않는다. 이미 잘라낸 페이지를 원본 범위로 다시 넓히려면 초기화 후 조절할 수 있다.
- 마디: 기존 두 점 + 1~4 분할 방식과 별도 barMap. 자르기와 손잡이를 공유하지 않는다.
- 보기: 손 도구의 일반 스크롤/확대 후 이동, 공용 두 손가락 핀치, 너비 맞춤, 페이지 이동, 연속 보기, 전체화면을 유지했다. 전체화면 안에서도 편집 툴바를 사용할 수 있다.

## 저장과 좌표

PDF 파일은 기존 IndexedDB `fretiva.pdf.library.v1`의 files 저장소에 보존한다. 주석은 기존 scores 레코드의 `pageEdits[페이지 번호]`에 연결된다. 새로운 데이터베이스나 로그인은 추가하지 않았다.

```js
pageEdits: {
  1: {
    crop: null, // 이전 버전 crop도 읽을 수 있음
    margins: { top: 0.1, right: 0, bottom: 0, left: 0.05 },
    notes: [{ id, x, y, text, size, color, /* optional */ rotation }],
    strokes: [{ id, points: [[x,y], ...], color, width, opacity }]
  }
}
```

x/y는 원본 PDF 페이지 너비/높이 기준 0~1. 펜 두께와 텍스트 크기는 원본 페이지 너비 비율이다. SVG 오버레이의 viewBox에 자르기 변환을 적용하므로 확대·너비 변경·자르기 시 원본 좌표를 다시 쓰지 않는다. 기존 메모 색상과 crop는 그대로 읽으며 새 strokes 필드가 없으면 빈 필기 목록이다. 회전 메타데이터는 보존·표시하지만 회전 편집 UI는 추가하지 않았다.

기존 applyEdit/Undo/Redo와 IndexedDB 저장 큐를 재사용한다. 펜은 한 스트로크 종료, 필기 이동은 드래그 종료, 자르기는 적용, 텍스트는 확인 때 각각 변경을 확정한다. 저장 실패는 표시하고 현재 편집 결과를 남겨 재시도할 수 있다. IndexedDB 트랜잭션 생성 자체가 실패할 때도 연결을 닫도록 정리했다.

보관함 바이너리 백업에 pageEdits가 포함된다. 원본 PDF 내보내기는 계속 원본 파일만 내보내며 주석을 PDF 파일 내부로 합치는 기능은 이번 범위가 아니다.

## 성능과 입력 안정성

- 펜 move 중 coalesced pointer 좌표를 모으고 requestAnimationFrame으로 임시 SVG path만 갱신한다. 매 move마다 React 상위 상태·IndexedDB·PDF.js를 호출하지 않는다.
- 필기/메모 이동은 드래그 중 DOM transform 미리보기, 종료 시 좌표 확정이다.
- 두 번째 터치가 들어오면 미확정 필기를 취소하고 기존 useScorePinch에 제어를 넘긴다. 필기 hit path의 SVG 조상에 touch-action을 지정해 필기 이동이 브라우저 스크롤에 취소되지 않게 했다.
- PDF.js renderCount가 필기·텍스트 변경 중 유지되고 핀치 중에도 렌더 작업이 발생하지 않는 것을 검사했다. 핀치 완료/실제 자르기 적용에는 필요한 PDF 재렌더가 실행된다.
- 도구별 큰 패널 대신 높이가 고정된 하단 문맥 행을 사용한다. 모바일 PDF 높이는 실제 툴바 위 가용 공간을 계산하므로 툴바와 연습 바에 가리지 않는다.
- VisualViewport resize에 따라 키보드가 입력 위치를 가릴 때 내부 스크롤로 노출하는 경로를 구현했다. 실제 iOS 키보드/스타일러스 하드웨어 검증은 별도다.

## 실행한 검증

- `node --test tests/pdf-practice.test.mjs tests/pdf-annotations.test.mjs tests/pdf-annotation-tools.test.mjs tests/playback-transport-stability.test.mjs`: 20개 통과.
- `scripts/verify-pdf-annotation-tools.mjs`: Chrome CDP 모바일 터치 360×800, 375×812, 390×844, 393×852, 430×932 및 데스크톱 1440×1000. 실제 PDF를 불러와 연속 필기, 팝오버, 인라인 텍스트/속성/이동, 자르기 8개 손잡이 존재 및 조절, 복원, Undo/Redo, 재열기, 백업, 원본 PDF 해시 보존, 가로 넘침/도크 겹침 없음 확인.
- `scripts/verify-pdf-annotation-gestures.mjs`: 390×844 추가 검사. 필기 이동/색상/삭제, 텍스트 삭제/Undo, 마디 4칸 설정과 자르기 후 좌표 보존, 펜 모드 핀치가 불필요한 필기를 만들지 않음, 확대 중심 오차 5px 미만, 확대 후 일반 이동, 페이지별 자르기/취소, 전체화면/연속 보기, QuotaExceededError 강제 발생 후 다시 저장, 재생 시작 후 편집 진입 시 정지 및 반복 진입 검사.
- 골드다크 390×844 동일 기본 편집 흐름 통과.
- `npm run build` 통과. 기존 큰 번들 경고는 남는다.
- Chrome 에뮬레이션 결과이며 실제 휴대폰 및 OS 키보드 검증이라고 보고하지 않는다.

## startTime 오류 조사 결과

이번 요청의 첨부는 목업이며 오류 스택의 파일명/줄 번호가 없다. 현재 PdfPractice/useEtudeMetronome에는 startTime 필드가 없고, 재생 중단 시 session을 null로 비우고 타이머/RAF를 취소하며 getPosition은 세션이 없으면 -1을 반환한다. 현재 소스와 로드되는 Vite 의존성의 startTime 접근도 확인했다. 설치된 react-dom은 19.2.6이며 리소스 타이밍 접근의 배열 경계 조건이 있다. 어느 소스가 사용자 오류를 발생시켰는지는 확정하지 않았다.

수정 전 및 후 실제 PDF 열기, 재생/정지/편집 반복 시 페이지 예외가 발생하지 않았다. 따라서 startTime 오류를 optional chaining으로 숨기거나 해결했다고 처리하지 않았다. 재발 시 파일명/줄 번호 또는 스택을 받아 해당 경로를 확인해야 한다.

## 변경 파일

- `src/pdf/PdfPractice.jsx`: 기존 저장/히스토리 연결, 주석 도구 상태, 모바일 도크/가용 높이.
- `src/pdf/PdfPage.jsx`: 기존 PDF.js 렌더러와 마디 영역 유지, 새 오버레이 연결, 자르기 두 점 입력 제거.
- `src/pdf/PdfAnnotationLayer.jsx`: 펜/텍스트/자르기 직접 조작과 아이콘 도구.
- `src/pdf/pdfAnnotationTools.css`: 모바일/데스크톱 배치, 입력 오버레이, 손잡이, 테마.
- `src/pdf/pdfAnnotations.js`: 펜 필드 정규화, 좌표/자르기/경로 이동 함수.
- `src/pdf/pdfLibrary.js`: 트랜잭션 생성 실패 시 DB 연결 정리.
- `tests/pdf-annotation-tools.test.mjs`: 새 주석과 기존 데이터 호환/좌표 검사.
- `scripts/verify-pdf-annotation-tools.mjs`, `scripts/verify-pdf-annotation-gestures.mjs`: 브라우저 조작 검증. 기존 `scripts/verify-pdf-simple-edit.mjs` 진입점은 이 두 검증을 실행하도록 연결했다.
- `docs/pdf-annotation-tools.md`: 이 기록.

캡처: `artifacts/pdf-annotation-tools/390-inline-text.png`, `390-pen.png`, `390-crop.png`, `390-final.png`.

## 후속 조작 개선: 완료된 텍스트 직접 이동

- 편집 모드의 이동/선택 또는 텍스트 도구에서, 저장된 텍스트를 바로 끌어 이동한다. 짧게 누르면 기존 인라인 편집기를 연다. 드래그 뒤 발생하는 click은 편집기로 연결하지 않는다. 키보드 Enter/Space로는 편집을 열 수 있다.
- 드래그 중에는 DOM transform만 갱신하고, 놓을 때 선택한 메모의 x/y만 기존 editPage 경로로 저장한다. 원래 회전과 다른 메모/필기 데이터는 유지한다. 두 손가락 제스처로 취소하면 미리보기를 되돌린다. 기존 인라인 이동 손잡이도 유지했다.
- 펜 선택 시 하단 색상·두께·불투명도 팝오버를 바로 연다. 펜 버튼을 다시 누르거나 현재 색상이 표시된 ‘색상 · 두께’를 눌러 다시 열고 닫을 수 있다. PDF를 누르면 팝오버가 닫히며 필기를 시작한다.
- verify-pdf-annotation-tools.mjs에 완료된 텍스트 직접 터치/마우스 이동, 편집창 미표시, PDF 재렌더/스크롤 없음, Undo/Redo, 자동 펜 팝오버 검사를 추가했다.
