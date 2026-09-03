import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { getChordFretWindow } from "../src/fretboard/chordFretWindow.js";
import { createRecommendedAccompanimentPatterns } from "../src/rhythm/recommendedProgressions.js";
import {
  VOICING_MOVEMENT_COURSES,
  createVoicingFretboard,
  normalizeVoicingStrings,
} from "../src/rhythm/voicingMovementCourses.js";

const appSource = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
const fretboardSource = await readFile(new URL("../src/components/Fretboard.jsx", import.meta.url), "utf8");
const appCss = await readFile(new URL("../src/style.css", import.meta.url), "utf8");
const courseSource = await readFile(new URL("../src/rhythm/voicingMovementCourses.js", import.meta.url), "utf8");

function getSlotFretRange(slot) {
  return [...getChordFretWindow(createVoicingFretboard(slot)).fretRange];
}

test("voicing movement is a separate immutable practice library", () => {
  assert.equal(VOICING_MOVEMENT_COURSES.length, 15);
  assert.deepEqual([...new Set(VOICING_MOVEMENT_COURSES.map((course) => course.courseNumber))], ["01", "02", "03", "04", "05"]);
  ["01", "02", "03", "04", "05"].forEach((courseNumber) => {
    assert.equal(VOICING_MOVEMENT_COURSES.filter((course) => course.courseNumber === courseNumber).length, 3);
  });
  assert.ok(VOICING_MOVEMENT_COURSES.every((course) => course.category === "voicing-movement"));
  assert.ok(VOICING_MOVEMENT_COURSES.every((course) => course.slots.length >= 3));
  assert.equal(Object.isFrozen(VOICING_MOVEMENT_COURSES), true);
  assert.equal(Object.isFrozen(VOICING_MOVEMENT_COURSES[0].slots), true);
});

test("course 01 retains the authored six-chord voicings and learning metadata", () => {
  const course = VOICING_MOVEMENT_COURSES[0];
  assert.equal(course.courseNumber, "01");
  assert.equal(course.title, "7th 순환 하이코드");
  assert.equal(course.description, "7프렛에서 시작해 5프렛, 3프렛으로 내려오며 6번줄/5번줄 Root가 보이는 7th 바레코드 전환과 ii-V-I 해결을 익히는 코스");
  assert.equal(course.practiceSummary, "오픈코드 대신 하이코드로 잡고, 7→5→3프렛을 따라 이동해 보세요.");
  assert.equal(course.bpm, 58);
  assert.equal(course.timeSignature, "4/4");
  assert.equal(course.accompanimentName, "Soft Jazz Guide");
  assert.equal(course.repeatMode, "full-loop");
  assert.equal(course.tempoAdvanceCondition, "success");
  assert.deepEqual(course.tempoStages, [58, 66, 74, 82]);
  assert.equal(course.rootlessAllowed, false);
  assert.equal(course.rootRequiredOnFretboard, true);
  assert.deepEqual(course.twoBeatExtension, {
    unlockAfterStableBpm: 82,
    beatsPerChord: 2,
    progression: ["Bm7", "Em7", "Am7", "Dm7", "G7", "Cmaj7"],
  });
  assert.deepEqual(course.loopLength, { beats: 24, measures: 6 });
  assert.deepEqual(course.slots.map(({ chord, beats }) => [chord, beats]), [
    ["Bm7", 4], ["Em7", 4], ["Am7", 4], ["Dm7", 4], ["G7", 4], ["Cmaj7", 4],
  ]);
  assert.deepEqual(course.slots.map((slot) => slot.strings), [
    ["7", "9", "7", "7", "7", "7"],
    ["x", "7", "9", "7", "8", "7"],
    ["5", "7", "5", "5", "5", "5"],
    ["x", "5", "7", "5", "6", "5"],
    ["3", "5", "3", "4", "3", "3"],
    ["x", "3", "5", "4", "5", "3"],
  ]);
  assert.deepEqual(course.slots.map((slot) => slot.soundingNotes), [
    ["B", "F#", "A", "D", "F#", "B"],
    ["E", "B", "D", "G", "B"],
    ["A", "E", "G", "C", "E", "A"],
    ["D", "A", "C", "F", "A"],
    ["G", "D", "F", "B", "D", "G"],
    ["C", "G", "B", "E", "G"],
  ]);
  assert.deepEqual(course.slots.map((slot) => slot.rootProvidedByBass), [false, false, false, false, false, false]);
  assert.deepEqual(course.slots.map((slot) => slot.uiLabel), [
    "Bm7 · 6번줄 Root · 7프렛 E폼 m7",
    "Em7 · 5번줄 Root · 7프렛 A폼 m7",
    "Am7 · 6번줄 Root · 5프렛 E폼 m7",
    "Dm7 · 5번줄 Root · 5프렛 A폼 m7",
    "G7 · 6번줄 Root · 3프렛 E폼 7",
    "Cmaj7 · 5번줄 Root · 3프렛 A폼 maj7",
  ]);
  assert.deepEqual(course.slots.map((slot) => slot.rootPositions.map(({ stringNumber, fretNumber }) => [stringNumber, fretNumber])), [
    [[6, 7], [1, 7]], [[5, 7]], [[6, 5], [1, 5]], [[5, 5]], [[6, 3], [1, 3]], [[5, 3]],
  ]);
  assert.ok(course.slots.every((slot) => slot.features.length === 3));
  assert.equal(course.learningPoints.length, 4);
  assert.ok(VOICING_MOVEMENT_COURSES.flatMap((course) => course.slots).some((slot) => slot.rootProvidedByBass));
  assert.ok(VOICING_MOVEMENT_COURSES.flatMap((course) => course.slots).every((slot) => (
    slot.strings.length === 6
    && slot.strings.every((value) => value === "x" || /^\d+$/.test(value))
    && slot.positionLabel
    && slot.transitionHint
    && slot.voicingType
  )));
});

