# FRETIVA 펫 스프라이트 팩 v1 적용·검증

검증일: 2026-09-26. `스킨변경 → 펫`에서 새 10종을 선택한다. 기존 펫 2종, 펫 없음, 기본 선택 및 저장값은 유지한다.

후속 요청으로 새 10종에 속도·방향·수동 위치 설정을 추가했다. 기본 재생은 매니페스트 FPS의 **0.5배**, 방향은 **왼쪽**, 위치는 **하트 위 8px**다. `스킨변경 → 펫`에서 0.25~1배 속도, 왼쪽/오른쪽 방향, ‘하트 위로’ 초기화를 사용할 수 있다. 펫을 직접 드래그하거나 포커스 후 방향키로 4px씩(Shift는 16px) 이동한다. 펫별 설정은 저장하며 모바일과 데스크톱 및 가로 전투 레이아웃의 위치는 따로 관리한다. 원본 이미지와 매니페스트는 수정하지 않았다.

## 구현

- 공급된 PNG를 생성·보정·재인코딩하지 않았다. ZIP의 263개 파일과 적용 파일의 SHA-256이 모두 일치한다. 매니페스트는 빌드에서 읽을 수 있도록 `src/shooter/pets.manifest.json`에 원문 그대로 보관한다.
- **별도 Canvas + 선택된 아틀라스 1장**을 사용한다. 2048×768 아틀라스의 256×256 셀을 자르므로 프레임마다 이미지 요청이나 디코딩이 발생하지 않는다. 개별 프레임도 원본대로 보관하지만 런타임에서 요청하지 않는다.
- 매니페스트의 동작 이름, 행, FPS, 8프레임, 앵커 `(128,224)`를 사용한다. 프레임마다 Canvas 전체를 투명하게 지운 뒤 정수 소스·목적 좌표로 그린다. 프레임별 자동 크롭·재중앙정렬·이미지 혼합은 하지 않는다.
- 모바일은 64px, 데스크톱은 80px 표시 영역을 사용한다. `MobilePetLayout` / `DesktopPetLayout`을 조건부 렌더링하고 배치를 별도로 관리한다. 이미지 로더, 상태 기계, 이벤트 구독 및 그리기는 공유한다.
- 새 레이어는 `pointer-events: none`이며 이동용 버튼만 포인터 입력을 받는다. Canvas 자체는 `aria-hidden`이다. 펫은 게임 객체·충돌 목록에 들어가지 않는다. 기존 `score`, `hits`, `combo`를 props로 읽는다. 게임 상태에 쓰거나 오디오를 재생하지 않는다. 이동용 버튼은 기존 시작·설정 UI보다 아래에 배치한다.
- 독립 타이머는 FPS별 다음 프레임까지 남은 시간을 계산한다. React 상태는 이미지 로딩 때만 변경하며 프레임마다 부모 UI를 다시 렌더링하지 않는다. 일시정지·게임 종료·메뉴·문서 숨김에서 멈춘다. 화면 복귀와 `pageshow`에서 중단한 프레임부터 이어간다. 모션 줄이기 설정에서는 정지 화면을 표시한다.
- 선택 UI는 제공된 작은 썸네일을 지연 로드한다. 펫 선택창을 여는 것만으로 새 펫 아틀라스 10장을 로드하지 않는다. 빠른 선택 변경 시 이전 비동기 로드 결과를 무시한다. 로드 실패는 해당 펫에 국한되며 다른 펫을 선택하면 복구된다.
- 데스크톱에서 긴 펫 목록의 스크롤 영역이 닫기 버튼을 가로채는 현상을 펫 선택창 헤더의 쌓임 순서만 조정해 해결했다.

## 펫별 이벤트 연결

아래 FPS는 원본 매니페스트 값이다. 실제 재생 FPS는 이 값에 사용자가 선택한 속도를 곱한다. 예를 들어 푸들의 기본 동작은 현재 기본 설정에서 7 × 0.5 = 3.5 FPS다.

