# 주법 표시와 재생 점검 — 2026-09-15

## 기존 상태

`ScorePlayback.jsx`는 삼각파 oscillator를 매 음마다 생성했다. `scoreTimeline`은 H/P/S를 전달했지만 재생기는 읽지 않았다. 붙임줄은 같은 ID 대상·줄·MIDI를 합쳐 지속 시간을 늘리는 코드가 있었다. 지판에서 사용하던 기타 엔진은 녹음 샘플이 아니라 Karplus–Strong 방식의 발현 합성 버퍼와 필터다.

## 반영한 동작

| 항목 | 표시 | 현재 실제 재생 |
|---|---|---|
| H | 기존 표시 유지 | 같은 줄의 상승 음을 하나의 BufferSource로 연결. 도착 시 최대 8ms 피치 전이, 새 피킹 어택 없음 |
| P | 기존 표시 유지 | 같은 줄의 하강 음을 같은 BufferSource로 연결. 새 피킹 어택 없음 |
| SL (`S`) | 기존 표시 유지 | 출발 음의 끝부분부터 도착 시점까지 playbackRate 지수 ramp. 최대 180ms, 짧은 음은 길이에 맞춰 축소 |
| 붙임줄 | 기존 표시 유지 | 같은 줄·같은 음의 연속 구간을 합쳐 음원 한 개의 지속 시간 연장. 쉼/틈을 건너뛴 잘못된 연결은 합치지 않음 |
| 일반 음 | 기존 표시 유지 | 기존 지판 기타 합성 버퍼·피킹 어택·필터를 재사용해 음마다 별도 발음 |
| X | 기존 표시 유지 | 짧은 비음정 잡음 발현 유지 |

슬라이드 시간과 H/P의 짧은 전이는 FRETIVA 합성음의 현재 파라미터이며 특정 상용 악기 모델의 재현이라고 주장하지 않는다. 피치 변경 시 음 사이 시간 간격은 바꾸지 않는다. 실제 손가락 접촉·풀오프의 작은 재발현·프렛 마찰·공명 변화를 녹음 수준으로 재현하지는 않는다.

## 데이터·저장·기존 기능 재사용

- 데이터 버전/저장 포맷은 변경하지 않았다. `technique: H/P/S`, `tieTo`, 컴파일된 실제 MIDI·줄·프렛·길이를 사용한다.
- 표시, 입력, 저장, Undo/Redo, OMR 출처 정보는 기존 구조를 그대로 사용한다. 재생용 voice plan은 파생 데이터이며 원본 음표를 변경하지 않는다.
- 연결은 물리적 기타 줄마다 따로 관리한다. 동시음의 다른 줄에 피치 ramp가 전파되지 않는다. 화음 붙임줄도 줄별로 독립 유지한다.
- 편집기의 현행 제약인 **화음 안에서 음별로 서로 다른 H/P/SL 지정**, **마디 경계를 넘는 H/P/SL 입력**은 이번 작업에서 확장하지 않았다. 화음 붙임줄은 지원한다.
- 재생 도중 위치를 바꾸면 선택 위치에서 새 발음으로 시작한다. 이후 연결은 계속 적용된다. 붙임줄 도중부터 시작해도 음이 누락되지 않는다.
- 기존 공유 AudioContext, 악기 사운드 버스, 메트로놈 시계를 유지한다. 지판의 기존 `playGuitarPositions` API와 동작도 유지한다.
- 매우 긴 음은 어택 이후의 버퍼 구간을 loop해 지속시킨다. 음원 버퍼는 최대 8초, 캐시는 약 32초 분량 PCM으로 제한한다. 장시간 반복 구간의 실제 청감은 추가 튜닝 대상이다.

## OMR 지원 경계

현재 TrOMR 시험 어댑터는 H/P/슬라이드/붙임줄을 인식·변환하는 검증된 경로가 없다. 미지원 기호가 나오면 변환을 차단하고 원시 결과를 보존한다. 이번 작업을 OMR 주법 자동 인식 완료로 보고하지 않는다.

