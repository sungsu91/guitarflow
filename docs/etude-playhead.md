# 에튀드 오디오 진행바 연결

- 현재 에튀드 악보의 `ScorePlayback.onPosition`을 `Score.playPosition`에 연결했다. 기존 내 악보 진행바와 `scorePlayhead.playheadX`를 재사용하며 편집 선택 상태와 별도로 유지한다.
- 진행 위치는 음원 스케줄에 사용한 `AudioContext.currentTime`과 시작 시각으로 계산한다. 마디별 실제 onset/ticks와 기존 `guitarVoiceTimeline`/`scoreBarOrder`의 반복 방문 순서를 사용한다. requestAnimationFrame은 표시만 갱신한다.
- 새 `scorePlaybackPosition`은 쉼표를 포함한 이벤트 위치를 만들며, onset이 없는 레거시 이벤트도 `ticksOf`로 계산한다. 재개/BPM 변경 시 반복 방문을 포함한 전체 musical tick을 유지한다.
- 기존 SVG의 실제 음표/TAB 위치를 사용한다. 마디 폭과 임시표 공간은 렌더러 좌표에 반영되고 시간 계산에는 영향을 주지 않는다. 오선보+TAB, 오선보, TAB 및 확대 악보에 동일한 진행바를 표시한다.
- 악보 듣기 도구에 일시정지/이어서 재생 및 재생 마디 선택을 추가했다. 정지 시 진행바를 제거한다. 새 음원 엔진은 추가하지 않았다.
- 재생 컴포넌트는 모바일/데스크톱 화면 밖에서 한 번만 유지하고 조작 UI만 각 레이아웃에 포털로 표시한다. 화면 회전/창 크기 변경으로 오디오가 다시 시작되지 않는다.
- 자동 따라가기는 실제 진행바의 화면 위치를 확인한다. 사용자의 휠/터치/스크롤 키/악보 위 포인터 입력 후 4초 동안 양보한다. 확대 대화상자에서는 해당 내부 스크롤을 사용한다.
- 메트로놈 및 백킹루프에는 진행바를 연결하지 않았다. 악보 수정은 기존 score 변경 시 오디오 정리 정책을 유지하며, 다음 재생에서 새 시간 정보와 새 SVG 좌표를 사용한다.

## 확인 결과

- `npm run build`: 통과. 기존 번들 크기 경고 존재.
- 단위 테스트 35개 통과: `score-playback-position`, `etude-editor`, `etude-refinements`, `shared-accompaniment-panel`.
- `scripts/verify-etude-playhead.mjs`: 화이트/골드 다크 모두 통과. 재생/정지, 일시정지/재개, 48→96 BPM, 7마디 이동, 3가지 보기 전환, 사용자 휠 스크롤 존중, 확대, 390×844 / 844×390 / 1440×960 전환, 메트로놈 단독 실행 시 진행바 없음, 런타임 오류 없음.
- `scripts/verify-etude-playhead-rhythm.mjs`: 앱 목록과 분리된 일회성 브라우저 테스트 fixture 사용. 점4분음표(720 ticks), 8분쉼표(240 ticks), 8분 셋잇단(160 ticks), 화음, 온쉼표, 두 마디 도돌이표를 기존 악보 렌더러/오디오로 검증. 쉼표 중 정지한 진행바 좌표가 실제 SVG 시간 좌표 보간과 일치, 셋잇단 위치 확인, 두 번째 반복 방문에서 1마디 복귀, 보기 전환 후 반복 위치 유지, 음 길이 수정 후 다음 쉼표 시작 위치 720→480 ticks 갱신 확인.
- 브라우저 테스트 fixture는 `artifacts/etude-playhead`에만 생성되며 ETUDES 카탈로그나 저장 악보 데이터에 추가하지 않는다.
- 결과 파일: `artifacts/etude-playhead/browser-results.json`, `rhythm-results.json`, `unit-tests.txt`, `build.txt`.
- 실제 휴대폰 하드웨어 오디오 지연이나 Bluetooth 출력 지연은 이번 브라우저 검증 범위에 포함되지 않는다.
