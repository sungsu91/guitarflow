# 클린 기타 재생

악보 입력 미리듣기와 악보 재생은 같은 기타 엔진과 음색 선택을 사용한다. 첫 사용의 기본값은 `클린 기타`이며, `피아노`는 기존 `public/sounds/gpg4.wav`를 사용한다. 선택은 기기에 저장된다. 기존 반주 피아노는 변경하지 않았다.

## 구현

- `audio/pluckedString.js`: 잡음으로 가진한 fractional-delay Karplus–Strong. 지연선의 저역 필터 지연을 보정하여 음정을 유지한다. 줄별 감쇠와 초기 노이즈 색상, 네 가지 피킹 변형을 적용한다. PCM은 AudioContext별 LRU 캐시, 상한 8 MiB.
- `audio/fretboardPreviewEngine.js`: 공명·필터·어택, 줄별 음색과 다운/업 피킹, 짧은 필터 노이즈 뮤트. 작은 어택 변형은 음정과 시작 시각을 바꾸지 않는다. 장음도 유한한 꼬리로 자연 감쇠한다.
- `audio/scoreInstrument.js`: 같은 onset의 화음을 한 번에 예약. 최대 여섯 줄의 독립적인 음을 처리하고 같은 줄의 재발음은 이전 음을 12ms로 감쇠한다. 종료 후 모든 발음 노드를 disconnect한다. 기존 공유 instrument bus/master limiter를 통과한다.
- `etudes/scorePlayback.js`: 피킹 방향과 명시적 쉼표 시점을 전달한다. 원래 onset/duration/BPM/프렛/3연음 데이터는 변경하지 않는다. 입력된 쉼표에서 잔향을 감쇠한다.
- `etudes/ScorePlayback.jsx`: 400ms 사전 예약과 오디오 시계를 사용한다. 세로 진행선은 같은 오디오 시계를 유지한다. 정지·이동·닫기에는 짧은 release를 적용한다.
- `etudes/useScorePreview.js`, `useScoreInstrument.js`, `scoreInstrument.css`, `ScoreEditor.jsx`: 숫자 입력·데스크톱 프렛 입력·X·직접 피킹 미리듣기와 모바일/데스크톱의 작은 음색 선택. 재생 시작 시 입력 미리듣기 잔향을 정리한다.

외부 API, 기타 음원 파일, 유료 음원, 새 라이브러리를 추가하지 않았다. 기타 발음에는 oscillator를 사용하지 않는다. 메트로놈은 기존 별도 클릭 엔진을 유지한다.

## 검증

`tests/plucked-string.test.mjs`와 기존 프렛·주법·3연음·뮤트·빔 테스트: 총 30개 통과. 44.1/48kHz에서 E2–E6의 KS 음정 오차는 6센트 이내. 변형 어택, 줄별 차이, 자연 감쇠, 8 MiB 캐시 제한, 정확한 화음 onset과 무음 쉼표를 검사했다.

`scripts/verify-clean-guitar.mjs`:

- 실제 Chromium Web Audio로 저음/고음, 동일음 다른 줄, 9/7, 여섯 줄, 8분 8회, 16분 16회, 다운/업, X, 쉼표, 피아노를 렌더링했다.
- 화음의 모든 source 시작 시각 일치. 파형 클리핑 없음. 종료 후 남은 발음 source 0개.
- 390×844, CPU 4배 제한: 숫자 입력 12회, 시작/정지 8회, 120 BPM 16분음표 동시음 16회. 각 onset 간격 125ms 유지, 재생 종료 후 발음 source 0개.
- 360/390/430px 모바일 화면과 1440px 데스크톱에서 음색 선택·입력·재생 확인.
- 실제 출력과 측정값: `artifacts/clean-guitar/`. `comparison.wav`는 저음/고음 → 동일음 다른 줄 → 9/7 → 6줄 → 8분 → 16분 → 다운 → 업 → X → 피아노 순서. 세부 시작 시간은 `chapters.json`.

검증 한계: Windows Chromium의 모바일 에뮬레이션과 OfflineAudioContext 파형 검증이며, 실제 iPhone Safari 또는 휴대폰 스피커의 청감 테스트는 수행하지 못했다. 4배 CPU 제한은 실제 휴대폰 성능이나 출력 지연을 보장하지 않는다.

브라우저 구현은 [AudioBufferSourceNode의 재사용 가능한 버퍼와 일회성 source](https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode), [오디오 시각을 지정하는 start](https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode/start), [DynamicsCompressorNode](https://developer.mozilla.org/en-US/docs/Web/API/DynamicsCompressorNode)의 표준 API를 사용한다. 입력 이벤트에서 공유 AudioContext를 resume하고 StereoPanner가 없는 경우 mono로 연결한다.
