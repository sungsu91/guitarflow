# PDF 악보 연습실 구현·검증 보고 (2026-09-14)

## 기존 구조 확인과 유지

현재 `#etudes` 경로, App의 반응형 판정·사이드바·모바일 메뉴를 그대로 이용한다. 첫 화면을 PDF 보관함으로 바꾸고 기존 에튀드 커리큘럼은 「기존 연습곡 · 에튀드」로 접근한다. 새 전문 편집기를 만들지 않았다.

기존 ScoreEditor, scoreModel/scoreDocument, scoreLibrary, ScorePlayback, TAB↔오선보 및 부분 마디 캐시를 재사용한다. 기존 JSON 저장 키 `fretiva.etude.library.v2`와 이전 버전 마이그레이션은 변경하지 않았다. 기존 악보·교육곡을 삭제하거나 PDF로 변환하지 않았다. PDF 기능·라이브러리는 기존에 없었다. 설치용 manifest는 있지만 서비스 워커 등록/오프라인 앱 캐시는 없다.

구현 전에 전달한 충돌 판단: PDF는 편집 음악 데이터가 아니므로 기존 JSON 원본과 통합 변환하지 않는다. 보관함 UI만 공유하고 PDF 원본 저장은 별도 IndexedDB로 분리한다. 6현 기타의 오선보/TAB 보표 구성 추가·삭제는 현재 모델에 없으므로 이번에 새 음악 모델로 확장하지 않았다.

## PDF 저장 구조

DB: `fretiva.pdf.library.v1`, version 1.

- `scores` object store: id, SHA-256 fingerprint(고유 인덱스), title, artist, thumbnail(JPEG data URL), pageCount, bpm, meter, difficulty, tags, memo, lastPage, zoom, barMap, practiceOrder, countIn, audible, highlight, loop, loopStart/loopEnd, createdAt/updatedAt/lastPracticedAt.
- `files` object store: id, pdfBlob. 원본 Blob은 문자열/base64/localStorage로 변환하지 않는다.
- 새 악보는 두 store를 한 readwrite 트랜잭션으로 기록한다. 삭제도 같은 트랜잭션으로 원본·썸네일·마디 정보를 함께 삭제한다.
- 트랜잭션 complete 이후에만 저장 성공 표시. quota/접근 차단/중복 오류 구분. 변경 실패 시 화면의 설정을 유지하고 재저장 가능. 페이지·확대 변경은 쓰기 큐를 통해 순서대로 저장하며, 보관함으로 나가기 전에 완료를 기다린다.
- 보관함 목록은 `scores`만 읽으며 PDF 원본 전체를 함께 로드하지 않는다. SHA-256 동일 원본은 기존 악보 열기 확인을 제공한다. 시각적으로 같은 PDF여도 바이트가 다르면 별도 파일로 취급한다.
- 사이트 사용량/허용량 표시, persist 요청과 결과 안내, 기기 데이터 삭제 가능성 안내.
- 원본 PDF 다운로드. `.fretiva-pdf` 백업은 JSON manifest 길이 + manifest + 원본 PDF 바이너리로 구성한다. 복원 시 원본을 다시 검사하고 중복은 건너뛰어 기존 자료를 덮어쓰지 않는다. 중도 실패 시 완료 개수를 표시한다. 편집 JSON 악보는 기존 파일 내보내기로 별도 보관한다.

## 화면과 조작

PDF 불러오기 → 첫 페이지 썸네일 생성 → 제목/아티스트/BPM/박자/난이도/태그/메모 확인 → 기기 저장.

한 보관함에서 PDF 카드와 편집 가능한 FRETIVA 문서를 구분해서 보여준다. PDF 카드에 페이지 수, 마지막 페이지, 최근 연습 날짜를 표시하고 검색/정렬, 연습, 정보 변경, 원본 다운로드, 삭제 확인을 제공한다.