test("course 02-A keeps the expanded D-key resolution voicings", () => {
  const course = VOICING_MOVEMENT_COURSES[1];
  assert.equal(course.courseNumber, "02");
  assert.equal(course.title, "D키 7th 해결 이동");
  assert.equal(course.description, "6번줄과 5번줄 Root형을 바꾸며 Dmaj7에 해결하는 연습");
  assert.equal(course.practiceSummary, "하이코드로 3→5→7프렛을 이동하며 Dmaj7에 도착");
  assert.equal(course.key, "D");
  assert.equal(course.bpm, 62);
  assert.equal(course.timeSignature, "4/4");
  assert.equal(course.accompanimentName, "Soft 7th Guide");
  assert.equal(course.difficulty, "초중급");
  assert.equal(course.repeatMode, "full-loop");
  assert.equal(course.rootlessAllowed, false);
  assert.equal(course.rootRequiredOnFretboard, true);
  assert.equal(course.twoBeatExtension, undefined);
  assert.deepEqual(course.loopLength, { beats: 28, measures: 7 });
  assert.deepEqual(course.slots.map(({ chord, beats }) => [chord, beats]), [
    ["Gmaj7", 4], ["A7", 4], ["Dmaj7", 4], ["Bm7", 4],
    ["Em7", 4], ["A7", 4], ["Dmaj7", 4],
  ]);
  assert.deepEqual(course.slots.map((slot) => slot.strings), [
    ["3", "5", "4", "4", "3", "3"],
    ["5", "7", "5", "6", "5", "5"],
    ["x", "5", "7", "6", "7", "5"],
    ["7", "9", "7", "7", "7", "7"],
    ["x", "7", "9", "7", "8", "7"],
    ["5", "7", "5", "6", "5", "5"],
    ["x", "5", "7", "6", "7", "5"],
  ]);
  assert.deepEqual(
    course.slots.map(getSlotFretRange),
    [[2, 6], [4, 8], [4, 8], [6, 10], [6, 10], [4, 8], [4, 8]],
  );
});

