# PDF 보기·연습 / 편집 모드 정리

2026-09-16 로컬 작업. 이번 변경은 아직 배포하지 않았습니다.

## 구현

- 보관함에서 PDF를 열면 보기·연습 모드로 진입합니다. 상단 편집/완료로 전환하며 페이지, 확대율, 스크롤을 보존합니다.
- 편집 도구: 이동/선택 → 펜 → 텍스트 → 자르기 → 마디 설정 → 실행 취소 → 다시 실행.
- 마디 설정은 한 줄을 하나의 투명한 영역으로 표시합니다. 내부 번호는 없고, 왼쪽 여백이 충분할 때 시작 번호만 바깥에 표시합니다. 마디 설정 도구에서만 얇은 내부 보조선이 보입니다.
- 선택한 줄은 이동/크기 조절, 삭제 및 Undo/Redo가 가능합니다. 좁은 화면에서 삭제 버튼이 크기 조절 손잡이를 덮지 않도록 배치합니다.
- PDF 마디 영역 복사/붙여넣기 흐름을 제거했습니다. 다른 문서 복사 기능은 변경하지 않았습니다.
- 재생 중 현재 줄 테두리, 현재 마디의 약한 배경, BPM에 맞춘 세로 커서를 표시합니다. 일시정지는 위치를 유지하고, 줄 안의 위치를 누르면 해당 마디/박으로 이동합니다.
- 기존 Web Audio 메트로놈을 사용하며 PDF에만 liveTempo 옵션을 적용했습니다. 재생 중 BPM 변경으로 위치를 초기화하지 않습니다. 에튀드/편집 악보의 기존 기본 동작은 유지합니다.
- 하단 BPM 팝오버: −10 / −1 / 현재 BPM / +1 / +10. 기존 연습 설정은 안쪽 접힌 영역으로 이동했습니다. 바깥을 누르면 닫힙니다.
- 상단 문서 메뉴에서 마디 설정과 연습 설정을 제거했습니다. 기존 문서 정보/너비 맞춤/자르기 초기화/원본 보기/전체화면은 유지합니다.

## 데이터 호환

IndexedDB의 PDF Blob 및 기존 레코드를 재생성하지 않습니다. barMap을 유일한 저장 소스로 유지합니다.

새 항목은 `{page, x, y, width, height, number, count, beats, meter}`로 한 줄을 저장합니다. count는 1–4, number는 시작 마디 번호입니다. 마디별 박 수를 따로 수정하면 선택적 beatCounts를 저장합니다. 좌표는 원본 페이지 기준 비율입니다. 재생용 개별 마디는 메모리에서만 균등 분할해 계산합니다.

이전 개별 마디 좌표는 변경하지 않습니다. 같은 페이지에서 높이가 같고 경계와 번호가 이어지는 최대 4개를 화면에서만 묶습니다. 간격이 있거나 높이가 다른 기존 영역은 임의로 합치지 않습니다. 기존 연습 순서, 반복 범위, 불균등한 마디 너비를 보존합니다. 정보 수정 및 백업 복원에서도 새 count/beatCounts/meter를 유지합니다.

## 검증

- Chrome 터치 에뮬레이션: 360×800, 375×812, 390×844, 393×852, 430×932.
- 기본 보기 진입, 도구 숨김/표시, 4마디 통합 영역, 내부 번호 제거, 복사 UI 제거, 메뉴 이동, BPM ±1/±10, 일시정지/재개, 재생 중 BPM 변경, 위치 선택, 페이지 왕복, 확대 후 모드 전환의 스크롤/배율 보존, 재진입 확인.
- 390×844 추가 검사: 줄 이동/크기 조절과 Undo, 원본 PDF 해시 보존, 백업 직렬화·읽기·메타데이터 정규화 후 마디 설정 동일성, 첫 줄 끝에서 다음 줄 자동 진행.
- 재생 전후 pdfRenderStats.started 동일: 커서만 움직이며 PDF 캔버스를 재생 프레임마다 생성하지 않습니다.
- 기존 PDF 편집 회귀: 위 모바일 5개 크기 및 데스크톱 1440×1000에서 펜, 텍스트, 자르기, Undo/Redo. 모바일에서 원본 보기, 연속 보기, 마디 지정, 핀치, 너비 맞춤, 전체화면, 페이지 이동과 재진입도 확인했습니다.
- 관련 단위/회귀 테스트 44개 통과. 프로덕션 빌드 통과. 기존 큰 번들 경고는 남아 있습니다.
- 실제 iPhone/iOS Safari 실기기 및 실제 스피커 청취 검증은 수행하지 않았습니다.

## 변경 파일

기능/UI:
- src/pdf/PdfPractice.jsx
- src/pdf/PdfPage.jsx
- src/pdf/MobilePdfChrome.jsx
- src/pdf/PdfAnnotationLayer.jsx
- src/pdf/pdfBarRows.js (신규)
- src/pdf/pdfModel.js
- src/pdf/PdfStudio.jsx
- src/pdf/pdfStudio.css
- src/pdf/mobilePdfChrome.css
- src/pdf/pdfAnnotationTools.css
- src/etudes/useEtudeMetronome.js

검증:
- tests/pdf-bar-rows.test.mjs (신규)
- scripts/verify-pdf-practice-modes.mjs (신규)
- scripts/verify-pdf-mobile-chrome.mjs

이전 PDF 재진입 캐시 작업과 별도 작업의 기존 변경 사항은 보존했습니다.

## 캡처

artifacts/pdf-practice-modes/390-view.png: 기본 보기·연습
artifacts/pdf-practice-modes/390-edit.png: 편집 및 통합 4마디
artifacts/pdf-practice-modes/390-playing.png: 재생 중 진행 커서
artifacts/pdf-practice-modes/390-bpm.png: BPM ±10 팝오버

브라우저 검사에는 격리된 테스트 저장소와 실제 PDF를 사용했습니다. 운영 저장 데이터에 예시 마디나 악보를 추가하지 않았습니다.
