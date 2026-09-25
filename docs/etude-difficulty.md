# 기본 연습곡 별점 난이도

앱 제공 103곡에 대한 편집상 추정치이며, 추천 BPM에서의 연주 부담을 비교한다. 공인 등급이나 연주자 실력 평가가 아니다. 기존 level/연습 순서/곡 내용/저장 데이터는 유지하고 별도 templateId 표에서 표시값만 읽는다. 사용자 제작곡과 수정·저장한 복사본에는 기본곡의 별점을 자동으로 붙이지 않는다.

평가 항목: 실제 리듬 밀도와 지속 시간, 줄 건너뛰기와 포지션 이동, 바레와 운지 간격, 벤딩 음정·레가토의 제어, 동시 발음·베이스/멜로디 독립성. 단순히 BPM이나 가장 짧은 음표 하나로 점수를 계산하지 않는다. 장르 이름과 기존 초급/중급/고급만으로 결정하지 않는다.

- 1–1.5: 느린 기본 음 입력과 짧은 반복 패턴.
- 2–2.5: 줄 연결, 8분음표 프레이즈, 단일 주법과 간단한 코드 전환.
- 3–3.5: 포지션 이동, 혼합 리듬, 연속 16분음표 또는 여러 주법의 연결.
- 4–4.5: 엇박·복합 주법·독립 성부와 긴 프레이즈를 함께 제어.
- 5: 척도의 상한. 이번 제공곡에 억지로 5점을 배정하지 않았다.

0.5점 단위로 다섯 개의 별을 채우며 반 개 별은 실제 절반만 채워 표시한다. 즐겨찾기 별과 달리 난이도 별은 클릭 동작이 없는 정보 표시다. ko/en 접근성 이름과 설명을 제공한다.