test("courses 02 through 05 contain the complete three-pattern expansion package", () => {
  const expected = [
    ["02", "D키 7th 해결 이동", 62, ["Gmaj7:4", "A7:4", "Dmaj7:4", "Bm7:4", "Em7:4", "A7:4", "Dmaj7:4"]],
    ["02", "A키 maj7 Root 교차", 58, ["Amaj7:4", "Dmaj7:4", "Emaj7:4", "Amaj7:4"]],
    ["02", "D키 더블스텝 해결", 54, ["Bm7:2", "Em7:2", "A7:2", "Dmaj7:2", "Bm7:2", "Em7:2", "A7:2", "Dmaj7:2"]],
    ["03", "D폼 반음 왕복", 56, ["Dmaj7:4", "Emaj7:4", "Fmaj7:4", "Emaj7:4", "Dmaj7:4"]],
    ["03", "D폼 2프렛 이동", 60, ["Fmaj7:4", "Gmaj7:4", "Amaj7:4", "Gmaj7:4", "Fmaj7:4"]],
    ["03", "D폼 넓은 지판 왕복", 52, ["Fmaj7:2", "Gmaj7:2", "Amaj7:4", "Gmaj7:2", "Fmaj7:2", "Emaj7:2", "Dmaj7:2"]],
    ["04", "G키 팝록 바레", 68, ["G:4", "D:4", "Em:4", "C:4"]],
    ["04", "G키 바레 더블스텝", 56, ["G:2", "D:2", "Em:2", "C:2", "G:2", "D:2", "Em:2", "C:2"]],
    ["04", "C키 1625 하이 바레", 62, ["C:4", "Am:4", "F:4", "G:4"]],
    ["05", "m7♭5 기본 해결", 54, ["Bm7♭5:4", "E7:4", "Am7:4"]],
    ["05", "m7♭5 더블스텝", 50, ["Bm7♭5:2", "E7:2", "Am7:4", "Bm7♭5:2", "E7:2", "Am7:4"]],
    ["05", "m7♭5 순환 확장", 52, ["Bm7♭5:2", "E7:2", "Am7:2", "Dm7:2", "G7:2", "Cmaj7:2"]],
  ];
  const expanded = VOICING_MOVEMENT_COURSES.filter((course) => Number(course.courseNumber) >= 2);
  assert.deepEqual(expanded.map((course) => [
    course.courseNumber,
    course.title,
    course.bpm,
    course.slots.map((slot) => `${slot.chord}:${slot.beats}`),
  ]), expected);
  assert.ok(expanded.every((course) => course.repeatMode === "full-loop" && course.timeSignature === "4/4"));

  const minorCourses = expanded.filter((course) => course.courseNumber === "05");
  minorCourses.forEach((course) => {
    const e7 = course.slots.find((slot) => slot.chord === "E7");
    assert.deepEqual(e7.strings, ["x", "7", "9", "7", "9", "7"]);
    assert.deepEqual(e7.rootPositions.map(({ stringNumber, fretNumber }) => [stringNumber, fretNumber]), [[5, 7]]);
  });
});

test("sixth-to-first string arrays compile to exact playable and muted string states", () => {
  assert.deepEqual(normalizeVoicingStrings(["X", 5, 7, 5, 6, 5]), ["x", "5", "7", "5", "6", "5"]);
  const fretboard = createVoicingFretboard(VOICING_MOVEMENT_COURSES[0].slots[0]);
  assert.equal(fretboard.stringStates[6], undefined);
  assert.equal(fretboard.stringStates[5], undefined);
  assert.deepEqual(
    fretboard.notes.map(({ stringNumber, fretNumber }) => [stringNumber, fretNumber]),
    [[6, 7], [5, 9], [4, 7], [3, 7], [2, 7], [1, 7]],
  );
  assert.equal("visibleFrets" in fretboard, false);
});

test("course 01 frames each played range with one fret on either side", () => {
  const course = VOICING_MOVEMENT_COURSES[0];
  assert.deepEqual(
    course.slots.map(getSlotFretRange),
    [[6, 10], [6, 10], [4, 8], [4, 8], [2, 6], [2, 6]],
  );
});

test("course data never stores a fixed fret window", () => {
  VOICING_MOVEMENT_COURSES.forEach((course) => {
    assert.equal("fretRange" in course, false);
    assert.equal("frameRange" in course, false);
    course.slots.forEach((slot) => {
      assert.equal("fretRange" in slot, false);
      assert.equal("frameRange" in slot, false);
      assert.equal("visibleFrets" in slot, false);
      assert.equal("visibleFrets" in createVoicingFretboard(slot), false);
    });
  });
  assert.doesNotMatch(courseSource, /getVoicingCourseFretRange|courseFretRange|frameRange|visibleFrets|프렛 창/);
});