데스크톱은 기존 사이드바를 유지하고 PDF 중앙 영역 + 225px 연습 설정 + 하단 조작부를 사용한다. PDF 자체에 스크롤 영역을 둔다. 모바일은 별도 조건부 레이아웃으로 설정을 접고 하단 메트로놈을 고정한다. 기존 흰색 테마의 사이드바를 임의로 녹색으로 교체하지 않았다.

이전/다음 페이지, 페이지 번호 직접 입력, 25–250% 확대, 너비 맞춤, Fullscreen API를 제공한다. 미지원 브라우저는 가로 회전을 안내한다. 마지막 페이지와 배율은 기기에 저장되어 다시 열 때 복원된다.

## PDF 렌더링과 성능

PDF.js 5.4.624 + 로컬 worker를 사용한다. cmaps/standard fonts/wasm을 `public/pdfjs`에서 제공하여 파일을 외부 PDF 서버로 업로드하지 않는다. 리소스 동기화는 postinstall 스크립트에 포함했다.

현재 페이지 한 장만 렌더링한다. 새 작업에는 새 canvas를 배정하고 이전 RenderTask를 취소한다. 폐기된 작업은 표시 상태를 바꾸지 않는다. 페이지 cleanup, 문서 destroy 및 object URL 해제를 수행한다. 인접 페이지를 미리 렌더링하지 않아 메모리 사용을 낮췄다.

DPR 최대 2, canvas 600만 픽셀/한 변 4096 제한. 첫 페이지 썸네일도 220×320 안으로 제한한다. 파일 상한은 100MB. PDF 모듈과 기존 커리큘럼/편집기는 lazy-load한다. 메트로놈 박만 갱신될 때 PDF canvas는 다시 그리지 않는다.

