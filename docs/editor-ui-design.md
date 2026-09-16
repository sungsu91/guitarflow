# 악보 편집기 UI 개선

## 변경 범위

음악 모델·편집 명령·재생 스케줄러·저장 형식은 변경하지 않았다. 표시 컴포넌트는 같은 상태와 기존 명령을 사용한다.

- `src/etudes/ScoreEditor.jsx`: 모바일/데스크톱 배치, 보기 세그먼트, SVG 조작 아이콘, 주법 버튼과 개별 안내, visualViewport 대응.
- `src/etudes/MobileScoreInput.jsx`: 위치·키패드·추가 도구 그룹, 모바일 비모달 패널과 가려진 키패드 inert 처리, 선택 위치 노출, 데스크톱 우측 도구 전환.
- `src/etudes/MobileScoreSheets.jsx`: 주법 패널 제목·닫기·공통 표면.
- `src/etudes/EditorScore.jsx`: 줄 편집 화살표를 SVG로 변경. 렌더링 좌표 계산은 유지.
- `src/etudes/EditorAudioDock.jsx`: 신규 음색/재생 도크, BPM 편집 확인·Escape 취소.
- `src/etudes/EditorMusicIcon.jsx`: 신규 주법/피킹 기호 컴포넌트.
- `src/etudes/ScorePlayback.jsx`: 편집기 전용 도크 표시 분기. 재생·정지·스케줄링은 기존 함수 사용.
- `src/etudes/editorDesign.css`: 편집기 한정 색상·표면·간격·반응형·포커스·reduced-motion.
- `scripts/verify-editor-design.mjs`: 실제 브라우저 UI 회귀 검사와 24개 캡처.

스피커는 기존 기능인 ‘박자 소리’ 토글을 그대로 사용하며, 현재 켬/끔 상태를 표시한다. 기타 전체 음소거 기능으로 바꾸지 않았다. X, 백스페이스, 삭제는 기존 명령 연결을 보존했다.

## 검증

- 360×800, 390×844, 430×932, 1440×1000: 기본 / 피킹 / 주법 / 빔 / 재생 / BPM 입력 캡처.
- 버튼 줄 넘침 없음, 음표 버튼 높이 44px, 360px 최소 폭 약 40.75px.
- 패널 단일 열림/토글 닫힘, 모바일 키패드 inert, 악보 선택과 현재 위치 가시성 확인.
- BPM 확인 시 포커스 해제, Escape 취소, 높이 500px로 축소한 뷰포트에서 입력·확인 노출 확인.
- UI 조작과 저장 후 원본 리듬 데이터 비교. 빔 연결 후 onset/duration/프렛 불변 확인.
- 기존 음악 모델 회귀 테스트 73개 통과, 프로덕션 빌드 성공.
- 점음표 1회·고정·해제, 셋잇단 진행·미완성 경고·실제 tick을 360/375/390/393/430px에서 확인.

캡처: `artifacts/editor-design/index.html`. 상세 결과: `artifacts/editor-design/results.json` 및 `rhythm-regression/results.json`.

검증 환경은 데스크톱 Chromium의 모바일 뷰포트/터치 에뮬레이션이다. 실기기 Safari와 실제 소프트 키보드는 별도 기기 검증이 필요하다.
