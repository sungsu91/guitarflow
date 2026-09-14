# FRETIVA LAB 에튀드 점검·구현 결과

2026-09-13. 로컬 코드에 반영하고 검증했습니다. 이 작업의 변경은 아직 커밋·푸시·배포하지 않았습니다.

## 기존 구조를 확인하고 재사용한 범위

실제 65곡의 패턴·리듬·줄/프렛·코드 구성음과 생성 경로를 읽었습니다. 기존 VexFlow SVG, 코드표 방향 렌더러, 속성 폼, JSON 입출력, v1 저장 호환 경로, 공통 오디오 버스, 메트로놈, 유형별 필터/이전·다음, MobileLayout/DesktopLayout을 유지했습니다. 이미지 악보나 별도 악보 모델로 되돌리지 않았습니다.

v2 문서는 기존 모델의 버전 확장입니다. 기본곡도 사용자 입력도 같은 컴파일러를 거쳐 오선보·TAB·재생으로 이어집니다. 생성 템플릿은 기본 콘텐츠를 초기 구체화할 때만 사용하며 한 음을 편집한다고 다시 실행하지 않습니다.

## 입력 UX의 근거

[구현 전 비교표와 공식 문서](etude-editor-benchmark.md)를 먼저 작성했습니다. 설치된 Guitar Pro 앱을 직접 조작한 검수는 아닙니다.

- Guitar Pro 공식 입력 설명: 클릭과 입력 분리, 명확한 커서, 숫자 프렛/연속 두 자리 입력, 방향키, Tab 전환, +/- 길이, R 쉼표, H/S 기법, 표준 Undo/Redo. 기존 폼은 보조 속성 팔레트로 재사용했습니다.
- Soundslice 공식 설명: 같은 음높이를 유지하는 Alt+위/아래 줄 이동을 참고했습니다. 후보 버튼도 제공합니다.
- MuseScore/Flat: 연결된 오선/TAB과 속성/도구막대 구조를 비교했습니다. GP에서 이미 확인한 핵심 입력을 다른 방식으로 덮어쓰지 않았습니다.
- FRETIVA 자체 판단: 두 자리 입력의 700ms 시간값, 문서당 브라우저 저장/초안 정책, 모바일 키패드와 접는 도구 구성, 길이 수정 후 후속 시점을 유지하면서 경고하는 정책, 64마디·24프렛의 현재 범위. 이를 GP의 내부 동작이라고 부르지 않습니다.
- GP의 자동 운지 점수·포지션 최적화는 공개 문서로 확인하지 못했습니다. 현재 줄이 가능하면 유지하고, 나머지는 후보를 직접 선택합니다. 자동 최적화·구간 재배치 엔진을 완성했다고 보고하지 않습니다.

## 커리큘럼 수정

9유형, 총 87곡입니다. 모든 유형에 초급/중급/고급 각각 최소 3곡이 있습니다. 스케일 고급은 5곡, 릭 초급은 핵심 3곡 뒤 기존 보충 4곡을 유지했습니다. 같은 음열을 키·BPM·시작 프렛만 바꿔 늘리지 않았습니다. 정규화한 음정·리듬·주법 지문 중복은 0건입니다. 유사한 기술의 반복 여부와 교육적 유용성까지 지문이 보증하는 것은 아닙니다.

- 22곡 추가: 리듬 준비, 펜타토닉 끝맺음/줄 건너뛰기, 장·단 트라이어드 대비, 가이드톤, 릭 레가토, 주법별 피킹 대비/줄 인계/프레이징, 작은 F 바레와 이동 코드 준비/적용.
- 고급 릭 3곡은 실제 음열·리듬을 코드 목표음→동기 발전→짧은 솔로로 교체했습니다.
- 순수 트라이어드/7th 과제 2곡에서 8마디 15번째 D를 E로 바꿔 해당 구성음 규칙을 회복했습니다. 다른 마디는 유지했습니다.
- 같은 난이도 안에서 릭 5곡의 순서를 정리했습니다. 전체를 높은 프렛으로 옮겨 난이도를 올리지 않았습니다. 모든 기본곡은 0–9프렛 범위입니다.
- 각 곡의 학습목표·실제 핵심 음/마디·준비 수준·선행곡·기존 고유 TIP·템포·완료 기준을 연결했습니다. 가이드톤 과제의 실제 F→B/B→E 연결도 별도로 검사합니다.

곡별 유지/보완/교체/순서 재배치와 근거는 [전체 87곡 기록](etude-curriculum-audit.md)에 있습니다. 실제 기타 실연 검토는 하지 않았으며 앱에서도 자동 데이터 검사와 구분해 표시합니다.

