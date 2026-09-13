# 에튀드 악보 수정

악보와 코드표는 이미지 파일이 아니다. 음표·리듬·줄/프렛 데이터에서 VexFlow SVG를 그린다. 오선보와 TAB은 같은 음 데이터에서 생성되고, 코드표는 별도 방향 렌더러를 사용한다.

## 앱에서 직접 수정

악보 위의 **악보 편집**을 누른다. 마디와 음표를 선택해 줄/프렛, 온·2분·4분·8분·16분음표, 쉼표, 동시음과 H/P/SL 연결을 편집한다. 음표와 마디를 복제하거나 삭제할 수 있다. 현재 지원 박자는 4/4이며 각 마디는 정확히 4박이어야 한다.

아르페지오는 **이 마디의 코드표 수정**에서 코드명·6개 줄의 프렛·손가락·바레를 바꾼다. 입력 UI는 위에서 1→6번줄이다. 코드 프렛을 바꾸면 그 마디의 해당 줄 음표도 함께 변경된다. ×로 바꾸면 그 줄의 음을 제거하고, 동시음이 모두 없어지는 이벤트는 같은 길이의 쉼표가 된다. 메이저/마이너/maj7/m7/7/add9 코드명을 지원한다. 코드명과 모든 코드표 구성음, 실제 연주음이 맞아야 저장된다.

**이 브라우저에 저장**은 해당 기기·브라우저의 localStorage에 수정본을 보관한다. 서버의 공용 커리큘럼을 변경하거나 다른 기기에 자동 동기화하지 않는다. **파일 내려받기**로 `.fretiva.json`을 보관하고, 같은 과제에서 **파일 불러오기**로 이어서 편집한다. **기본 악보 복원**은 해당 과제의 브라우저 수정본만 지운다. 파일 불러오기는 저장 버튼을 누르기 전까지 미리보기 초안이다.

## 데이터와 화면 분리

- `notationData.js`: 기타 표준 튜닝, 음이름/옥타브 계산, 코드 분석, 음표 검증. MIDI와 기보 음높이를 중복 입력하지 않는다.
- `scoreDocument.js`: 버전 1 편집 문서, 컴파일/검증, 브라우저 저장. 수정된 문서에서 새로운 score 객체를 만들어 캐시가 이전 SVG를 사용하지 않게 한다.
- `Score.jsx`: score 데이터에서 오선보와 TAB을 렌더링. 높은 편집 음에는 덧줄 여백을 확보한다.
- `chordStudy.js`: 코드표 레이아웃. 위에서 1→6번줄, 프렛은 왼쪽→오른쪽. 프렛과 손가락 배열의 저장 순서는 기존대로 6→1번줄이며 화면 방향만 분리한다.
- `ScoreEditor.jsx`: 공통 편집 로직/입력 컨트롤. 모바일은 편집/미리보기 전환, 데스크톱은 양쪽 패널로 나눈다. 편집기는 버튼을 눌렀을 때 로드한다.

문서는 `format: "fretiva.etude"`, `version: 1`, `templateId`, 제목/설명/BPM/TIP, `measures`를 담는다. 각 마디의 `events`는 `duration`, `rest`, `technique`, `notes: [{string, fret}]`로 표현한다. 코드 마디에는 `chord: {name, frets, fingers, barre}`를 함께 저장한다. 생성된 MIDI, SVG 좌표, 이미지 데이터는 내보내지 않는다. 과제 자체의 키는 바꾸지 않으며 현재 음계나 해당 코드에 맞지 않는 음, 중복 줄, 잘못된 연결·박자는 오류로 표시한다.

## 기본 악보에 반영하기

앱에서 내보낸 파일과 같은 형식을 코드 변경에도 사용한다.

```powershell
node scripts/apply-etude-edit.mjs "C:/path/to/chord-bass-answer.fretiva.json" --check
node scripts/apply-etude-edit.mjs "C:/path/to/chord-bass-answer.fretiva.json"
```

첫 명령은 검증만 한다. 두 번째는 `src/etudes/scoreOverrides.json`의 해당 `templateId`만 갱신한다. 원래 생성용 템플릿을 다시 풀어 쓰거나 SVG/이미지를 재구성할 필요가 없다. 이 파일을 빌드·커밋·배포하면 공용 기본 악보에 반영된다. 기본 템플릿으로 되돌릴 때는 해당 override 항목을 제거한다.

검증: `node --test tests/etude-editor.test.mjs tests/etudes.test.mjs`. UI/저장/파일왕복/모바일 확인: `scripts/verify-etude-editor.mjs`. 전체 악보·가로 코드표 배치: `scripts/verify-etude-tracks.mjs`.