test("fixed course accompaniment gives every chord a Root bass event", () => {
  VOICING_MOVEMENT_COURSES.forEach((course) => {
    assert.ok(course.bassPreset.bars.every((bar) => bar[0]?.step === 0 && bar[0]?.role === "R"));
    const patterns = createRecommendedAccompanimentPatterns(course);
    assert.ok(patterns.bass.barSteps.every((bar) => bar[0] === "root"));
    assert.ok(patterns.bass.displayName.includes("Bass"));
  });
});

test("course 01 compiles the exact Soft Jazz Guide custom backing", () => {
  const course = VOICING_MOVEMENT_COURSES[0];
  const patterns = createRecommendedAccompanimentPatterns(course);
  assert.equal(patterns.drum.barSteps.length, 6);
  assert.deepEqual(
    patterns.drum.barSteps[0].kick.map((active, index) => active ? index : null).filter((index) => index != null),
    [0, 8],
  );
  assert.deepEqual(
    patterns.drum.barSteps[0].rim.map((active, index) => active ? index : null).filter((index) => index != null),
    [4, 12],
  );
  assert.deepEqual(
    patterns.drum.barSteps[0].shaker.map((active, index) => active ? index : null).filter((index) => index != null),
    [0, 2, 4, 6, 8, 10, 12, 14],
  );
  assert.equal(patterns.drum.barSteps[5].kick.some(Boolean), false);
  assert.equal(patterns.drum.barSteps[5].rim.some(Boolean), false);
  assert.deepEqual(
    patterns.drum.barSteps[5].shaker.map((active, index) => active ? index : null).filter((index) => index != null),
    [0, 2, 4, 6, 8, 10, 12, 14],
  );
  assert.deepEqual(patterns.drum.instrumentLevels, { kick: 0.62, rim: 0.62, shaker: 0.32 });
  assert.deepEqual(
    patterns.bass.barSteps[0].map((role, index) => role !== "rest" ? [index, role] : null).filter(Boolean),
    [[0, "root"], [8, "fifth"], [12, "nextRoot"]],
  );
  assert.equal(patterns.bass.barSteps[0][15], "rest");
  assert.equal(patterns.piano.level, 0.34);
  assert.equal(patterns.piano.voicing, "thirdSeventh");
  assert.deepEqual(
    patterns.piano.barSteps[0].map((step, index) => step.active ? [index, step.style, step.level ?? 1] : null).filter(Boolean),
    [[0, "stab", 1], [6, "stab", 0.52], [8, "stab", 1]],
  );
  assert.equal(patterns.piano.barSteps[0][14].active, false);
});

