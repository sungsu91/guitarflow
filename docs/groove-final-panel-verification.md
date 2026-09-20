# 그루브팩 최종 패널 검증

최종 시안을 기준으로 이전 카드·설명문 디자인을 대체했다.

- 아이보리 패널, 브라운 텍스트, 텍스트 탭/장르 밑줄, 회갈색 검색창.
- 제목만 표시하는 39px 행, 13px 제목, 선택 행 베이지 배경.
- 작은 재생 아이콘, 하단 76×32px 불러오기 버튼. 상·하단 고정 및 목록만 스크롤.
- 기본 8비트/16비트 및 추천 12팩의 이름·패턴·음색·권장 BPM 데이터 유지.
- 불러오기 시 현재 BPM 유지. 저장 팩도 같은 목록 구조 및 ⋮ 메뉴를 사용.
- 공유 AudioContext 및 기존 transportClock 커서로 무한 미리 듣기. 25ms 예약 검사, 180ms 선예약. 일시정지 시 예약 소리를 모두 취소하고, 재개 시 마디 내 경과 위치를 유지.
- 종료된 소스는 Set에서 제거해 반복 중 참조가 누적되지 않는다.

## 실행 결과

- scripts/verify-groove-final-layout.mjs: 360×800, 375×812, 390×844, 393×852, 430×932 모두 통과. 행 높이, 한 줄 장르, 창 범위, 고정 하단, 다른 테마 밀도 확인.
- scripts/verify-groove-loop-preview.mjs: 80 BPM에서 7.3125초/40세분 위치 연속 확인. 예약 지연 0, 모든 간격 오차 1e-6초 미만. 재개 시 예상 잔여 시간과 실제 일치. 선택/스크롤 지속, 검색으로 보이는 팩 지속, 필터로 숨겨진 팩 종료, 팩 전환, 불러오기/BPM 유지, 닫은 뒤 예약 소스 전부 종료 확인.
- scripts/verify-groove-packs.mjs: 360/390/430px에서 저장 데이터, 검색, 불러오기, 이름 변경, 삭제, 긴 제목, 목록 스크롤 통과.
- scripts/verify-groove-audio-render.mjs: 기존 12팩 실제 샘플 렌더, 강약 비율 및 클리핑 검사 통과.
- node --test tests/metronome-groove.test.mjs tests/groove-recommendations.test.mjs: 7개 통과.
- npm run build: 통과. 기존 대형 번들 경고 유지.

자동화 브라우저 검증이며 실제 모바일 하드웨어 청음 결과는 아니다.
실제 390px 캡처: output/groove-final-390.png
시안 나란히 비교: output/groove-final-comparison.png