참고한 공식 문서: [PDF.js 렌더링 예제](https://mozilla.github.io/pdf.js/examples/), [PDF.js API](https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib.html), [StorageManager.persist](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist). PDF.js의 viewport/DPR/worker 및 RenderTask 수명주기 개념을 사용했다.

## 메트로놈과 마디 진행

기존 `useEtudeMetronome`를 확장했다. `audioBus`, `transportClock`, `metronomeVolumeStore`와 기존 클릭 음색/리미터를 공유한다. 별도 PDF 음원 엔진을 만들지 않았다. BPM은 4분음표 기준으로 표시하고 분모 8 박자는 8분음표 간격으로 클릭한다.

공유 엔진에 절대 tick, beatsPerBar, beatUnit, audible, 선택적 마디 강박 판정을 추가했다. 기존 호출은 4/4 기본값 그대로다. 카운트인/마디 이동은 실제 AudioContext 시간의 tick에서 계산한다. 소리 OFF도 시각적 연습 진행은 유지한다. 백그라운드 전환 또는 화면 종료 시 정지한다.

마디 위치 설정에서 드래그한 사각형을 페이지 비율 좌표로 저장한다. 지정 마디만 강조하며 임의 자동 인식은 없다. 이전/다음 마디, 마디별 박 수, 영역 삭제, 쉼표로 구분한 연습 순서, 순서 내 시작/끝 구간 반복을 제공한다. 도돌이표/코다/엔딩을 자동 해석하지 않는다. 강조가 다음 페이지로 넘어갈 때 페이지 이동 및 해당 영역 스크롤을 수행한다. 박자 변경 시 이미 지정한 마디의 박 수는 자동으로 고치지 않는다.

## 간단 악보 만들기

기존 입력·주법·저장·Undo/Redo·오선/TAB 동기화·재생을 유지한다. 파일/편집/보기/악보 설정/재생 및 연습 메뉴는 기존 명령을 호출한다.

- 파일: 새 악보, JSON 불러오기, PDF 연습실로 PDF 불러오기(새 보관함에서 연 편집기), 저장, 별도 복사본 저장, JSON 내보내기, 인쇄 창의 PDF로 저장.
- 편집: Undo/Redo, 마디 복사/붙여넣기, 선택 음 삭제.
- 보기: 오선+TAB / 오선만 / TAB만, 확대, 데스크톱 속성 패널 숨김. SVG 표시 그룹만 변경하며 음악 데이터를 수정하지 않는다.
- 악보 설정: 기존 튜닝/박자/조표/마디 관리와 제목/BPM 속성으로 연결한다.
- PDF 내보내기는 SVG를 복제한 별도 인쇄 창을 제공한다. 자동 다운로드가 아닌 사용자의 인쇄 대화상자에서 PDF로 저장한다.

보표 구성 추가·제거, 악기 변경, 편집기 페이지/연속 보기 전환, MusicXML, 전문 편집기 수준의 신규 재생 구간 UI는 구현하지 않았다. 기존 정상 기능은 제거하지 않았다. 편집기의 「다른 이름으로 저장」은 현재 내용을 별도 ID의 복사본으로 저장하며 제목은 해당 복사본의 곡 정보에서 수정할 수 있다.

## 실행한 검증

- `npm run build`: 성공. 기존 큰 청크 경고 유지.
- `npm test`: 847개 중 829개 성공, 18개 실패. 실패 제목 집합이 병합 전 기록과 정확히 동일. 새 실패 없음. 공통 메트로놈 소스 검사 1개는 새 audible 분기를 반영하도록 갱신했다.
- 새 `tests/pdf-practice.test.mjs` 5개: 비율 좌표, Retina canvas 제한, 반복 순서/박 수, 바이너리 백업 길이 검사, 저장 오류 분류 통과.
- 기존 에튀드 관련 50개 테스트 통과.
- `verify-pdf-practice.mjs`: desktop 1440×1000, mobile 390×844/DPR3 터치 환경에서 24페이지 PDF 이동, 숫자 페이지 입력, 배율 복원, 카운트인·반복 강조, 마디 터치/드래그, 중복 확인, quota 실패/재시도, 삭제 후 Blob 조회 부재, 백업/복원, 편집 악보 보기 변경 후 데이터 동일, PDF 인쇄 창, IndexedDB 미지원 처리 통과. React/page 오류 0.
- 약 17.3MB 스캔 PDF 빠른 페이지 이동, 실제 사용자 TAB PDF 첫 페이지 표시, 여러 PDF 카드 및 첫 페이지 썸네일 확인.
- 240 BPM에서 일반 24페이지 이동 시 클릭 간격 250ms 유지. 큰 스캔 PDF 이동 중에도 측정한 클릭 간격은 250ms, 늦게 예약된 클릭 0. 관측 환경에 대한 결과이며 모든 기기의 무지연을 보장하지 않는다.
- 화면에 canvas 1개 유지. 관측 최대 canvas 약 desktop 113만 / mobile 451만 픽셀. 메트로놈만 실행할 때 렌더 횟수 불변.
- `verify-etude-keyboard-merge.mjs`: 기존 2→3 연속 입력/두 자리/방향키/부분 마디/64마디/저장/Undo/Redo/재생 동기화 desktop/mobile 통과. 기존 연습곡으로 진입하는 테스트 경로만 갱신했다.
- `verify-etude-ledger-hits.mjs`: 192회 덧줄 선택, 음악 데이터 불변, 선택 시 재컴파일 없음 통과.
- `verify-etude-drag.mjs`: desktop/mobile 드래그 및 Undo/취소 통과.
- `git diff --check`: 성공.

스크린샷과 결과: `artifacts/pdf-practice/real-score.png`, `desktop.png`, `mobile.png`, `library.png`, `verification.json`, `large-scan-audio.json`.

## 변경 파일

- `src/App.jsx`: #etudes 진입을 PDF 우선 lazy module로 연결.
- `src/pdf/PdfStudio.jsx`: 보관함, 파일 입력, 정보/확인 dialog, JSON 편집기 연결.
- `src/pdf/PdfPractice.jsx`: 연습 상태/저장 큐, 공통 메트로놈, 마디 순서/반복, desktop/mobile 조건부 배치.
- `src/pdf/PdfPage.jsx`: 렌더 작업 수명주기, DPR canvas, 비율 영역 입력/강조.
- `src/pdf/pdfRenderer.js`, `pdfLibrary.js`, `pdfModel.js`, `pdfStudio.css`.
- `src/etudes/useEtudeMetronome.js`: 기존 엔진의 박자/tick/음소거/강박 확장.
- `src/etudes/ScoreEditor.jsx`, `EditorScore.jsx`, `Score.jsx`, `scoreEditor.css`, 새 `printScore.js`: 기존 명령 메뉴, 표시만 변경하는 SVG 그룹, 인쇄.
- `package.json`, `package-lock.json`, `scripts/sync-pdf-assets.mjs`, `public/pdfjs/`(PDF.js 배포 리소스와 LICENSE).
- `scripts/verify-pdf-practice.mjs`, `tests/pdf-practice.test.mjs`, `tests/shared-accompaniment-panel.test.mjs`.
- 기존 회귀 스크립트 4개: `verify-etude-input.mjs`, `verify-etude-keyboard-merge.mjs`, `verify-etude-ledger-hits.mjs`, `verify-etude-drag.mjs`의 진입 경로 갱신.
- 이 문서와 검증 결과/스크린샷. 테스트용 PDF는 `tmp/pdfs/pdf-practice-24pages.pdf`에만 생성했다.

## 남은 제한

실제 iOS Safari/Android 기기, 프린터의 최종 PDF 저장, 브라우저의 persist 승인 여부는 확인하지 못했다. 테스트는 Chrome과 모바일 터치 에뮬레이션이다. 암호 PDF는 암호 해제 사본을 안내한다. PNG/JPG, 자동 악보 분석, PDF 텍스트 검색/주석 편집, 오프라인 앱 설치 캐시는 이번 범위에 포함하지 않는다. 기기 PDF 저장과 완전한 오프라인 앱 실행은 다르다.

원래 남아 있던 테스트 실패 18개 및 빌드 청크 경고는 유지한다. npm audit에서 기존 Vite/PostCSS/nanoid 관련 high 3개가 확인됐고 PDF.js는 해당 목록에 없다. 이를 이유로 관계없는 빌드 도구를 이번에 일괄 업데이트하지 않았다.

로컬 프로젝트만 수정했다. 커밋/푸시/배포는 하지 않았다. 검증은 별도 브라우저 프로필에서 수행하여 사용자의 기존 악보 저장소를 수정하지 않았다.

## 2026-09-14 좁은 화면 보완

- 첨부 화면의 100%는 PDF 원본 크기였으며 좁은 화면의 폭을 초과했습니다. 모바일에서 처음 열 때는 너비 맞춤으로 시작하고, 사용자가 선택한 모바일 배율은 `mobileZoom`으로 따로 보존합니다. 기존 `zoom`은 데스크톱용으로 유지합니다. 기존 PDF 및 백업은 그대로 열리며 `mobileZoom`이 없으면 맞춤으로 시작합니다.
- PdfPage의 ResizeObserver가 이미 패딩을 제외한 contentRect에서 다시 24px를 빼던 부분을 수정했습니다. 실제 용지 비율을 유지하고 현재 가용 폭에 맞춥니다. 확대 시에는 문서 내부에서 좌우 스크롤하고 앱 전체 폭은 늘어나지 않습니다.
- 페이지/전체화면과 확대 도구를 좁은 화면에서 두 줄로 분리했습니다. 너비 맞춤을 독립 버튼으로 제공하며 +/-는 현재 맞춤 배율에서 증감합니다.
- 핵심 도구는 최소 44px, 모바일 하단 조작은 48px 높이를 확보했습니다. 하단 safe-area 여백을 반영하고 큰 터치 화면에서는 재생 버튼 폭을 제한합니다.
- 실제 가용 폭이 작은 데스크톱 창도 설정을 접는 형태로 표시합니다. 휴대폰·태블릿은 기존 모바일 판별을 유지하며 큰 화면에서 도구 배치와 보관함 열 수만 조정합니다.
- 모바일/데스크톱 보기 설정만 분리했으며 PDF Blob, 마디 좌표, 저장 큐, 메트로놈 엔진은 그대로 공유합니다.
- 검증 스크립트: `scripts/verify-pdf-responsive.mjs`. 실제 Flower Dance PDF를 고립된 테스트 프로필에서 불러와 320/390/430px 휴대폰, 853px 펼친 화면, 1024px 태블릿, 915×412 가로 화면, 700px 데스크톱 창, 1440px 데스크톱에서 확인합니다. 화면 폭 넘침, 버튼 크기, 확대 스크롤, 페이지 이동, 배율 복원, 회전을 검사하고 `artifacts/pdf-responsive`에 결과를 남깁니다.
- 실제 iOS/Android 기기 및 물리적 화면 힌지에 걸친 브라우저 spanning은 검증하지 않았습니다. 특정 기기 모델의 지원을 보증하는 결과는 아닙니다.
- 이번 수정 파일: `src/pdf/PdfPage.jsx`, `src/pdf/PdfPractice.jsx`, `src/pdf/PdfStudio.jsx`, `src/pdf/pdfStudio.css`, `scripts/verify-pdf-responsive.mjs`, `scripts/verify-pdf-practice.mjs`, 이 문서. 회귀 검사는 모바일 배율의 저장 필드 분리에 맞춰 확인 경로만 변경했습니다.
- 최종 결과: 위 8개 화면 크기 모두 통과했습니다. 너비 맞춤에서 가로 넘침 0px, 도구/하단 조작부 넘침 0px, 핵심 버튼 최소 44px를 확인했습니다. 확대 상태에서는 PDF 영역 안에서만 스크롤되고 배율 복원 및 회전 후 맞춤도 통과했습니다. 브라우저 오류 0건. PDF 기존 통합 회귀 검사(데스크톱/모바일), PDF 단위 검사 5개, 프로덕션 빌드 모두 통과했습니다. 기존 큰 번들 경고는 남아 있습니다.

## 2026-09-14 마디 퀵 설정·진행선

- 상단 확대 UI를 배율 선택창 하나로 줄이고 −/＋ 및 중복 너비 맞춤 버튼을 제거했습니다. 선택창의 ‘너비 맞춤’은 그대로 유지합니다. 확보한 공간에 ‘마디 설정 / 설정 완료’를 배치했습니다.
- 사용 방법: 마디 설정 → 빈 곳에서 마디 사각형 드래그 → 설정 완료. 이미 지정한 마디에서는 포인터 이벤트가 생성 핸들러로 전달되지 않으며 클릭/터치로 선택합니다. 새 마디를 만든 직후에는 삭제 버튼을 표시하지 않아 연속 영역 입력을 방해하지 않습니다.
- 마디를 직접 선택하면 오른쪽에 작은 삭제 버튼이 표시됩니다. 확대·가로 스크롤 시 현재 화면 안에 머물도록 좌표를 보정합니다. 삭제는 선택 마디와 그 마디의 연습 순서 참조만 제거하고 나머지 영역 번호·좌표를 유지합니다. 자동 재생의 현재 마디와 수동 편집 선택을 구분했습니다.
- ‘지정한 마디 자동 강조’를 켜고 연습을 시작하면 진행선이 마디 안을 왼쪽에서 오른쪽으로 이동합니다. 공유 메트로놈의 AudioContext 시간(getPosition)을 읽고 카운트인, 마디별 박 수, 반복 순서를 반영합니다. 음표 위치를 인식하는 기능은 아니며 시간에 비례한 위치 안내입니다.
- 진행선만 requestAnimationFrame으로 갱신하며 PDF 재렌더링이나 프레임별 저장을 하지 않습니다. 정지 시 진행선을 숨기고 카운트인 동안에는 악보 진행을 시작하지 않습니다.
- 변경 파일: src/pdf/PdfPractice.jsx, src/pdf/PdfPage.jsx, src/pdf/pdfStudio.css, src/etudes/useEtudeMetronome.js. 검증: scripts/verify-pdf-bar-controls.mjs 및 기존 PDF 통합/반응형 검증 스크립트의 변경된 버튼 접근 경로.
- 새 동작 검증: 데스크톱 마우스/모바일 터치로 두 마디 생성, 기존 마디 내부 드래그에 의한 중복 생성 방지, 직접 선택·삭제, 재진입 후 삭제 유지, 카운트인, 연속 진행선 이동, 진행 중 PDF 렌더 횟수 유지. 결과와 화면은 artifacts/pdf-bar-controls에 저장합니다.
- PDF 단위 검사 5개 통과. 공유 반주 검사와 함께 실행하면 총 23개 중 21개 통과, 실패 2개는 기존 로그의 동일 반주 UI 검사이며 이번 PDF 변경 대상이 아닙니다. 빌드 통과.

## 2026-09-14 같은 줄 맞춤·한 줄 분할

- ‘한 마디씩’은 기본적으로 같은 페이지의 가까운 같은 줄을 찾아 새 마디의 y/높이만 맞춥니다. x/너비는 사용자가 그린 범위를 유지합니다. 기존 마디의 좌표는 변경하지 않으며 ‘같은 줄 높이 맞춤’을 끌 수 있습니다. 다른 줄과 페이지를 잘못 붙이지 않도록 세로 중심 거리 및 높이 비율을 검사합니다.
- ‘한 줄 나누기’에서 전체 영역을 드래그하고 1~16마디 중 원하는 개수를 선택합니다. 점선 미리보기를 확인하고 ‘나누어 저장’을 눌러야 저장됩니다. 4마디 고정 기능이 아닙니다.
- 선택한 수만큼 같은 너비의 독립 마디 레코드를 한 번에 저장합니다. 기존 마지막 번호 뒤부터 연속 번호를 부여하며, 별도 삭제·선택·자동 진행에 기존 로직을 그대로 사용합니다. 인쇄된 마디 폭이 불균등하면 한 마디씩 지정하도록 안내합니다.
- 모바일에서 근접한 빈 공간 터치를 브라우저가 기존 마디 버튼으로 보정하는 경우를 실제 터치 이벤트로 재현했습니다. 실제 사각형 밖의 입력은 새 영역으로 처리하고, 앱의 교차 대상 클릭 방지 장치는 PDF 마디 설정 중에만 paper 영역을 하나의 드래그 범위로 취급하도록 좁게 보완했습니다. 다른 앱 버튼의 오클릭 방지 동작은 유지합니다.
- 수정 파일: src/pdf/pdfModel.js, src/pdf/PdfPage.jsx, src/pdf/PdfPractice.jsx, src/pdf/pdfStudio.css, src/App.jsx. tests/pdf-practice.test.mjs에 좌표 보존·맞춤 범위·등분 검사를 추가했습니다. scripts/verify-pdf-row-mapping.mjs는 데스크톱/모바일에서 연속 두 마디 맞춤, 1/2/3/4칸 미리보기, 4칸 저장, 기존 좌표 보존, 독립 삭제 및 다시 열기를 검사합니다.
- 단위 검사 7개 및 프로덕션 빌드 통과. 브라우저 결과와 화면은 artifacts/pdf-row-mapping에 저장합니다.