기본 동작은 반복한다. 명중에 따른 `hits` 또는 `score` 증가 시 두 번째 동작을 예약한다. 같은 변화에서 콤보가 5, 10, 15… 경계를 넘으면 세 번째 동작이 우선한다. 현재 동작의 마지막 프레임을 끝낸 다음 전환하며, 이벤트 동작은 8프레임을 한 번 재생하고 기본 동작으로 복귀한다. 예약은 최대 1건이고 콤보 반응이 명중 반응보다 우선한다. 점수 초기화·실패·동일 값 재렌더링은 반응을 만들지 않는다.

| 펫 | 기본 반복 | 명중·점수 증가 | 5콤보 단위 달성 |
| --- | --- | --- | --- |
| 애프리콧 토이푸들 | `idle` · 7 FPS | `play_bow` · 9 FPS | `happy_roll` · 10 FPS |
| 블랙화이트 보더콜리 | `attentive_idle` · 7 | `vertical_hop` · 11 | `playful_spin` · 10 |
| 블루 브리티시 쇼트헤어 | `sleepy_idle` · 6 | `paw_bat` · 9 | `stretch` · 8 |
| 크림오렌지 삼색 먼치킨 | `doze` · 6 | `pounce` · 11 | `belly_roll` · 9 |
| 스노화이트 토끼 | `sniff` · 8 | `binky_jump` · 11 | `side_flop` · 8 |
| 세이블 페럿 | `sniff_stand` · 8 | `war_dance` · 11 | `curl_roll` · 10 |
| 골든 햄스터 | `seed_nibble` · 8 | `cheek_groom` · 9 | `upright_sniff` · 8 |
| 실버라벤더 친칠라 | `ear_tail_idle` · 7 | `dust_roll` · 10 | `vertical_jump` · 11 |
| 초콜릿크림 피그미 고슴도치 | `floor_sniff` · 8 | `curl_ball` · 9 | `waddle` · 10 |
| 펄그레이 왕관앵무 | `crest_tilt` · 7 | `wing_stretch` · 8 | `side_step` · 10 |

## 검증 결과

Windows에서 Playwright의 Chromium(Edge) 및 WebKit 26.5를 사용했다. 아래 규격은 뷰포트·터치·DPR 3 에뮬레이션이며 해당 휴대폰 실기기 검증을 의미하지 않는다.

| 규격 | Chromium 게임 화면 | WebKit 게임 화면 | Chromium 배포 빌드 10종 선택·저장 | WebKit 배포 빌드 10종 선택·저장 |
| --- | --- | --- | --- | --- |
| 360×800 | 통과 | 통과 | 통과 | 통과 |
| 375×812 | 통과 | 통과 | 통과 | 통과 |
| 390×844 | 통과, 실제 게임 5명중·500점·5콤보 | 통과, 실제 게임 5명중·500점·5콤보 | 통과 | 통과 |
| 393×852 | 통과 | 통과 | 통과 | 통과 |
| 430×932 | 통과 | 통과 | 통과 | 통과 |
| 데스크톱 1440×1000 | 통과 | 통과 | 통과 | 통과 |

