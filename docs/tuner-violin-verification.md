# 바이올린 튜너 구현 및 검증 (2026-09-19)

## 변경

- 기존 `useTunerController`, YIN 검출, 신호/완료 상태관리와 `MobileTunerLayout` / `DesktopTunerLayout` 구조를 유지했다. 전용 검출기는 만들지 않았다.
- 바이올린 STANDARD: 4번 G3 (195.997718Hz), 3번 D4 (293.664768Hz), 2번 A4 (440Hz), 1번 E5 (659.255114Hz). 현재 앱은 A4=440Hz 고정이며 사용자 기준음 보정 기능은 없다.
- 바이올린 AUTO만 공통 tracking 함수의 선택 옵션을 사용한다. 실제 음은 반음/옥타브 그대로 표시하고 목표는 cents 거리로 추정한다. 새 목표가 이전 목표보다 40 cents 이상 가까워야 전환하므로 중간 경계 양쪽에 20 cents 여유가 있다. 기존 세 악기의 chromatic AUTO 정책은 그대로다.
- 바이올린 수동은 목표 줄만 고정한다. 기타용 수동 옥타브 보정을 적용해 실제 검출 옥타브를 목표 옥타브로 바꾸지 않는다. YIN 배음 보정과 공통 3프레임 큰 변화 확인은 유지한다.
- 공통 안정화의 정상 추적 중앙값 구간을 5→3프레임으로 변경했다. 25Hz 분석에서 5프레임이 5Hz 비브라토 한 주기를 덮어 움직임을 없애는 문제를 재현 후 수정했다. 초기 어택·옥타브 튐 확인·잔음 추적·신호 해제 시간은 그대로 유지했다. 분석 종료 타이머는 추가하지 않았다.
- 악기/프리셋/수동 줄 변경, 마이크 재시작/중지, 신호 소실 시 AUTO 목표 이력도 초기화한다.
- 이미지/버튼 크기와 기존 화면 구성을 유지했다. 정사각 PNG를 기존 2:3 프레임에 contain으로 표시하며 페그 좌표도 그 여백을 반영한다. 선택 확대 이미지도 contain으로 표시해 왜곡을 방지한다.

## PNG 및 페그 확인

원본 파일을 수정하지 않고 `public/assets/tuner/just-play-violin-headstock.png`로 복사했다. 1254×1254, 총 1,572,516 픽셀 중 alpha=0 1,089,934개, alpha=1~254 481,992개, alpha=255 590개. 실제 투명 배경이며 불투명 검정 배경이 아니다. 에셋에 음명은 추가하지 않았다.

정면 페그: 왼쪽 아래 G / 위 D, 오른쪽 위 A / 아래 E. [Tiger Music Violin Guide, 2쪽](https://www.tigermusic.co.uk/media/instructions/Violin_Guide.pdf)의 페그 도식 및 첨부 이미지의 줄 경로를 참조했다. 우쿨렐레 좌표는 재사용하지 않았다.

## 합성 신호 검증

`node --test tests/tuner-*.test.mjs tests/open-string-pitch-pipeline.test.mjs tests/shooter-pitch-judgment.test.mjs`: **60/60 통과**.

- 44.1/48kHz, F#3~G5 모든 반음: 순음 및 기본음보다 2배음이 강한 복합음으로 검출/옥타브 확인, 오차 2 cents 미만.
- E5 -200/-100/-25/0/+25/+100/+200 cents 검출.
- F#3 실제 표시 + G3 목표 + -100 cents + 올림 안내.
- 모든 인접 줄 경계에서 cents 거리 기반 선택과 양방향 히스테리시스.
- 수동 4개 목표의 ±100/±1200 cents 및 정확한 음, 실제 옥타브 분리.
- 30초 지속 복합음, 도중 +30 cents 변화, 5Hz ±18 cents 비브라토 움직임, 1~2프레임 옥타브 이상값 억제 및 실제 새 음으로 전환.
- 기존 기타/베이스/우쿨렐레 프리셋·AUTO·수동 목표 회귀, 기존 기타 검출 및 잔음/옥타브 안정화 테스트.

브라우저에서도 getUserMedia를 Web Audio 합성 스트림으로 대체해 실제 컨트롤러/마이크 처리/YIN/React 표시 경로를 실행했다. F#3 AUTO, 4개 수동 버튼, E5 ±25 cents, 악기 전환 시 선택 초기화를 확인했다. 물리 마이크 입력은 아니다.

## 화면/빌드

Headless Chrome 모바일 viewport + touch emulation:

| 크기 | 결과 |
| --- | --- |
| 360×800 | 통과 |
| 375×812 | 통과 |
| 390×844 | 통과 |
| 393×852 | 통과 |
| 430×932 | 통과 |
| 1440×1000 데스크톱 | 통과 |

각 크기의 AUTO/수동 스크린샷 저장 및 육안 검토. 컨트롤·페그 버튼·목표/현재 음 영역이 화면 안에 있고 가로 overflow가 없으며, 선택 전후 window scroll 위치가 동일하다. 원본 비율 유지와 페그 라벨 위치를 확인했다. 테스트 실행 중 pageerror 없음.

`npm run build` 통과. 번들 크기/플러그인 시간 경고가 있으며 빌드 오류는 없다.

## 미검증/범위

- 실제 바이올린 녹음, 실제 연주와 물리 마이크, 활 마찰 잡음/이중음/실내 잔향은 검증하지 않았다.
- 실제 iOS Safari/Android 기기에서 주소창·키보드·마이크 권한 전환에 따른 viewport 변화는 이번 Chrome 에뮬레이션 범위 밖이다.
- 회귀 결과는 위 자동 테스트 범위이며 기존 세 악기의 실제 연주 전체에 대한 보증은 아니다. 특히 기존 검출 최저 주파수 50Hz와 마이크 전처리는 변경하지 않았으므로 베이스 E1 등 그 아래 범위의 기존 제약을 해결하는 작업은 포함하지 않았다.
- 배포하지 않았다. 작업공간에 이미 있던 다른 기능 수정은 보존했다.

## 파일 목록

- `src/tuner/TunerMode.jsx`: 바이올린 옵션/페그, 목표 이력, AUTO/수동 표시 연결.
- `src/tuner/tunerPresets.js`: 표준 튜닝 데이터.
- `src/tuner/tunerMath.js`: 선택적 AUTO 목표 추정과 히스테리시스.
- `src/tuner/tunerStability.js`: 비브라토 추적 중앙값 구간.
- `src/tuner/tuner-mode.css`: 바이올린 선택 확대 이미지 비율.
- `public/assets/tuner/just-play-violin-headstock.png`: 제공 원본.
- `tests/tuner-violin.test.mjs`: 합성 신호/상태/회귀 테스트 6개.
- `scripts/verify-tuner-violin.mjs`: 실제 앱 경로 브라우저 검증. `PLAYWRIGHT_MODULE`, `BROWSER_EXECUTABLE`, `TEST_URL` 환경변수 지원.
- `docs/tuner-violin-verification.md`: 이 보고서.
- `artifacts/tuner-violin/`: 테스트/빌드 로그, 브라우저 측정 JSON, 해상도별 AUTO/수동 PNG.
