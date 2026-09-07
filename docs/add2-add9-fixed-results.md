# add2/add9 고정 position 적용 결과

검증일 2026-09-08. Major add2/add9 표시 데이터만 변경. Minor add9 및 다른 코드 계열은 변경하지 않음. 공통 generator 함수는 수정하지 않았으며 표시 어댑터의 add2/add9 분기에서 생성기 호출을 우회한다.

## 자연음 루트 1구간

| 코드 | 6→1 fret | 실제 음 6→1 (X=뮤트) | 분류 | 선정 근거 |
|---|---|---|---|---|
| Cadd9 | x 3 2 0 3 0 | X–C–E–G–D–E | open-position | 사용자 지정 Cadd9 기준 및 기타 개방형 교육 자료 |
| Cadd2 | x 3 2 0 3 3 | X–C–E–G–D–G | open-position | Cadd2 자료의 대표 도표; 3도 유지, 5도 중복 |
| Dadd9 | x x 0 2 5 2 | X–X–D–A–E–F# | open-position | 교육 자료 Dadd2 형태를 add9 표기 관행과 함께 사용 |
| Dadd2 | x 5 4 x 5 5 | X–D–F#–X–E–A | movable | Dadd2 대표 도표; 3번줄 뮤트 |
| Eadd9 | 0 2 2 1 0 2 | E–B–E–G#–B–F# | open-position | Eadd9 교육 원형: F#을 1번줄에 배치 |
| Eadd2 | 0 2 4 1 0 0 | E–B–F#–G#–B–E | open-position | Eadd2 교육 원형: F#을 4번줄에 배치 |
| Fadd9 | x x 3 2 1 3 | X–X–F–A–C–G | movable | 두 코드 자료에 공통으로 실린 기본 F형 |
| Fadd2 | x x 3 2 1 3 | X–X–F–A–C–G | movable | 두 코드 자료에 공통으로 실린 기본 F형 |
| Gadd9 | 3 2 0 2 0 3 | G–B–D–A–B–G | open-position | Gadd9 대표 도표 320203 |
| Gadd2 | 3 0 0 0 0 3 | G–A–D–G–B–G | open-position | 자료의 G 개방형 대안. G에만 사용하고 전조하지 않음 |
| Aadd9 | x 0 2 4 2 0 | X–A–E–B–C#–E | open-position | Aadd2/add9가 공유하는 교육용 개방형; 임의의 차별 운지 미생성 |
| Aadd2 | x 0 2 4 2 0 | X–A–E–B–C#–E | open-position | Aadd2/add9가 공유하는 교육용 개방형; 임의의 차별 운지 미생성 |
| Badd9 | x 2 4 6 4 2 | X–B–F#–C#–D#–F# | preserved-closed | 사용자 명시 보호 대상: 작업 전 Badd9 position 전체를 고정 스냅샷으로 보존. 재선정하지 않음. |
| Badd2 | x 2 4 6 4 x | X–B–F#–C#–D#–X | movable | Badd2 자료의 명시적 대안. 넓은 운지이므로 쉬운 코드라고 표시하지 않음 |

## 전체 root 및 고정 position

각 row는 고정 배열의 순서다. 개방형 전조/음별 fret 탐색/span 정렬을 사용하지 않는다. 검증된 4번줄 root의 닫힌 F형만 명시적 다른 root 위치로 등록했다. 2/3/4구간이 없는 경우 후보를 임의 생성하지 않는다.

