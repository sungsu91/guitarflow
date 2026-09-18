# 에튀드 연습 도구 정리

## 변경 영역
- `EtudeStudio`: 하단 보관함 UI만 제거. 저장소와 저장·불러오기 API, 내 악보 화면은 유지. 기존 TIP과 이전·다음 이동 유지.
- 악보 위 도구 모음: 보기/편집/가로 전환과 악보 재생/음색 그룹 분리. 좁은 공간에서는 그룹과 버튼이 줄바꿈.
- `Score`: 기존 구조화 악보 렌더러의 `view` 옵션 연결. 캐시에 보기 방식을 포함하고 실제 오선/TAB 높이를 다시 계산. PDF 화면에는 옵션을 추가하지 않음.
- `PracticeFloatingTools`: 우측 드래그 손잡이, 오버레이 백킹 패널, 이동형 메트로놈. 위치 저장·화면 크기 변경 시 보정. 오른쪽 손잡이 공간을 별도로 확보. 좁은 화면에서 패널을 열면 메트로놈이 아래쪽으로 이동해 재생 조작을 가리지 않음.

## 재사용
- `BackingLoop`, `useBackingLoop`, 기존 모바일/데스크톱 플레이어, 재생목록·반복·셔플·볼륨·파일 선택 및 오디오 엘리먼트. 별도 엔진이나 음원 추가 없음.
- `useEtudeMetronome`: 기존 공유 AudioContext와 transportClock 유지. 세분과 기존 음원 옵션을 연결하고 실시간 BPM/박자 변경 시 진행 위치 보존.
- `MetronomeSettingsPanel`, `MetronomeVolumeControl`, 기존 박자/음색 목록과 subdivision 목록. App에 있던 박자/음색 정의는 `metronome/options.js`로 옮겨 공유.
- `ScorePlayback`: 기존 재생 로직에 간결한 toolbar 표시 모드 추가.

## 수명 및 입력 정책
- 패널 닫기는 UI만 닫고 재생 컨트롤러·오디오 엘리먼트는 유지.
- 내 악보 등으로 이동해 에튀드가 해제되면 기존 cleanup으로 재생 종료. 앱 모드 이동은 기존 backing activityRegistry 정책을 유지.
- 별도 메트로놈/백킹 동기화는 추가하지 않음.
- 전용 손잡이만 pointer capture 사용. 6px 초과 드래그는 클릭을 억제. 방향키 이동, Enter/Space 패널 토글, Escape 닫기, 접근성 이름과 포커스 표시 지원.

## 확인
- `npm run build` 통과. 기존 큰 번들 경고 유지.
- `scripts/verify-etude-tools.mjs`: 화이트/골드 다크 각각 320×640, 390×844, 1440×960, 실행 중 844×390 전환 및 복귀 검증.
- 악보 재생 중 보기 전환과 높이 재계산, 6/8의 여섯 박 표시, 세분·기존 Clave 음색·BPM 변경, 드래그/클릭 구분, 패널 열기 전후 악보 좌표 유지, 접힌 상태 백킹 재생 표시, 동시 재생 중 크기 변경, 키보드 열기/닫기, 화면 종료 시 정리 확인.
- 패널 열기/닫기 및 크기 변경으로 AudioContext 수가 증가하지 않음. 브라우저 런타임 오류 없음.
- 관련 단위 테스트 60개 중 59개 통과. 실패 1개는 `tests/etudes.test.mjs:209`의 오래된 초기 BPM 소스 문자열 검사로, 작업 시작 시 이미 존재한 `initialId` 지원 코드와 불일치. 해당 사용자 변경은 유지.
- 전체 테스트 실행에는 이번 수정 범위 밖 게임/기존 UI 검사 등의 실패도 있어 전체 통과로 보고하지 않음.
- 결과: `artifacts/etude-tools/results.json`, 화면 캡처와 build/unit/browser 로그. 검증은 Chrome 브라우저 환경이며 실제 휴대폰 하드웨어 회전/오디오 청음은 수행하지 않음.
