# 베이스 4·5·6현 튜너 검증

베이스 선택은 유지하고 프리셋 목록에 `4현 스탠다드`, `5현 스탠다드`, `6현 스탠다드`, 기존 `4현 DROP D`를 표시했다. 기본값은 기존 4현 스탠다드다. 프리셋의 MIDI 배열에서 목표 음·옥타브·주파수·줄 번호를 공통으로 생성한다.

5현과 6현은 첨부 헤드 이미지를 각각 연결했다. 5현은 3+2 포스트, 6현은 파란 3+3 포스트의 실제 줄 경로에 맞춰 버튼 좌표를 따로 지정했다. 프리셋 전환 때 이미지와 버튼 수가 함께 바뀌며 선택 줄과 AUTO 추정 상태를 초기화한다.

검증 결과:

- `npm test -- --test-name-pattern='bass|tuner'`: 관련 테스트 통과. 전체 테스트 실행 결과도 1076개 통과.
- 합성 YIN: 44.1/48/96kHz에서 B0 30.8677Hz, B0 -200 cents, E1~C3와 강한 2배음 입력을 검출. B1 오인 없이 MIDI·옥타브가 유지된다.
- 합성 상태: 5현·6현 AUTO 목표 추정, 수동 목표 고정, cents 경계 여유, 저음 지속·튜닝 드리프트·짧은 옥타브 튐 억제·실제 음 전환을 확인했다.
- 브라우저 UI: 360×800, 375×812, 390×844, 393×852, 430×932에서 4/5/6현 프리셋 전환, 헤드 이미지, 버튼 개수, 목표 줄 라벨, 버튼 겹침 없음, 가로 overflow 없음을 확인했다.
- `npm run build`: 통과.

확인하지 못한 항목은 실제 베이스 연주·실제 저B 현 녹음, iOS/Android 실기기 마이크 입력이다. 이번 검증의 오디오 입력은 합성 신호이며, 기존 베이스의 물리 연주 반응을 보증하는 테스트는 포함하지 않는다.

관련 파일: `src/tuner/tunerPresets.js`, `src/tuner/TunerMode.jsx`, `src/tuner/tunerHeadstockDesigns.js`, `src/tuner/tunerAnalysisConfig.js`, `tests/tuner-bass.test.mjs`, `scripts/verify-bass-presets.mjs`, `public/assets/tuner/just-play-bass-5-headstock.png`, `public/assets/tuner/just-play-bass-6-headstock.png`.