## 편집·저장 안정성

한 음 수정은 stable ID를 유지하고 불변 데이터 패치로 반영됩니다. 수정하지 않은 마디는 같은 객체/음표 데이터로 유지됩니다. 줄/프렛과 튜닝에서 MIDI를 계산하므로 표시음과 재생음을 따로 입력하지 않습니다. 자유 반음·비화성음을 허용하며 기본 교육곡 검사와 사용자 문서 유효성 검사를 분리했습니다.

빈 악보, 복사본, 단음·동시음·쉼표, 길이·시점, 마디 추가/복제/삭제, 마디 범위 복사·붙여넣기, Undo/Redo, 로컬 저장/재열기, JSON 입출력을 제공합니다. 기본곡 수정은 별도 내 편집본이며 공식 교육곡으로 표시하지 않습니다. 복원은 Undo 가능하고 다른 저장본을 지우지 않습니다. 잘못된 박자는 자동으로 다른 음을 삭제/이동해 맞추지 않고 경고합니다.

v1→v2 이관은 이전 저장 키를 보존합니다. 검토 과정에서 기존 기본곡의 document가 수정본을 가리는 경로를 발견해 수정했고, 이전에 수정한 프렛·제목·BPM 유지 테스트를 추가했습니다. 저장소 용량 초과/손상은 실패 상태를 알리며 성공했다고 표시하지 않습니다.

붙임줄은 다음 음/음높이/줄을 검사하고 마디 경계 양쪽에 표시합니다. 복사 범위 내부의 링크는 새 ID로 이어집니다. H/P/SL은 마디 내부 표시를 지원합니다. 기본 코드표 수정은 기존 정책대로 해당 마디의 해당 줄 음도 함께 변경하며 UI에 범위를 안내합니다.

## 성능 측정

같은 개발 서버/헤드리스 Chrome에서 30회 연속 커서 이동+숫자 입력 시나리오를 전후 비교했습니다. 모바일은 390×844 모의 환경입니다. 측정값은 실제 휴대폰이나 모든 환경에서 보장되는 수치가 아닙니다.

| 환경 | 입력→다음 화면 프레임 p50 전/후 | p95 전/후 | 스타일 재계산 합계 전/후 |
|---|---:|---:|---:|
| 데스크톱 | 60.3 / 36.8ms | 111.2 / 43.6ms | 3.183 / 1.637s |
| 모바일 모의 | 46.1 / 7.6ms | 85.4 / 11.4ms | 1.319 / 0.032s |

음악 계산보다 전역 CSS 매칭이 큰 병목이었습니다. 편집 SVG에 로컬 Shadow DOM 스타일을 적용해 범위를 줄였습니다. 커서 이동만으로 SVG를 새로 만들지 않으며 한 음 변경은 해당 마디만 다시 그립니다. 64마디의 마지막 마디 입력 시 앞 63마디의 렌더 횟수가 그대로인 것을 검증했습니다. 새 페이지/줄 배치가 필요하면 다시 그릴 수 있지만 음악 데이터는 변경하지 않습니다. 숫자 입력 때 저장을 반복 실행하지 않습니다.

## 실행한 검증

- 관련 Node 테스트 39/39 통과: 자유 반음, TAB/오선/실음, 부분 데이터·ID·렌더 캐시, 박자 문제, 기본 원본 보호, 저장 복수본, 이관·저장 실패, 동시음·튜닝·붙임줄, 유형별 교육 규칙.
- 전체 Node: 831개 중 813 통과, 18 실패. 기준 커밋 34cd87b도 817개 중 799 통과, 같은 18개 실패였습니다. 게임/기존 레이아웃 등 다른 영역의 동일 실패이며 새 실패 0개입니다. 전체가 통과했다고 보고하지 않습니다.
- 악보 브라우저: 87곡×4 표시 조건=348회 SVG, 데스크톱·모바일 각 27개 유형/단계 탐색. 음높이, TAB 일치, 임시표/코드표, 숫자 위치, 범위/이전·다음, 확대·가로 표시 검사 통과.
- 입력 브라우저: 12 두 자리 입력, 선택만 할 때 데이터/렌더 유지, 30회 연속 입력, Undo/Redo, 저장/재열기, 미완성 초안, 64마디 후반 입력, 확대 후 입력, 모바일 터치 키패드, 합성 재생 시작·정지 통과.
- 추가 브라우저: 빈 악보를 UI로 열고 오선 선택→줄 지정→TAB 입력, 동일음 다른 줄 이동, 화면 크기/확대 후 음악 데이터 유지, 마디 경계 붙임줄 양쪽 표시 통과.
- 프로덕션 빌드 통과. 기존 대형 청크 경고는 남아 있습니다.