- 각 화면에서 기타, 생명 표시, 점수 및 상단 UI와 펫 영역이 겹치지 않는지 확인했다. 10종을 교체해도 기타의 좌표·크기는 동일하다.
- 두 엔진에서 **10종×3동작×8프레임**을 모두 관찰했다. Canvas 좌표가 프레임 변경에 따라 움직이지 않았다. 매 프레임을 새 투명 Canvas에 그린 결과와 비교하여 이전 동작의 사각형·잔상이 남지 않는지 검사했다. 엔진별 리샘플링 오차는 채널 2/255 이내로 허용했다. 원본 포즈 자체의 의도된 움직임은 유지한다.
- 두 엔진에서 정지·재개, 문서 숨김·복귀/`pageshow`, 모션 줄이기, 빠른 펫 교체, 강제 로드 실패 후 다른 펫으로 복구를 통과했다.
- 두 엔진에서 Safari UA/`navigator.standalone` 모의 실행의 펫 로드·프레임 진행과 웹 앱 매니페스트의 `display: standalone`을 확인했다. 실제 iOS 설치 검증은 아니다.
- 에셋: 원본 263개 파일 해시 일치, RGBA/크기 확인, 240개 개별 프레임과 아틀라스 셀의 알파 및 검정·흰 배경 합성 결과 일치. 완전 투명 픽셀 안의 RGB만 다른 원본 표현은 정상으로 취급한다.
- 검증한 정상 로딩·선택 경로에서 HTTP 404와 새 펫 관련 콘솔 오류 없음. 실패 복구 검사는 의도적으로 한 요청을 차단한 별도 시험이다.
- 공유 `dist`가 다른 빌드로 교체되는 동안 일시적인 에셋 404를 관찰했다. 출력 폴더를 `artifacts/shooter-sprite-pets/build`로 분리한 안정된 빌드에서 해당 경로와 남은 화면을 재검증했고 정상 통과했다.
- Windows WebKit 게임 실행에서는 기존 마이크 초기화가 `Microphone capture is not supported`를 출력한다. 이 환경 경고를 별도로 기록했으며 실제 마이크 입력 검증으로 간주하지 않았다.
- `node --test tests/shooter-*.test.mjs`: **227/227 통과**. `npm run build`: 통과.
- 작업 시작 전 파일과 비교한 게임 루프, 발사, 음 판정, 두 피격 처리, 피격 완료, 몹 생성, 오디오 재생, 점수 초기화의 9개 함수 본문이 동일하다.

**실기기 한계:** 실제 iPhone Safari와 홈 화면에 설치한 PWA는 연결된 iPhone이 없어 미검증이다. Windows WebKit 재생 검증과 Safari UA/`navigator.standalone` 모의 실행은 실기기 검증을 대체하지 않는다. 실기기에서 설치·재실행·백그라운드 복귀·실제 기타 마이크 입력을 확인해야 한다. 오프라인 동작이나 실제 iOS 오디오 검증도 완료로 표시하지 않는다.

## 변경 파일

| 파일·경로 | 내용 |
| --- | --- |
| `src/App.jsx` | 렌더러 연결, 읽기 전용 이벤트 값 전달, 썸네일 선택 UI, 아틀라스 중복 선로딩 방지 |
| `src/shooter/pets.js` | 기존 카탈로그에 매니페스트 기반 10종 추가 |
| `src/shooter/pets.manifest.json` | 공급 매니페스트 원문 |
| `src/shooter/ShooterSpritePet.jsx` | 선택 이미지 로더, Canvas, 모바일·데스크톱 레이아웃, 재생 생명주기 |
| `src/shooter/petAnimation.js` | 시각 반응 상태 기계와 프레임 그리기 |
| `src/shooter/sprite-pets.css` | 새 레이어 배치, 썸네일, 데스크톱 펫 창 헤더 |
| `public/assets/pets/fretiva_pet_sprite_pack_v1/` | 원본 PNG 260개 및 README·인계 문서 2개 |
| `tests/shooter-pet-skin.test.mjs`, `tests/shooter-cat-pet-skin.test.mjs` | 전체 카탈로그 수를 13으로 갱신 |
| `tests/shooter-sprite-pets.test.mjs` | 데이터·순서·FPS·이벤트 우선순위·초기화·Canvas 검사 |
| `tests/fixtures/shooter-sprite-pets.html`, `.jsx` | 실제 컴포넌트 브라우저 시험용 별도 페이지 |
| `scripts/verify-pet-pack-assets.py` | ZIP 해시와 원본 프레임 검사 |
| `scripts/verify-shooter-sprite-pets.mjs` | 모바일 5개·데스크톱 게임 통합 검사 |
| `scripts/verify-pet-component.mjs` | 10종 모든 동작·투명 픽셀·생명주기 검사 |
| `scripts/verify-pet-selection.mjs` | 프로덕션 선택·저장·지연 로딩·standalone 모의 검사 |
| `docs/shooter-pet-sprite-pack-v1.md` | 이 적용·검증 보고서 |

