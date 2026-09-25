# 메뉴 UI 리뉴얼 검증

## 변경 파일
- src/App.jsx: 기존 설정·기능·도움말·공유·문의 JSX를 모바일 메뉴 슬롯으로 재배치. 기존 핸들러와 라우팅은 유지.
- src/navigation/MobileUtilityMenu.jsx: 모바일 카테고리 필터, 설정 시트, 고정 하단 메뉴 및 키보드 탭 이동.
- src/navigation/UtilityMenuSurface.jsx: 중첩 설정 시트의 Escape 처리와 inert 영역 포커스 제외.
- src/navigation/utility-menu.css: 아이보리/기존 다크 팔레트, 평면 목록, 독립 스크롤, 고정 하단 및 설정 시트.
- src/shooter/results/ShooterShareButton.jsx: compact 옵션으로 기존 이미지/링크 공유 동작을 한 공유 메뉴에 수납. 기존 다른 사용처는 유지.
- src/i18n/locales/ko.js, src/i18n/locales/en.js: 일반/화면/사운드/짧은 도움말 번역 4개 추가.
- tests/menu-status-badge.test.mjs: DEV 중복 배지 제거 및 새 그룹 구조에 맞춰 기존 검증 갱신.
- work/verify-menu-renewal.mjs, work/verify-menu-routes.mjs, work/verify-menu-accessibility.mjs: 브라우저 검증.

## 분류 및 기존 경로
| 분류 | 기능 | 경로 |
| --- | --- | --- |
| PRO | 리듬 트레이너 | #rhythm-trainer |
| PRO | 악보연습실 | #etudes |
| 기본 | 단일 음 위치 익히기 | #stage1 |
| 기본 | 스케일 · 펜타토닉 | #stage2 |
| 기본 | 리듬 & 코드 | #stage3 |
| DEV | 미니반주 | #mini-chord |
| DEV | 오디오 스튜디오 | #audio-studio |

전체는 세 그룹 모두 표시. PRO/DEV는 그룹 제목으로 표시하고 초보/SOLO/HOT 배지는 유지.
오디오 스튜디오의 기존 활성화 조건도 유지. 도움말·공유·문의는 필터와 무관하게 하단 고정.
모바일에서 제공되던 새로고침은 기존 노출/비활성 조건 그대로 설정으로 이동.

## 검증 결과
Chrome/Playwright 모바일 viewport 검증이며 실제 iOS/Android 단말 검증은 아님.

| 크기 | 패널 경계/가로 넘침 | 마지막 기능/고정 하단 | 탭 한 줄 | 설정 스크롤 |
| --- | --- | --- | --- | --- |
| 360×800 | 통과 | 통과 | 통과 | 통과 |
| 375×812 | 통과 | 통과 | 통과 | 통과 |
| 390×844 | 통과 | 통과 | 통과 | 통과 |
| 393×852 | 통과 | 통과 | 통과 | 통과 |
| 430×932 | 통과 | 통과 | 통과 | 통과 |
| 440×956 | 통과 | 통과 | 통과 | 통과 |

- 한국어/화이트, 영어/기존 다크 설정 화면에서 6개 크기 경계·스크롤 검증.
- 설정 닫기/Escape 후 선택 카테고리 및 메뉴 scrollTop 유지.
- 카테고리 기본 3개 / PRO 2개 / DEV 2개 확인.
- 모든 기능을 실제 클릭하여 표의 7개 경로 이동 확인.
- 도움말 열기, 문의 기존 Instagram 주소, 공유 옵션 접근 확인. 외부 전송은 수행하지 않음.
- 언어 변경 저장(language), 테마 변경 저장(rifflabThemeMode), 메트로놈 음량 38% 저장(fretiva-metronome-volume-v1=0.38) 및 새로고침 후 복원 확인.
- 그루브/드럼/베이스/피아노 등의 기존 공통 컨트롤과 초기화·리듬 설정 핸들러는 그대로 이동. 실제 오디오 청취 검증은 수행하지 않음.
- 기존 테마 이름은 Gold Dark(골드 다크)이며 기존 값 brand와 팔레트 그대로 유지.
- 설정 포커스 순환, Escape, 카테고리 방향키 동작 통과.
- 1440×900 데스크톱에서 기존 사이드바 유지 확인.
- npm run build 통과(기존 대형 번들 경고 있음). 메뉴 배지 테스트 4/4 통과.
- 브라우저 pageerror 없음. localStorage 키/데이터 구조 및 기능 핸들러 변경 없음.

수치 결과: artifacts/menu-renewal-verification.json, artifacts/menu-renewal-routes.json.
화면 캡처: artifacts/menu-renewal-{width}.png, artifacts/menu-settings-en.png, artifacts/menu-settings-dark.png.