| 코드 | 구간 | fret | 실제 음 | rootString | 분류 | 출처 |
|---|---|---|---|---|---|---|
| Cadd9 | 1 | x 3 2 0 3 0 | X–C–E–G–D–E | 5 | open-position | [자료](https://www.guitar-chord.org/add9.html) / [자료](https://www.guitare-improvisation.com/img/pdf/Pleins_de_positions_d%27accords_ouverts_enrichis.pdf) |
| Cadd9 | 2 | x 3 2 0 3 3 | X–C–E–G–D–G | 5 | open-position | [자료](https://www.guitar-chord.org/add2.html) |
| Cadd9 | 3 | x x 10 9 8 10 | X–X–C–E–G–D | 4 | movable | [자료](https://www.guitar-chord.org/add9.html) |
| Cadd2 | 1 | x 3 2 0 3 3 | X–C–E–G–D–G | 5 | open-position | [자료](https://www.guitar-chord.org/add2.html) |
| Cadd2 | 2 | x 3 0 0 1 0 | X–C–D–G–C–E | 5 | open-position | [자료](https://www.guitare-improvisation.com/img/pdf/Pleins_de_positions_d%27accords_ouverts_enrichis.pdf) |
| Cadd2 | 3 | x 3 2 0 3 0 | X–C–E–G–D–E | 5 | open-position | [자료](https://www.guitar-chord.org/add9.html) / [자료](https://www.guitare-improvisation.com/img/pdf/Pleins_de_positions_d%27accords_ouverts_enrichis.pdf) |
| Cadd2 | 4 | x x 10 9 8 10 | X–X–C–E–G–D | 4 | movable | [자료](https://www.guitar-chord.org/add9.html) |
| C#add9 | 1 | x 4 3 1 4 1 | X–C#–E#–G#–D#–E# | 5 | movable | [자료](https://www.guitar-chord.org/add9.html) |
| C#add9 | 2 | x x 11 10 9 11 | X–X–C#–E#–G#–D# | 4 | movable | [자료](https://www.guitar-chord.org/add9.html) |
| C#add2 | 1 | x 4 3 1 4 x | X–C#–E#–G#–D#–X | 5 | movable | [자료](https://www.guitar-chord.org/add2.html) |
| C#add2 | 2 | x x 11 10 9 11 | X–X–C#–E#–G#–D# | 4 | movable | [자료](https://www.guitar-chord.org/add9.html) |
| Cbadd9 | 1 | x x 9 8 7 9 | X–X–Cb–Eb–Gb–Db | 4 | movable | [자료](https://www.guitar-chord.org/add9.html) |
| Cbadd2 | 1 | x 2 4 6 4 x | X–Cb–Gb–Db–Eb–X | 5 | movable | [자료](https://www.guitar-chord.org/add2.html) |
| Cbadd2 | 2 | x x 9 8 7 9 | X–X–Cb–Eb–Gb–Db | 4 | movable | [자료](https://www.guitar-chord.org/add9.html) |
| Dbadd9 | 1 | x 4 3 1 4 1 | X–Db–F–Ab–Eb–F | 5 | movable | [자료](https://www.guitar-chord.org/add9.html) |
| Dbadd9 | 2 | x x 11 10 9 11 | X–X–Db–F–Ab–Eb | 4 | movable | [자료](https://www.guitar-chord.org/add9.html) |
| Dbadd2 | 1 | x 4 3 1 4 x | X–Db–F–Ab–Eb–X | 5 | movable | [자료](https://www.guitar-chord.org/add2.html) |
| Dbadd2 | 2 | x x 11 10 9 11 | X–X–Db–F–Ab–Eb | 4 | movable | [자료](https://www.guitar-chord.org/add9.html) |
| Dadd9 | 1 | x x 0 2 5 2 | X–X–D–A–E–F# | 4 | open-position | [자료](https://www.guitare-improvisation.com/img/pdf/Pleins_de_positions_d%27accords_ouverts_enrichis.pdf) |
| Dadd9 | 2 | x 5 4 x 5 5 | X–D–F#–X–E–A | 5 | movable | [자료](https://www.guitar-chord.org/add2.html) |
| Dadd9 | 3 | x x 12 11 10 12 | X–X–D–F#–A–E | 4 | movable | [자료](https://www.guitar-chord.org/add9.html) |
| Dadd2 | 1 | x 5 4 x 5 5 | X–D–F#–X–E–A | 5 | movable | [자료](https://www.guitar-chord.org/add2.html) |
| Dadd2 | 2 | x x 0 2 5 2 | X–X–D–A–E–F# | 4 | open-position | [자료](https://www.guitare-improvisation.com/img/pdf/Pleins_de_positions_d%27accords_ouverts_enrichis.pdf) |
| Dadd2 | 3 | x x 12 11 10 12 | X–X–D–F#–A–E | 4 | movable | [자료](https://www.guitar-chord.org/add9.html) |
| D#add9 | 1 | x 6 5 3 6 3 | X–D#–F##–A#–E#–F## | 5 | movable | [자료](https://www.guitar-chord.org/add9.html) |
| D#add9 | 2 | x x 13 12 11 13 | X–X–D#–F##–A#–E# | 4 | movable | [자료](https://www.guitar-chord.org/add9.html) |
| D#add2 | 1 | x 6 5 3 6 x | X–D#–F##–A#–E#–X | 5 | movable | [자료](https://www.guitar-chord.org/add2.html) |
| D#add2 | 2 | x x 13 12 11 13 | X–X–D#–F##–A#–E# | 4 | movable | [자료](https://www.guitar-chord.org/add9.html) |
| Ebadd9 | 1 | x 6 5 3 6 3 | X–Eb–G–Bb–F–G | 5 | movable | [자료](https://www.guitar-chord.org/add9.html) |
| Ebadd9 | 2 | x x 13 12 11 13 | X–X–Eb–G–Bb–F | 4 | movable | [자료](https://www.guitar-chord.org/add9.html) |
| Ebadd2 | 1 | x 6 5 3 6 x | X–Eb–G–Bb–F–X | 5 | movable | [자료](https://www.guitar-chord.org/add2.html) |
| Ebadd2 | 2 | x x 13 12 11 13 | X–X–Eb–G–Bb–F | 4 | movable | [자료](https://www.guitar-chord.org/add9.html) |
| Eadd9 | 1 | 0 2 2 1 0 2 | E–B–E–G#–B–F# | 6 | open-position | [자료](https://www.guitare-improvisation.com/img/pdf/Pleins_de_positions_d%27accords_ouverts_enrichis.pdf) / [자료](https://www.guitar-chord.org/add9.html) |
| Eadd9 | 2 | 0 2 4 1 0 0 | E–B–F#–G#–B–E | 6 | open-position | [자료](https://www.guitare-improvisation.com/img/pdf/Pleins_de_positions_d%27accords_ouverts_enrichis.pdf) / [자료](https://www.guitar-chord.org/add2.html) |
| Eadd9 | 3 | x x 14 13 12 14 | X–X–E–G#–B–F# | 4 | movable | [자료](https://www.guitar-chord.org/add9.html) |
| Eadd2 | 1 | 0 2 4 1 0 0 | E–B–F#–G#–B–E | 6 | open-position | [자료](https://www.guitare-improvisation.com/img/pdf/Pleins_de_positions_d%27accords_ouverts_enrichis.pdf) / [자료](https://www.guitar-chord.org/add2.html) |
| Eadd2 | 2 | 0 2 2 1 0 2 | E–B–E–G#–B–F# | 6 | open-position | [자료](https://www.guitare-improvisation.com/img/pdf/Pleins_de_positions_d%27accords_ouverts_enrichis.pdf) / [자료](https://www.guitar-chord.org/add9.html) |
| Eadd2 | 3 | x x 14 13 12 14 | X–X–E–G#–B–F# | 4 | movable | [자료](https://www.guitar-chord.org/add9.html) |
| E#add9 | 1 | x x 3 2 1 3 | X–X–E#–G##–B#–F## | 4 | movable | [자료](https://www.guitar-chord.org/add2.html) / [자료](https://www.guitar-chord.org/add9.html) |
| E#add2 | 1 | x x 3 2 1 3 | X–X–E#–G##–B#–F## | 4 | movable | [자료](https://www.guitar-chord.org/add2.html) / [자료](https://www.guitar-chord.org/add9.html) |
| Fbadd9 | 1 | 0 2 2 1 0 2 | Fb–Cb–Fb–Ab–Cb–Gb | 6 | open-position | [자료](https://www.guitare-improvisation.com/img/pdf/Pleins_de_positions_d%27accords_ouverts_enrichis.pdf) / [자료](https://www.guitar-chord.org/add9.html) |
| Fbadd9 | 2 | 0 2 4 1 0 0 | Fb–Cb–Gb–Ab–Cb–Fb | 6 | open-position | [자료](https://www.guitare-improvisation.com/img/pdf/Pleins_de_positions_d%27accords_ouverts_enrichis.pdf) / [자료](https://www.guitar-chord.org/add2.html) |
| Fbadd9 | 3 | x x 14 13 12 14 | X–X–Fb–Ab–Cb–Gb | 4 | movable | [자료](https://www.guitar-chord.org/add9.html) |
| Fbadd2 | 1 | 0 2 4 1 0 0 | Fb–Cb–Gb–Ab–Cb–Fb | 6 | open-position | [자료](https://www.guitare-improvisation.com/img/pdf/Pleins_de_positions_d%27accords_ouverts_enrichis.pdf) / [자료](https://www.guitar-chord.org/add2.html) |
| Fbadd2 | 2 | 0 2 2 1 0 2 | Fb–Cb–Fb–Ab–Cb–Gb | 6 | open-position | [자료](https://www.guitare-improvisation.com/img/pdf/Pleins_de_positions_d%27accords_ouverts_enrichis.pdf) / [자료](https://www.guitar-chord.org/add9.html) |
| Fbadd2 | 3 | x x 14 13 12 14 | X–X–Fb–Ab–Cb–Gb | 4 | movable | [자료](https://www.guitar-chord.org/add9.html) |
| Fadd9 | 1 | x x 3 2 1 3 | X–X–F–A–C–G | 4 | movable | [자료](https://www.guitar-chord.org/add2.html) / [자료](https://www.guitar-chord.org/add9.html) |
| Fadd2 | 1 | x x 3 2 1 3 | X–X–F–A–C–G | 4 | movable | [자료](https://www.guitar-chord.org/add2.html) / [자료](https://www.guitar-chord.org/add9.html) |
| F#add9 | 1 | x x 4 3 2 4 | X–X–F#–A#–C#–G# | 4 | movable | [자료](https://www.guitar-chord.org/add2.html) / [자료](https://www.guitar-chord.org/add9.html) |
| F#add2 | 1 | x x 4 3 2 4 | X–X–F#–A#–C#–G# | 4 | movable | [자료](https://www.guitar-chord.org/add2.html) / [자료](https://www.guitar-chord.org/add9.html) |
| Gbadd9 | 1 | x x 4 3 2 4 | X–X–Gb–Bb–Db–Ab | 4 | movable | [자료](https://www.guitar-chord.org/add2.html) / [자료](https://www.guitar-chord.org/add9.html) |
| Gbadd2 | 1 | x x 4 3 2 4 | X–X–Gb–Bb–Db–Ab | 4 | movable | [자료](https://www.guitar-chord.org/add2.html) / [자료](https://www.guitar-chord.org/add9.html) |
| Gadd9 | 1 | 3 2 0 2 0 3 | G–B–D–A–B–G | 6 | open-position | [자료](https://www.guitar-chord.org/add9.html) / [자료](https://www.guitar-chord.org/add2.html) |
| Gadd9 | 2 | 3 0 0 0 0 3 | G–A–D–G–B–G | 6 | open-position | [자료](https://www.guitar-chord.org/add2.html) / [자료](https://www.guitar-chord.org/add9.html) |
| Gadd9 | 3 | x x 5 4 3 5 | X–X–G–B–D–A | 4 | movable | [자료](https://www.guitar-chord.org/add9.html) |
| Gadd2 | 1 | 3 0 0 0 0 3 | G–A–D–G–B–G | 6 | open-position | [자료](https://www.guitar-chord.org/add2.html) / [자료](https://www.guitar-chord.org/add9.html) |
| Gadd2 | 2 | 3 2 0 2 0 3 | G–B–D–A–B–G | 6 | open-position | [자료](https://www.guitar-chord.org/add9.html) / [자료](https://www.guitar-chord.org/add2.html) |
| Gadd2 | 3 | x x 5 4 3 5 | X–X–G–B–D–A | 4 | movable | [자료](https://www.guitar-chord.org/add9.html) |
| G#add9 | 1 | x x 6 5 4 6 | X–X–G#–B#–D#–A# | 4 | movable | [자료](https://www.guitar-chord.org/add2.html) / [자료](https://www.guitar-chord.org/add9.html) |
| G#add2 | 1 | x x 6 5 4 6 | X–X–G#–B#–D#–A# | 4 | movable | [자료](https://www.guitar-chord.org/add2.html) / [자료](https://www.guitar-chord.org/add9.html) |
| Abadd9 | 1 | x x 6 5 4 6 | X–X–Ab–C–Eb–Bb | 4 | movable | [자료](https://www.guitar-chord.org/add2.html) / [자료](https://www.guitar-chord.org/add9.html) |
| Abadd2 | 1 | x x 6 5 4 6 | X–X–Ab–C–Eb–Bb | 4 | movable | [자료](https://www.guitar-chord.org/add2.html) / [자료](https://www.guitar-chord.org/add9.html) |
| Aadd9 | 1 | x 0 2 4 2 0 | X–A–E–B–C#–E | 5 | open-position | [자료](https://www.guitare-improvisation.com/img/pdf/Pleins_de_positions_d%27accords_ouverts_enrichis.pdf) / [자료](https://www.guitar-chord.org/add9.html) |
| Aadd9 | 2 | x x 7 6 5 7 | X–X–A–C#–E–B | 4 | movable | [자료](https://www.guitar-chord.org/add9.html) |
| Aadd2 | 1 | x 0 2 4 2 0 | X–A–E–B–C#–E | 5 | open-position | [자료](https://www.guitare-improvisation.com/img/pdf/Pleins_de_positions_d%27accords_ouverts_enrichis.pdf) / [자료](https://www.guitar-chord.org/add9.html) |
| Aadd2 | 2 | x x 7 6 5 7 | X–X–A–C#–E–B | 4 | movable | [자료](https://www.guitar-chord.org/add9.html) |
| A#add9 | 1 | x x 8 7 6 8 | X–X–A#–C##–E#–B# | 4 | movable | [자료](https://www.guitar-chord.org/add9.html) |
| A#add9 | 2 | x 1 0 3 1 1 | X–A#–C##–A#–B#–E# | 5 | open-position | [자료](https://www.guitar-chord.org/add2.html) |
| A#add2 | 1 | x 1 0 3 1 1 | X–A#–C##–A#–B#–E# | 5 | open-position | [자료](https://www.guitar-chord.org/add2.html) |
| A#add2 | 2 | x x 8 7 6 8 | X–X–A#–C##–E#–B# | 4 | movable | [자료](https://www.guitar-chord.org/add9.html) |
| Bbadd9 | 1 | x x 8 7 6 8 | X–X–Bb–D–F–C | 4 | movable | [자료](https://www.guitar-chord.org/add9.html) |
| Bbadd9 | 2 | x 1 0 3 1 1 | X–Bb–D–Bb–C–F | 5 | open-position | [자료](https://www.guitar-chord.org/add2.html) |
| Bbadd2 | 1 | x 1 0 3 1 1 | X–Bb–D–Bb–C–F | 5 | open-position | [자료](https://www.guitar-chord.org/add2.html) |
| Bbadd2 | 2 | x x 8 7 6 8 | X–X–Bb–D–F–C | 4 | movable | [자료](https://www.guitar-chord.org/add9.html) |
| Badd9 | 1 | x 2 4 6 4 2 | X–B–F#–C#–D#–F# | 5 | preserved-closed | 사용자 명시 보존 요청 / [자료](https://www.guitar-chord.org/badd9.html) |
| Badd9 | 2 | 7 9 11 8 7 7 | B–F#–C#–D#–F#–B | 6 | preserved-closed | 사용자 명시 보존 요청 / [자료](https://www.guitar-chord.org/badd9.html) |
| Badd9 | 3 | x 14 16 18 16 14 | X–B–F#–C#–D#–F# | 5 | preserved-closed | 사용자 명시 보존 요청 / [자료](https://www.guitar-chord.org/badd9.html) |
| Badd9 | 4 | 19 21 23 20 19 19 | B–F#–C#–D#–F#–B | 6 | preserved-closed | 사용자 명시 보존 요청 / [자료](https://www.guitar-chord.org/badd9.html) |
| Badd2 | 1 | x 2 4 6 4 x | X–B–F#–C#–D#–X | 5 | movable | [자료](https://www.guitar-chord.org/add2.html) |
| Badd2 | 2 | x x 9 8 7 9 | X–X–B–D#–F#–C# | 4 | movable | [자료](https://www.guitar-chord.org/add9.html) |
| B#add9 | 1 | x 3 2 0 3 0 | X–B#–D##–F##–C##–D## | 5 | open-position | [자료](https://www.guitar-chord.org/add9.html) / [자료](https://www.guitare-improvisation.com/img/pdf/Pleins_de_positions_d%27accords_ouverts_enrichis.pdf) |
| B#add9 | 2 | x 3 2 0 3 3 | X–B#–D##–F##–C##–F## | 5 | open-position | [자료](https://www.guitar-chord.org/add2.html) |
| B#add9 | 3 | x x 10 9 8 10 | X–X–B#–D##–F##–C## | 4 | movable | [자료](https://www.guitar-chord.org/add9.html) |
| B#add2 | 1 | x 3 2 0 3 3 | X–B#–D##–F##–C##–F## | 5 | open-position | [자료](https://www.guitar-chord.org/add2.html) |
| B#add2 | 2 | x 3 0 0 1 0 | X–B#–C##–F##–B#–D## | 5 | open-position | [자료](https://www.guitare-improvisation.com/img/pdf/Pleins_de_positions_d%27accords_ouverts_enrichis.pdf) |
| B#add2 | 3 | x 3 2 0 3 0 | X–B#–D##–F##–C##–D## | 5 | open-position | [자료](https://www.guitar-chord.org/add9.html) / [자료](https://www.guitare-improvisation.com/img/pdf/Pleins_de_positions_d%27accords_ouverts_enrichis.pdf) |
| B#add2 | 4 | x x 10 9 8 10 | X–X–B#–D##–F##–C## | 4 | movable | [자료](https://www.guitar-chord.org/add9.html) |

## 표기와 보호 범위

add2는 이론 1–2–3–5, add9는 1–3–5–9이며 pitch class는 같다. 실제 음역은 stringNotes의 pitch로 따로 관리한다. A/F/F#/Ab 등 자료에서 같은 운지를 두 표기에 사용하는 경우 공유한다. 다른 운지를 억지로 만들지 않으며 C/D/E/G의 배열과 순서는 구분했다. Cadd2 x30010은 교육 출처가 있는 2구간 대안으로 남겼다.

Badd9은 명시적 보존 요청에 따라 과거 전체 출력 스냅샷을 사용한다. 이는 기존 출력 보존이며 각 과거 고포지션을 새로 검증/승인했다는 뜻은 아니다. Badd9의 기존 Eb 화면 라벨도 이번에 변경하지 않았고 위 표는 화성 문맥의 실제음 D#로 기록했다. Badd2 x2464x 역시 자료에는 있으나 넓은 운지이므로 초급자에게 쉽다고 단정하지 않는다.

원형 자료의 오류도 검산했다. add9 자료의 Ab XX7657은 실제 A이므로 사용하지 않고, 올바른 Ab XX6546(별도 add2 자료 및 검증된 이동형)을 사용한다. sus2처럼 3도가 없는 형태는 이번 데이터에 포함하지 않았다.

## 회귀 및 테스트

보호 대상 373개 root/type 조합의 chord와 모든 positions를 작업 전 JSON과 deepEqual 확인했다. C, Cm, C7, Cmaj7, Cm7, C#m7b5, Cdim7, Badd9 모두 동일하다. 신규 고정 데이터는 12음고 및 Cb/Fb/E#/B#를 포함한 21개 표기에 대해 모든 위치의 음·필수음·X/O·손가락·바레를 검증했다. generator를 예외 발생 함수로 바꿔도 고정 데이터의 순서와 출력이 유지되는 테스트를 통과했다.

- 명령: node --test tests/fixed-add-voicings.test.mjs tests/additional-chords.test.mjs (9 통과)
- 명령: npm run build (통과; 기존 대형 chunk 안내 존재)
- 실제 사람이 연주하는 실기 세션을 새로 수행한 것은 아니다. 연주 자료의 shape를 선정하고 정적 운지/음 검산으로 확인했다.
- 배포하지 않았다.