| 곡 | 추천 BPM | 별점 / 5 | 식별자 |
| --- | ---: | ---: | --- |
| 반음·온음 벤딩과 목표음 | 48 | 2.5 | bend-target |
| 벤딩·릴리스와 8·16 응답 | 56 | 3.5 | bend-release-mixed |
| 벤딩·HPH·슬라이드 복합 프레이즈 | 64 | 4.0 | bend-legato-phrase |
| 손가락 간격 첫걸음 | 48 | 1.0 | triad-start |
| 한 박씩 나누는 줄 연결 | 52 | 1.5 | scale-rhythm-bridge |
| 스케일 줄 왕복 | 60 | 2.0 | first-path |
| 3도 교차 대화 | 72 | 2.5 | thirds-dialogue |
| 기준음으로 돌아오는 피벗 | 76 | 2.5 | pivot-return |
| 4도 줄 건너뛰기 | 66 | 2.5 | fourth-crossing |
| 16분음표 포지션 이동 | 80 | 3.5 | diagonal-sequence |
| 연속 3도 16분음표 | 76 | 3.5 | thirds-drive |
| 4도 크로스 16분음표 | 72 | 4.0 | fourths-drive |
| 16분 피벗 음역 확장 | 80 | 3.5 | pivot-drive |
| 엇박 16분 시퀀스 | 80 | 4.0 | offbeat-drive |
| 펜타토닉 두 음 간격 | 48 | 1.0 | penta-pairs |
| 두 줄 왕복과 루트 도착 | 52 | 1.5 | penta-landing |
| 펜타토닉 반복 훅 | 68 | 2.0 | penta-hook |
| 펜타토닉 포지션 왕복 | 84 | 3.0 | rock-penta |
| 엇박에 들어오는 펜타토닉 | 78 | 3.0 | offbeat-hook |
| 펜타토닉 줄 건너 응답 | 64 | 2.5 | penta-string-skip |
| 펜타토닉 네 음 시퀀스 | 84 | 3.5 | penta-groups |
| 펜타토닉 교차 왕복 | 80 | 3.5 | penta-turns |
| 엇박·줄 건너뛰기 결합 | 72 | 4.0 | penta-rhythm-application |
| 3도로 맺는 팝 프레이즈 | 70 | 2.0 | major-landing |
| 쉼이 있는 발라드 멜로디 | 60 | 1.5 | ballad-breath |
| 두 음으로 질문과 대답 | 60 | 1.0 | two-note-answer |
| 4·8분음표 리듬 릭 | 64 | 1.5 | ballad-line |
| 상행·하행 릭 | 72 | 2.0 | pop-answer |
| 블루 노트 계단 왕복 | 64 | 2.0 | blue-turn |
| 반복·변형 미니 솔로 | 72 | 2.5 | beginner-finale |
| 질문·엇박·응답 솔로 | 80 | 3.0 | intermediate-finale |
| 해머·풀로 이어지는 응답 | 64 | 2.5 | lick-legato-answer |
| 짧게 달리고 길게 맺기 | 64 | 3.0 | speed-window |
| 코드가 바뀔 때 목표음 도착 | 72 | 3.0 | blues-burst |
| 같은 동기를 화성에 맞춰 발전 | 72 | 3.5 | density-switch |
| 목표음·쉼·레가토 미니 솔로 | 72 | 4.0 | advanced-finale |
| 세 줄 1·3·5음 첫걸음 | 48 | 1.5 | triad-three-strings |
| 세 줄 8분음표 왕복 | 56 | 2.0 | triad-eighth-answer |
| C·Am 구성음 구별 | 52 | 1.5 | triad-major-minor |
| 두 옥타브 트라이어드 | 68 | 3.0 | triad-cross |
| 코드톤 포지션 연결 릭 | 72 | 3.5 | pop-chord-route |
| 재즈 메이저7 아르페지오 | 88 | 3.0 | jazz-seventh |
| 트라이어드 역방향 엔진 | 76 | 3.5 | triad-engine |
| 메이저7 지그재그 연결 | 76 | 4.0 | seventh-weave |
| 7화음 3·7음 연결 | 72 | 3.0 | codetone-guide-tones |
| 기본 C 코드로 첫 반주 | 44 | 1.5 | chord-three-strings |
| C·Am 두 오픈 코드 반주 | 48 | 2.0 | chord-two-grips |
| C에서 작은 F 바레 준비 | 44 | 2.5 | chord-small-barre |
| C·Am·F·G 코드 진행 반주 | 56 | 3.0 | chord-accompaniment |
| 같은 바레 모양 이동 준비 | 48 | 3.0 | chord-moving-preparation |
| Bmaj7·D#m·Emaj7·Em7 코드 이동 | 56 | 3.5 | chord-bass-answer |
| G장조 교대 베이스 반주 | 56 | 3.0 | chord-g-alternating |
| Am · 셋잇단과 8·16 반주 | 56 | 3.5 | chord-am-triplet |
| G장조 · 셋잇단과 8·16 반주 | 56 | 3.5 | chord-g-triplet |
| 코드 이동 위에 독립 베이스·16분 반주 | 60 | 4.0 | chord-sixteenths |
| 세 음 동시 뜯기와 엇박 응답 | 64 | 4.0 | chord-density |
| 베이스와 높은 음의 밀도 응답 | 60 | 4.0 | chord-melody-response |
| Am 단조 순환과 16분 반주 | 60 | 3.5 | chord-am-circle |
| Em에서 G로 · 동시 뜯기와 엇박 | 64 | 4.0 | chord-em-offbeat |
| C장조 하행 흐름 · 8·16 응답 | 60 | 3.5 | chord-c-response |
| 한 줄 두 음 해머온 | 48 | 1.5 | hammer-single |
| 피킹음과 해머온 음량 비교 | 52 | 2.0 | hammer-contrast |
| 두 음 해머온 | 50 | 2.0 | hammer-start |
| 해머온 세 음 연결 | 60 | 2.5 | hammer-three |
| 줄을 옮기는 해머온 | 64 | 3.0 | hammer-crossing |
| 마디 안에서 줄 바꾸는 해머온 | 64 | 3.0 | hammer-handoff |
| 8·16 혼합 해머온 | 60 | 3.0 | hammer-mixed |
| 연속 16분 해머온 | 72 | 3.5 | hammer-drive |
| 방향을 바꾸는 해머온 | 76 | 3.5 | hammer-sequence |
| 밀도와 도착음을 조절하는 해머온 | 72 | 3.5 | hammer-phrasing |
| 한 줄 두 음 풀오프 | 48 | 1.5 | pull-single |
| 피킹음과 풀오프 음량 비교 | 52 | 2.0 | pull-contrast |
| 하행 풀오프 릭 | 60 | 2.0 | pull-return |
| 풀오프 세 음 연결 | 60 | 2.5 | pull-three |
| 줄을 옮기는 풀오프 | 64 | 3.0 | pull-crossing |
| 마디 안에서 줄 바꾸는 풀오프 | 64 | 3.0 | pull-handoff |
| 16·8 혼합 풀오프 | 60 | 3.0 | pull-mixed |
| 연속 16분 풀오프 | 72 | 3.5 | pull-drive |
| 방향을 바꾸는 풀오프 | 76 | 3.5 | pull-sequence |
| 밀도와 도착음을 조절하는 풀오프 | 72 | 3.5 | pull-phrasing |
| 한 줄 두 음 슬라이드 | 48 | 1.5 | slide-single |
| 피킹음과 슬라이드 음량 비교 | 52 | 2.0 | slide-contrast |
| 두 줄에 적용하는 슬라이드 | 52 | 2.0 | slide-pairs |
| 슬라이드로 포지션 연결 | 60 | 2.5 | slide-path |
| 줄을 옮기는 슬라이드 | 64 | 3.0 | slide-crossing |
| 마디 안에서 줄 바꾸는 슬라이드 | 64 | 3.0 | slide-handoff |
| 혼합 리듬 슬라이드·이음줄 | 60 | 3.0 | slide-slur-mixed |
| 연속 16분 슬라이드 | 72 | 3.5 | slide-drive |
| 방향을 바꾸는 슬라이드 | 76 | 3.5 | slide-sequence |
| 밀도와 도착음을 조절하는 슬라이드 | 72 | 3.5 | slide-phrasing |
| 한 줄 해머·풀 연결 | 44 | 2.0 | legato-single |
| 피킹음과 레가토 음량 비교 | 52 | 2.0 | legato-contrast |
| 두 줄에 적용하는 레가토 | 52 | 2.5 | legato-pairs |
| 레가토 세 음 연결 | 60 | 3.0 | legato-three |
| 해머·풀·슬라이드 혼합 릭 | 76 | 3.0 | legato-phrase |
| 마디 안에서 줄 바꾸는 레가토 | 64 | 3.0 | legato-handoff |
| HPH·PHP 혼합 리듬 | 60 | 3.5 | legato-hph-mixed |
| 연속 16분 레가토 | 72 | 3.5 | legato-chain |
| 세 기법 연속 레가토 | 76 | 4.0 | legato-drive |
| 밀도와 도착음을 조절하는 레가토 | 72 | 3.5 | legato-phrasing |
| HPH와 레가토 슬라이드 응답 | 68 | 4.0 | legato-slide-mixed |
| 함께 걷는 길 · 작곡 스케치 | 64 | 3.5 | together-composition-sketch |
| 햇살 사이로 · 핑거스타일 작곡 스케치 | 92 | 4.5 | daylight-fingerstyle-sketch |