원자료: `artifacts/etude-input/verification.json`, `performance-before.json`, `links-verification.json`, `full-suite-comparison.json`, `curriculum-audit.json`, `artifacts/etude-tracks/verification.json`.

## 남은 범위·확인 필요

- GP 설치 앱과의 실제 조작 대조, 공개되지 않은 자동 운지 최적화/선택 구간 자동 재배치는 미확인·미구현입니다.
- 실제 기타 실연에 의한 난이도/손 크기/뮤트·음색 검토와 실물 모바일 iOS/Safari 검수는 필요합니다.
- H/P/SL을 실제 기타 음색으로 합성하지 않습니다. 현재 재생은 음높이·리듬·동시음·붙임줄의 확인입니다. 독립 let-ring 성부도 없습니다.
- Bend/Vibrato/PM/Ghost/Dead/Grace, 점음표·셋잇단음표·다성부·반복 연주, 음 단위 임의 범위 복사는 미구현입니다. 기존 기능인 것처럼 표시하지 않았습니다. 마디 경계 H/P/SL도 경고하고 재생을 보류합니다.
- 자동 저장/회원가입/서버 동기화는 추가하지 않았습니다. 미저장 상태 종료는 경고하지만 모바일 강제 종료는 보장할 수 없습니다. 초안 저장/파일 내보내기를 사용합니다.
- 데스크톱 입력 p95 약 44ms가 남아 있어 모든 입력이 한 프레임 안에 갱신된다고 보증하지 않습니다. 긴 악보 전체 최초 로딩도 모든 마디를 한 번 그립니다.

## 실제 수정·추가 파일

아래는 이번 작업에서 수정하거나 추가한 소스·문서·검증 코드입니다. 작업 전부터 변경되어 있던 다른 스크린샷/임시 파일은 포함하지 않습니다.

- [src/etudes/EtudeStudio.jsx](../src/etudes/EtudeStudio.jsx)
- [src/etudes/Score.jsx](../src/etudes/Score.jsx)
- [src/etudes/ScoreEditor.jsx](../src/etudes/ScoreEditor.jsx)
- [src/etudes/EditorScore.jsx](../src/etudes/EditorScore.jsx)
- [src/etudes/ScorePlayback.jsx](../src/etudes/ScorePlayback.jsx)
- [src/etudes/scoreDocument.js](../src/etudes/scoreDocument.js)
- [src/etudes/scoreModel.js](../src/etudes/scoreModel.js)
- [src/etudes/scoreLibrary.js](../src/etudes/scoreLibrary.js)
- [src/etudes/editorCommands.js](../src/etudes/editorCommands.js)
- [src/etudes/scorePlayback.js](../src/etudes/scorePlayback.js)
- [src/etudes/catalog.js](../src/etudes/catalog.js)
- [src/etudes/tracks.js](../src/etudes/tracks.js)
- [src/etudes/curriculumRevision.js](../src/etudes/curriculumRevision.js)
- [src/etudes/openChordStudies.js](../src/etudes/openChordStudies.js)
- [src/etudes/pedagogy.js](../src/etudes/pedagogy.js)
- [src/etudes/scoreEditor.css](../src/etudes/scoreEditor.css)
- [src/etudes/etudes.css](../src/etudes/etudes.css)
- [scripts/apply-etude-edit.mjs](../scripts/apply-etude-edit.mjs)
- [scripts/audit-etude-curriculum.mjs](../scripts/audit-etude-curriculum.mjs)
- [scripts/verify-etude-input.mjs](../scripts/verify-etude-input.mjs)
- [scripts/verify-etude-edit-links.mjs](../scripts/verify-etude-edit-links.mjs)
- [scripts/verify-etude-tracks.mjs](../scripts/verify-etude-tracks.mjs)
- [tests/etude-editor.test.mjs](../tests/etude-editor.test.mjs)
- [tests/etude-input.test.mjs](../tests/etude-input.test.mjs)
- [tests/etudes.test.mjs](../tests/etudes.test.mjs)
- [docs/etude-editor-benchmark.md](../docs/etude-editor-benchmark.md)
- [docs/etude-editing.md](../docs/etude-editing.md)
- [docs/etude-curriculum.md](../docs/etude-curriculum.md)
- [docs/etude-curriculum-audit.md](../docs/etude-curriculum-audit.md)
- [docs/etude-studio.md](../docs/etude-studio.md)
- [docs/etude-work-report.md](../docs/etude-work-report.md)
