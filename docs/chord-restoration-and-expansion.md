# 코드 지판 복원 및 확장 검증

## 복원 기준과 순서

기준 Git revision: `ba37b1ef28783966b4cd6af8f5f69e3cb6a3aa9b`.

1. Badd9 수정으로 바뀐 App/코드 이론/테스트를 기준 revision과 동일하게 복원했다. 해당 수정에서 추가한 자동 생성·운지 점수 모듈은 백업 후 제거했다.
2. 신규 코드를 추가하기 전에 12루트 × 19타입 = 228개 조합의 코드 객체와 전체 구간을 기준 revision과 비교했다. 전부 동일했다.
3. 이후 기존 템플릿·scoring·구간 정렬·프렛 창 규칙을 유지하면서 추가 데이터만 연결했다.

회귀 fixture: `tests/fixtures/chords-before-badd9.json`.
실제 App 함수 검증: `tests/helpers/chord-runtime.mjs`, `tests/additional-chords.test.mjs`.

## 추가 범위

- Major: 5, add2, add11, maj11, maj13, 11, 13, 7b5, 7#5, 7b9, 7#9
- Minor: m11, m13
- Dim: dim7
- 기존 6/9와 m7b5는 이론 정의/선택 항목은 있었으나 전용 운지가 없어 기본 3화음으로 fallback하던 24개 루트 조합에 운지 데이터를 보충했다.
- minor add9의 표시명을 m(add9)로 정리했다. 음·운지·구간은 그대로다.
- root → accidental → Major/Minor/Dim/Aug → extension 구조를 유지했다. Slash chord UI는 추가하지 않았다.

## 이론 정의와 실제 발음

이론 공식은 `CHORD_TONE_INTERVALS`에 전체 음정을 유지한다. 실제 운지마다 아래 정보를 별도 생성한다.

- `theoreticalTones`: 전체 이론 음정/도수/음이름
- `playedTones`: 실제 발음하는 구성음
- `omittedTones`, `omittedIntervals`: 생략된 이론 음과 음정
- `completeness`: complete 또는 conventional-omission
- `omissionReason`, `templateId`: 선언된 생략 설명 및 내부 템플릿 식별자(외부 출처 검증을 의미하지 않음)

13/maj13/m13은 모두 7종의 이론 구성음을 유지한다. 등록된 기타 보이싱에서는 11도를 생략하거나 5·11도를 생략한다. 각 타입의 3도 또는 단3도, 장7도 또는 단7도, 9도, 13도와 루트는 보존한다. 이것은 모든 기타 13 보이싱을 망라한 규칙이 아니라 이번 사전에서 허용한 명시적 정책이다. 다른 신규 타입의 임의 생략은 허용하지 않는다.

`CHORD_OMISSION_POLICIES`는 타입별 필수음과 허용 생략 집합을 정의한다. 실제 발음이 선언과 다르거나, 구성음 밖의 음이 있거나, 허용되지 않은 생략이면 생성 시 검증 오류가 난다. 운지를 편하게 만드는 점수로 생략을 결정하지 않는다.

6현 운지의 내부 `full-*` ID는 6줄을 발음한다는 뜻이다. 전체 이론 구성음의 동시 발음을 의미하지 않는다. 완전성은 별도 completeness 필드로 판단한다.

참고한 기타 교육 자료: [13th chords와 생략 관례](https://www.guitarworld.com/lessons/chords/13th-chords-demystified), [add2/add9 음역 구별](https://www.guitarlessonsbybrian.com/home/is-it-an-add-9-or-add-2-chord/). 각 실제 운지의 음정·손가락·바레는 별도 테스트로 대조했다.

## 검증 결과

- 추가 대상 192개 조합, 모든 생성 후보 712개: 음정, 최저음, 줄별 실제 pitch, X/O, 손가락 번호, 바레가 낮은 음/개방현을 막는지 검증했다.
- add2는 최저 루트 바로 위의 장2도 음역이 실제로 포함되는 별도 형태다. 기존 add9 템플릿은 변경하지 않았다.
- 새 타입의 sharp/flat 루트 및 이명동음 표기를 도수에 맞춰 검증했다. Cdim7의 감7도는 Bbb, B7#9의 증9도는 C##로 구분한다.
- 기존 204개 조합의 모든 음/운지/구간/프렛 창이 유지된다. m(add9)는 표시 문자열만 정규화해 비교했다. 나머지 24개는 위에 명시한 기존 템플릿 누락 수정이다.
- 최종 관련 테스트 18/18 통과. 프로덕션 빌드 통과.
- 전체 테스트 비교 실행: 수정 전 734개 중 721 통과/13 실패, 확장 후 737개 중 724 통과/동일 13 실패. 이후 생략 금지 정책 테스트 1개를 추가해 관련 18개 테스트를 다시 통과했다.
- 모바일 화면에서 C13의 실제 생략음과 전체 이론 구성음을 별도 행으로 확인했다. 데스크톱에서도 Badd9 x24642 복원을 확인했다.

## 복원으로 유지된 기존 사항

기존 코드의 전면 교체를 하지 말라는 요청에 따라 기존 음이름 표기도 복원했다. 따라서 기존 Badd9의 D# 발음이 화면에서 Eb로 표시되는 동작도 이 복원 범위에 포함된다. 신규/보충 템플릿에만 도수 기반 표기를 적용했다.

기존 저장 운지 중 Dadd9의 3도 생략, 일부 maj9/C7의 5도 생략 등은 원래 상태로 유지했다. 이를 새 코드의 생략 정책으로 일반화하지 않았다. 상세 사전 점검 결과는 `artifacts/badd9-restoration/pre-existing-theory-issues.json`에 있다.

1265px 폭의 데스크톱에서 기존 좌측 코드 패널이 좁아지는 현상은 기준 revision의 별도 서버에서도 동일하게 재현했다. 이번 작업에서는 기존 UI 구조를 보존했다.