기존에 진행 중이던 다른 UI·오디오·매니페스트 작업은 유지했다. 위 표는 이 펫 적용과 직접 관련된 파일이며 작업 공간 전체의 미커밋 변경 목록이 아니다.

## 속도·방향·수동 위치 후속 검증

- `petPreferences.js`와 `usePetPreferences.js`에서 설정을 공유하고 `ShooterPetControls.jsx`는 모바일/데스크톱 UI를 분리한다. 저장 키는 `fretiva.shooter.spritePets.v1`이다. `usePetPlacement.js`는 화면 크기가 달라져도 정규화한 위치를 복원하고 화면 밖으로 나가지 않도록 제한한다. 드래그 취소는 이전 위치로 되돌린다.
- Chromium과 WebKit에서 모바일 5개 규격 및 1440×1000 데스크톱의 기본 위치, 재생 속도, 방향, 펫별 설정, 드래그, 재실행 복원, 방향키 이동, 초기화, 화면 경계 제한, 404 및 오류 검사 모두 통과했다. 결과는 `artifacts/shooter-pet-adjustments/<engine>/results.json`에 저장했다.
- 두 엔진에서 왼쪽 방향·0.5배 재생으로 10종 × 24프레임을 다시 검사했다. 반전한 새 투명 Canvas와 픽셀을 비교하여 잔상을 확인하고, 프레임 좌표 고정 및 정지·복귀·모션 줄이기·빠른 교체·실패 복구를 모두 통과했다. `PET_FACING=left PET_SPEED=0.5`로 `verify-pet-component.mjs`에서 재현하며 `PET_TEST_OUTPUT`으로 증거 출력 폴더를 분리할 수 있다.
- 실제 게임의 TEST SHOT 명중 후 100점·1콤보를 확인하고, 플레이 중 펫 이동이 일시정지나 점수 변경을 일으키지 않는지 확인한다.
- `verify-pet-touch.mjs`는 390×844 및 844×390에서 Chromium CDP 터치 이동과 WebKit 포인터 이동, 드래그 취소, 데스크톱 저장 위치 보존을 검사한다. 에셋 주변의 버튼 배경·광택 효과가 생기지 않는지도 확인한다. WebKit 포인터 시험은 iPhone 터치 실기기 시험이 아니다.
- 단위·회귀 테스트 **231/231 통과**, 분리된 출력 경로로 프로덕션 빌드 및 릴리스 미디어 검사 통과. 기존 게임 핵심 함수 9개는 작업 시작 시점과 동일하다.
- 실제 iPhone Safari·설치 PWA 검증 한계는 위와 동일하다.

## 재검증 및 증거

Playwright는 QA 의존성이다. `PLAYWRIGHT_MODULE`에 설치된 Playwright의 모듈 경로를 지정할 수 있다. `PET_BROWSER=webkit` 및 필요 시 `PLAYWRIGHT_BROWSERS_PATH`로 비교 엔진을 지정한다.
이 세션에서 사용한 WebKit 테스트 바이너리는 Git 추적 대상이 아닌 `artifacts/shooter-sprite-pets/browser-runtime`에 보관했다.

- 단위 테스트: `node --test tests/shooter-*.test.mjs`
- 빌드: `npm run build`
- 원본 확인: `python scripts/verify-pet-pack-assets.py <ZIP 경로>`
- 게임·컴포넌트 시험: HMR을 끈 Vite 개발 서버에서 `PET_TEST_URL`을 지정해 `verify-shooter-sprite-pets.mjs`, `verify-pet-component.mjs` 실행. 기존 `debugHitbox=1` 테스트 발사를 사용하며 제품 게임 로직을 바꾸지 않는다.
- 배포 빌드 시험: Vite preview에서 `PET_TEST_URL`을 지정해 `verify-pet-selection.mjs` 실행.
- 로컬 증거: `artifacts/shooter-sprite-pets/asset-audit.json`, `protected-code-audit.json`, 엔진별 `results.json`, `component-results.json`, `*-production/selection-results.json` 및 화면 PNG.