test("voicing courses own the first dropdown while load separates recommendations and user progressions", () => {
  const pickerStart = appSource.indexOf('className="stage3LoadSelect stage3RecommendedLoadSelect stage3VoicingCourseSelect"');
  const pickerEnd = appSource.indexOf('className="stage3LoadSelect stage3UserLoadSelect stage3RecommendedLoadSelect"', pickerStart);
  const pickerSource = appSource.slice(pickerStart, pickerEnd);
  const loadEnd = appSource.indexOf('className="stage3StorageMoveButton"', pickerEnd);
  const loadSource = appSource.slice(pickerEnd, loadEnd);
  assert.ok(pickerStart >= 0 && pickerEnd > pickerStart);
  assert.ok(loadEnd > pickerEnd);
  assert.match(appSource, /ariaLabel="보이싱 이동 학습 코스"[\s\S]*?className="stage3LoadSelect stage3RecommendedLoadSelect stage3VoicingCourseSelect"/);
  assert.match(pickerSource, /label="보이싱 이동 학습"/);
  assert.match(pickerSource, /stage3VoicingMovementSlots\.map/);
  assert.match(pickerSource, /label: `코스 \$\{courseNumber\}`/);
  assert.match(pickerSource, /showCount: false/);
  assert.doesNotMatch(pickerSource, /count: stage3VoicingMovementSlots\.filter/);
  assert.match(pickerSource, /tabId: item\.courseNumber/);
  assert.match(pickerSource, /label: item\.title/);
  assert.doesNotMatch(pickerSource, /코스 \$\{item\.courseNumber.*item\.title/);
  assert.match(pickerSource, /optionTabs=\{Array\.from\(new Set\(stage3VoicingMovementSlots\.map/);
  assert.match(pickerSource, /optionTabsLabel="코스 선택"/);
  assert.match(pickerSource, /optionListLabel="연습 진행"/);
  assert.doesNotMatch(pickerSource, /optionGroups|stage3RecommendedSlots\.map/);
  assert.match(appSource, /ariaLabel="추천 진행 및 사용자 진행 선택"[\s\S]*?className="stage3LoadSelect stage3UserLoadSelect stage3RecommendedLoadSelect"/);
  assert.match(loadSource, /label="진행 선택"/);
  assert.match(loadSource, /stage3RecommendedSlots\.map/);
  assert.match(loadSource, /stage3QuickSlots\.map/);
  assert.match(loadSource, /optionTabs=\{\[/);
  assert.match(loadSource, /label: "추천 진행"/);
  assert.match(loadSource, /label: "사용자 진행"/);
  assert.match(loadSource, /optionTabsLabel="보관함 선택"/);
  assert.match(loadSource, /optionListLabel="진행 목록"/);
  assert.match(appSource, /className="metronomeSelectOptionTabs stage3RecommendationTabs"/);
  assert.match(appSource, /selectedOption \? "metronomeSelectControl--current" : ""/);
  assert.match(appSource, /aria-current=\{selectedOption \? "true" : undefined\}/);
  assert.match(appSource, /className="metronomeSelectSectionLabel metronomeSelectTabsLabel"/);
  assert.match(appSource, /className="metronomeSelectSectionLabel metronomeSelectListLabel"/);
  assert.doesNotMatch(appSource, /showOptionAction|className=\{`metronomeSelectOptionAction/);
  assert.match(appCss, /\.metronomeSelectPortal\.stage3RecommendedLoadSelect \.stage3RecommendationTabs/);
  assert.match(appCss, /\.stage3RecommendationTabs \{[\s\S]*?display: flex;/);
  assert.match(appCss, /\.stage3RecommendationTabs > button \{[\s\S]*?border-radius: 8px 8px 0 0;/);
  assert.match(appCss, /\.stage3RecommendationTabs small::before \{[\s\S]*?content: "·";/);
  assert.match(appCss, /stage3RecommendedLoadSelect:not\(\.miniChordLoadSelect\) \.stage3RecommendationTabs \{[\s\S]*?border-bottom: 1px solid[\s\S]*?background: transparent;[\s\S]*?box-shadow: none;/);
  assert.match(appCss, /stage3RecommendedLoadSelect:not\(\.miniChordLoadSelect\)[\s\S]*?\.stage3RecommendationTabs > button \{[\s\S]*?margin-bottom: 0;[\s\S]*?border-radius: 7px;/);
  assert.match(appCss, /stage3RecommendedLoadSelect:not\(\.miniChordLoadSelect\) \.metronomeSelectOption \{[\s\S]*?border: 1px solid[\s\S]*?cursor: pointer;/);
  assert.match(appCss, /\.metronomeSelectOption::after \{[\s\S]*?display: none !important;[\s\S]*?content: none !important;/);
  assert.match(appCss, /\.stage3VoicingCourseSelect > \.metronomeSelectMenu \{[\s\S]*?height: 280px !important;[\s\S]*?max-height: min\(280px/);
  assert.match(appCss, /\.stage3UserLoadSelect:not\(\.miniChordLoadSelect\) > \.metronomeSelectMenu \{[\s\S]*?height: 280px !important;[\s\S]*?max-height: min\(280px/);
  assert.match(appSource, /tab\.showCount === false \? null/);
  assert.match(appSource, /if \(menuRef\.current\) menuRef\.current\.scrollTop = 0/);
  assert.match(appCss, /\.stage3RecommendationTabs \{[\s\S]*?min-height: 44px;[\s\S]*?height: 44px;/);
  assert.match(appCss, /Voicing course index: compact two-column tabs with no horizontal swipe/);
  assert.match(appCss, /\.stage3VoicingCourseSelect \.stage3RecommendationTabs \{[\s\S]*?display: grid;[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);[\s\S]*?grid-auto-flow: row;[\s\S]*?overflow-x: hidden;/);
  assert.match(appCss, /\.stage3RecommendedLoadSelect\.stage3VoicingCourseSelect:not\(\.miniChordLoadSelect\)[\s\S]*?\.stage3RecommendationTabs > button,[\s\S]*?min-height: 24px !important;[\s\S]*?border-radius: 3px;[\s\S]*?font-size: 8px !important;/);
  assert.match(appCss, /stage3LoadSelect\.metronomeSelectControl--current > \.metronomeSelectButton \{[\s\S]*?inset 2px 0 0/);
});

test("voicing courses keep accompaniment editable while operator recommendations stay fixed", () => {
  assert.match(appSource, /recommendedAccompaniment: libraryCategory === "recommended"/);
  assert.match(appSource, /const stage3RecommendedAccompanimentLocked = appMode === APP_MODES\.PRACTICE[\s\S]*?isStage3RecommendedItem\(loadedStage3LibraryItem\)/);
  assert.doesNotMatch(appSource, /stage3RecommendedAccompanimentLocked[\s\S]{0,140}isStage3BuiltInItem/);
  const courseBuilderStart = appSource.indexOf("function getStage3VoicingMovementSlots");
  const courseBuilderEnd = appSource.indexOf("function normalizeGlobalAccompanimentSettings", courseBuilderStart);
  assert.doesNotMatch(appSource.slice(courseBuilderStart, courseBuilderEnd), /recommendedAccompaniment:/);
  assert.match(appSource, /lockedLabel="추천 진행"/);
});

test("runtime preserves authored voicings, Root markers, and muted strings", () => {
  assert.match(appSource, /fretboard: createVoicingFretboard\(slot\)/);
  assert.doesNotMatch(appSource, /createVoicingFretboard\(slot, course\.fretRange\)/);
  assert.match(appSource, /rootProvidedByBass: Boolean/);
  assert.match(appSource, /transitionHint: typeof entry/);
  assert.match(appSource, /soundingNotes: typeof entry/);
  assert.match(appSource, /features: typeof entry/);
  assert.match(appSource, /rootPositions: typeof entry/);
  assert.match(appSource, /rootNote=\{isStage3VoicingMovementItem\(loadedStage3LibraryItem\) \? chordPracticeCurrent\.root : ""\}/);
  assert.match(appSource, /chordPracticeCurrent\.uiLabel \|\| chordPracticeCurrent\.positionLabel/);
  assert.match(appSource, /voicing === "thirdSeventh"/);
  assert.match(appSource, /degreeOffset === 2 \|\| degreeOffset === 6/);
  assert.match(fretboardSource, /fretboardStringRow \$\{String\(stringState\).*=== "x" \? "muted"/s);
  assert.match(appCss, /\.stageChordSharedFretboard \.fretboardStringRow\.muted > i/);
});

test("voicing course footer stays at two concise practice lines", () => {
  const guideStart = appSource.indexOf('className="stage3VoicingMovementGuide"');
  const guideConditionStart = appSource.lastIndexOf("{!(isMobileLayout && landscapePlayFocus)", guideStart);
  const guideEnd = appSource.indexOf("{isMobileLayout && !hasChordTransitionProgression", guideStart);
  const guideSource = appSource.slice(guideStart, guideEnd);

  assert.ok(guideConditionStart >= 0 && guideStart > guideConditionStart && guideEnd > guideStart);
  assert.match(appSource.slice(guideConditionStart, guideStart), /!\(isMobileLayout && landscapePlayFocus\)/);
  assert.match(guideSource, /<strong>\{chordPracticeCurrent\.uiLabel \|\| chordPracticeCurrent\.positionLabel\}<\/strong>/);
  assert.match(guideSource, /loadedStage3LibraryItem\?\.practiceSummary \|\| loadedStage3LibraryItem\?\.description/);
  assert.doesNotMatch(guideSource, /transitionHint|soundingNotes|tempoStages|twoBeatExtension/);
  assert.doesNotMatch(guideSource, /Root는 베이스 담당|구성음|뮤트하고 연주|ii-V-I/);
});
