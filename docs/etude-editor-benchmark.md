# 악보 편집 비교 조사 — 2026-09-13, 구현 전 기록

실제 설치된 Guitar Pro를 조작해 검증한 결과는 아니다. 아래는 공식 웹 설명서에서 확인한 동작이다. 공개되지 않은 운지 알고리즘, 내부 렌더링 방식, 입력 제한 시간은 확인되지 않았다.

| 기능 | Guitar Pro 8 | MuseScore Studio | Soundslice | Flat | FRETIVA 기존 | 채택 / 수정 |
|---|---|---|---|---|---|---|
| 선택과 입력 | 클릭은 커서 이동, 키로 입력 | N 입력 모드와 선택 구분 | 박·줄 선택 후 입력 | TAB 커서에 숫자 입력 | 선택 상자와 입력 폼 | GP 커서, 클릭만으로 생성하지 않음 / 수정 |
| 프렛 입력 | 0–9, 짧은 간격의 두 자리 입력 | 연속 숫자로 두 자리 입력 | 숫자로 프렛 입력 | 숫자 입력 | number 폼 | GP 직접 입력 / 추가 |
| 이동 | 방향키, Tab으로 기보 전환 | 줄·음표 커서 | 방향키, 입력 후 자동 전진 안 함 | 방향키 | 선택 상자 | GP 방향키와 Tab / 추가 |
| 길이·쉼 | + 짧게, - 길게, R 쉼 | 음가 도구막대, TAB 전용 단축키 | +/- | 기보 도구막대 | select·checkbox | GP +/-/R와 작은 팔레트 / 기존 재사용 |
| 오선/TAB | 연결된 두 표시 | 연결된 보표 | 튜닝으로 상호 변환 | 항상 동기화 | TAB→MIDI→SVG, 음계 밖 음 거부 | 기존 파생 경로 유지, 자유 음정 허용 / 수정 |
| 동일음 줄 변경 | 수동 줄 지정 지원 | TAB 줄 변경 지원 | Alt+방향키, 음높이 유지 | 줄/프렛 자동 배치 지원 | 없음 | Soundslice Alt+위아래 / 추가 |
| 자동 운지 | 오선 입력 0 자동, 1–9 줄 지정; 내부 점수 미공개 | 자동 배치의 세부식 확인 안 됨 | 오선 입력 시 자동 TAB; 세부식 미공개 | 자동 TAB | 없음 | 후보 직접 선택 먼저. GP 알고리즘 복제 주장 금지 |
| 도구 패널 | 좌측 Edition Palette, Inspector | Properties/Palettes | Edit pane | notation toolbar | 좌측 폼 | 기존 폼을 보조 속성으로 유지, 악보 커서+축약 팔레트 / 수정 |
| Undo/Redo | 도구막대·표준 단축키 | 표준 단축키 | 편집 Undo | 편집 Undo | 없음 | Ctrl/Cmd+Z, Shift+Z / 추가 |
| H/P/slide | 기타 기보 팔레트 | 기타 기보 | TAB 효과 | TAB 효과 | 데이터·표시만 있음 | 기존 SVG 기보 유지; 음원 지원 여부 명시 |
| 드래그 | TAB 핵심 입력은 커서·키보드 | 별도 기보 조작 존재 | 편집 기능별 조작 | 편집 기능별 조작 | 없음 | 자유 드래그 입력 만들지 않음 |
| 저장 | 파일·원본/복사 | 파일 | 온라인 slice | 온라인 score | v1 localStorage 한 수정본 | 서버 추가 없이 다중 수정본·초안·기존 저장 이관 |

FRETIVA 자체 판단: 웹 숫자 조합 시간 700ms(원 프로그램과 동일한 수치라는 근거 없음), 사용자 문서 저장/초안 정책, 검수 상태 표시. 자동 선택 내부 알고리즘은 미확인 항목으로 분리하며 위치 최적화 엔진을 GP 방식이라고 도입하지 않는다.

## 공식 출처

- [GP8 note input](https://www.guitar-pro.com/docs/gp8/score/note/note-input)
- [GP8 quick start](https://www.guitar-pro.com/docs/gp8/basics/intro/quick-start)
- [GP8 keyboard shortcuts](https://www.guitar-pro.com/docs/gp8/appendix/shortcuts)
- [GP8 palette](https://www.guitar-pro.com/docs/gp8/score/note/symbols)
- [MuseScore Studio tablature](https://handbook.musescore.org/idiomatic-notation/guitar/entering-and-editing-tablature-notation)
- [Soundslice TAB](https://www.soundslice.com/help/en/creating/tablature/59/overview/)
- [Soundslice slides](https://www.soundslice.com/help/en/creating/tablature/118/slides/)
- [Flat TAB](https://help.flat.io/en/music-notation-software/tabs/)

## 실제 코드 조사

65곡, 9유형. 스케일 2/3/5, 펜타토닉 2/2/2, 릭 7/2/3, 코드톤 런 2/3/2, 나머지 5유형 각 2/2/2. catalog/trackStudies/curriculum/openChordStudies의 실제 패턴이 줄·프렛으로 컴파일된다. 이미지 원본 없음. Score.jsx는 VexFlow SVG이며 전체 SVG 재렌더와 12개 캐시가 있다. ScoreEditor.jsx의 기존 폼, 동시음·코드표 편집, JSON 입출력, localStorage를 재사용한다.

빠진 부분: 안정 ID, 자유 반음 입력, 악보 커서, Undo/Redo, 빈 문서, 복수 편집본, 초안 저장, 실제 음표 재생. 현재 재생은 메트로놈뿐이다. 저장 시 원곡 음계 제한을 사용자 입력에 적용하던 문제와 매 타이핑 전체 컴파일·SVG 재생성을 우선 수정한다. 기본곡 검수와 사용자 문서 유효성 검사를 분리한다.


## 후속 입력 개선 조사·구분

GP8 공식 note-input 문서에서 Insert/Delete와 Note > Insert a Beat / Delete a Beat를 다시 확인했다. 이전 구현의 같은 onset에 겹쳐 넣는 문제를 수정했다. 현재 FRETIVA의 **뒤에 박 삽입**은 같은 마디의 뒤쪽 이벤트를 미는 명시적 동작이며, 초과 음표의 자동 재마디 배치는 하지 않는다. 이 세부 처리가 GP와 완전히 같다고 확인한 것은 아니다. 사용자의 후속 요청에 따라 박 나누기, Undo 가능한 초기화, 100% 이하 축소, 피킹 패턴 일괄 적용을 추가했다. 피킹 일괄 적용은 선택한 반복 규칙을 적용하며 연주법을 자동 최적화하지 않는다.


## 사용자 요청에 따른 드래그 추가

[Soundslice 공식 Note basics](https://www.soundslice.com/help/en/creating/notations/92/note-basics/)에서 음표를 위아래로 끌어 음높이를 바꾸는 동작을 확인했다. 이 개념을 오선보 드래그에 참고했다. GP8 문서에서 이 드래그의 세부 동작은 확인하지 못했으며 GP 동일 구현이라고 보고하지 않는다.

같은 길이의 빈 박으로 좌우 이동, TAB 줄 드래그 시 프렛 유지, 연결 음 이동 차단은 사용자에게 설명한 **FRETIVA의 제한된 추가 동작**이다. 전문 프로그램의 검증된 내부 동작으로 주장하지 않는다. 핵심 키보드/커서 입력은 기존 GP 참고 흐름을 유지한다. 클릭만으로 생성하지 않는다.