OMR 출처 악보라도 기존 편집기에서 주법을 직접 지정하면 동일한 재생 경로로 전달된다. 이 경로를 테스트했다. 향후 검증된 인식기가 위의 기존 `technique`/`tieTo` 필드로 변환하면 별도 재생기는 필요 없다.

## 검증

1. `node --test tests/score-technique-playback.test.mjs tests/etude-input.test.mjs tests/mobile-score-input.test.mjs tests/omr-adapter.test.mjs tests/fretboard-audio.test.mjs tests/audio-mixing.test.mjs` — **53/53 통과**.
2. `scripts/verify-score-techniques.mjs` — 실제 Chrome OfflineAudioContext로 48kHz WAV 생성. 음원 시작 횟수, AudioParam 자동화, 출력 파형의 RMS/피치 분석. 실제 앱 1440×1000 및 390×844 재생/정지, 수동 H 지정, 저장, Undo/Redo 확인. React 오류 0.
3. 첫 일반 피킹과 도착 음은 각각 발음(2개 source). H/P/SL/붙임줄은 각각 1개 source. 비교 악보는 BPM 90, 3번줄 사용.
4. 해머링 도착 구간 RMS 약 0.0084, 일반 피킹 도착 구간 약 0.0547: 재피킹 어택 차이 확인. 절대값은 출력 볼륨/측정 구간에 따라 달라진다.
5. 슬라이드 출력의 자기상관 기반 추정 피치: 약 262 → 271 → 282 → 289 → 294Hz. H/P는 도착 시점에만 피치 전이, 붙임줄은 일정 피치 유지. 추정은 짧은 창/정수 지연 분석이며 정밀 튜너 검정이 아니다.
6. 11초 지속음의 10초 지점에서 출력 유지, 버퍼 8초 제한 확인.
7. 해당 데스크톱에서 테스트 악보 한 곡 스케줄 준비 약 1–7ms(실행별 변동). 페이지별 음악 재생성이나 저장 데이터 재작성 없음. 실제 iPhone 성능 측정은 미실시.
8. `npm run build` 통과. 기존 큰 번들 경고는 남아 있음.

**확인 범위:** 실제 오디오 렌더링·브라우저 실행·파형 분석을 수행했다. 사람의 귀로 듣는 음색 평가나 실제 기타 연주 비교를 수행했다고 주장하지 않는다. 아래 음원으로 청취 평가할 수 있다.

## 결과 파일

`artifacts/score-techniques/`:

- `comparison.wav`: 해머링 → 풀오프 → 슬라이드 → 붙임줄 → 일반 피킹 (각 3초, 총 15초)
- `hammer/pull/slide/tie/picked.wav`: 개별 비교 음원
- 같은 이름의 `.json`: 기존 악보 파일 불러오기로 편집 가능한 테스트 악보 5개
- `results.json`: 노드 수·자동화·파형·피치·스케줄 시간 측정
- `desktop-playing.png`, `mobile-playing.png`: 실제 앱 화면

## 이번 변경 파일

- `src/audio/fretboardPreviewEngine.js`: 기존 기타 음색 경로 재사용, 연결 음원 스케줄러, 지속 및 메모리 제한
- `src/etudes/scorePlayback.js`: 붙임줄 검증 보완, 줄별 연결 voice plan, 지속음 도중 seek
- `src/etudes/ScorePlayback.jsx`: 실제 기타 재생 연결 및 지원 안내
- `tests/fixtures/guitar-technique-scores.mjs`: 편집 가능한 비교 악보
- `tests/score-technique-playback.test.mjs`: 재생·연결·저장 검증
- `tests/omr-adapter.test.mjs`: OMR 출처 악보에 수동 주법을 지정하는 경로 검증
- `scripts/verify-score-techniques.mjs`: 실제 Web Audio 렌더링과 브라우저 검증
- 이 보고서
