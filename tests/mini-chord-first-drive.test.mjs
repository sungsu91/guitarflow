import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getMiniChordRecommendedProgressions } from "../src/mini-chord/originalPracticeSongs.js";
import { shouldAddMiniChordExplicitSlotFallback } from "../src/mini-chord/playbackDynamics.js";

const appSource = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const styleSource = readFileSync(new URL("../src/style.css", import.meta.url), "utf8");

const [firstDrive] = getMiniChordRecommendedProgressions();
const bars = Array.from({ length: firstDrive.barCount }, (_, barIndex) => (
  firstDrive.slots.slice(barIndex * 4, barIndex * 4 + 4).filter(Boolean).join(">")
));

test("first drive is a built-in 64-bar G major recommended progression", () => {
  assert.equal(firstDrive.id, "fretiva-original-first-drive");
  assert.equal(firstDrive.title, "첫 번째 드라이브");
  assert.equal(firstDrive.description, "오픈 코드 전환과 구간별 밴드 편곡을 함께 익히는 64마디 어쿠스틱 팝 연습곡");
  assert.equal(firstDrive.libraryType, "recommended-progression");
  assert.equal(firstDrive.builtIn, true);
  assert.equal(firstDrive.key, "G Major");
  assert.equal(firstDrive.difficulty, "초급 ~ 초중급");
  assert.equal(firstDrive.timeSignature, "4/4");
  assert.equal(firstDrive.bpm, 96);
  assert.equal(firstDrive.barCount, 64);
  assert.equal(firstDrive.slots.length, 256);
  assert.equal(firstDrive.loop, true);
});

test("first drive keeps the requested chord at every bar and every half-bar change", () => {
  assert.deepEqual(bars, [
    "G", "D", "Em", "C", "G", "D", "Em", "C",
    "G", "D", "Em", "C", "G", "D", "C", "D",
    "G", "D", "Em", "C", "Am>D", "G>D", "Em", "C>D",
    "Em", "C", "G", "D", "Em>C", "G>D", "Am>Bm", "C>D",
    "G", "D", "Em", "C", "G", "D", "C>D", "G",
    "G", "D", "Em", "C", "G>D", "Em>C", "Am>D", "C>D",
    "Em", "C", "G", "D", "Em", "C", "Am>D", "D",
    "G", "D", "Em", "C", "G>D", "Em>C", "Am>D", "G",
  ]);
});

test("first drive uses range overrides while exposing only the requested section labels", () => {
  assert.deepEqual(
    firstDrive.arrangementOverrides.map(({ startBar, endBar, sectionName, patternId }) => [
      startBar + 1,
      endBar + 1,
      sectionName,
      patternId,
    ]),
    [
      [1, 4, "Intro", "first-drive-intro-minimal"],
      [5, 8, "Intro 상승", "first-drive-intro-build"],
      [9, 16, "Verse 1", "first-drive-verse-pop-8"],
      [17, 24, "Verse 2", "first-drive-verse-lift"],
      [25, 32, "Pre-Chorus", "first-drive-pre-build"],
      [33, 40, "Chorus", "first-drive-chorus-pop-16"],
      [41, 48, "Chorus 확장", "first-drive-chorus-sustain"],
      [49, 56, "Bridge", "first-drive-bridge-half-time"],
      [57, 63, "Final Chorus", "first-drive-final-full"],
      [64, 64, "Ending", "first-drive-final-full"],
    ],
  );
  assert.deepEqual(
    firstDrive.arrangementOverrides
      .filter((section) => section.showSectionLabel !== false)
      .map((section) => [section.startBar + 1, section.sectionName]),
    [
      [1, "Intro"],
      [9, "Verse 1"],
      [17, "Verse 2"],
      [25, "Pre-Chorus"],
      [33, "Chorus"],
      [41, "Chorus 확장"],
      [49, "Bridge"],
      [57, "Final Chorus"],
      [64, "Ending"],
    ],
  );
});

test("all section presets carry complete editable 16-step drum, bass and piano bars", () => {
  assert.equal(firstDrive.arrangementPatterns.length, 9);
  const allowedBassRoles = new Set(["rest", "root", "hold", "third", "fifth", "octave", "approach"]);
  const allowedPianoActions = new Set(["chord", "hold", "stab", "arpUp", "arpDown"]);

  firstDrive.arrangementPatterns.forEach((pattern) => {
    const { drum, bass, piano } = pattern.rhythmOverrides;
    assert.equal(pattern.rhythmPattern, "custom");
    assert.equal(pattern.bassBeat, "custom");
    assert.equal(pattern.pianoBeat, "custom");
    assert.equal(piano.voicing, "guideTones");
    assert.ok(drum.level >= 0.2 && drum.level <= 1.2);
    assert.ok(bass.level >= 0.2 && bass.level <= 1.2);
    assert.ok(piano.level >= 0.2 && piano.level <= 1.2);
    assert.ok(drum.barSteps.length > 0);
    assert.equal(drum.barSteps.length, bass.barSteps.length);
    assert.equal(bass.barSteps.length, piano.barSteps.length);

    drum.barSteps.forEach((bar) => {
      ["kick", "snare", "rim", "closedHat", "shaker", "crash"].forEach((part) => {
        assert.equal(bar[part].length, 16);
        assert.ok(bar[part].every((step) => typeof step === "boolean"));
      });
    });
    bass.barSteps.forEach((bar) => {
      assert.equal(bar.length, 16);
      assert.ok(bar.every((step) => allowedBassRoles.has(step)));
    });
    piano.barSteps.forEach((bar) => {
      assert.equal(bar.length, 16);
      assert.ok(bar.every((step) => typeof step.active === "boolean"));
      assert.ok(bar.filter((step) => step.active).every((step) => allowedPianoActions.has(step.style)));
    });
  });
});

test("the arrangement has an audible energy arc and a clean final G hold", () => {
  const patternById = new Map(firstDrive.arrangementPatterns.map((pattern) => [pattern.id, pattern]));
  const intro = patternById.get("first-drive-intro-minimal").rhythmOverrides;
  const chorus = patternById.get("first-drive-chorus-pop-16").rhythmOverrides;
  const bridge = patternById.get("first-drive-bridge-half-time").rhythmOverrides;
  const final = patternById.get("first-drive-final-full").rhythmOverrides;

  assert.ok(intro.drum.level < chorus.drum.level);
  assert.ok(bridge.drum.level < chorus.drum.level);
  assert.ok(bridge.piano.level < chorus.piano.level);
  assert.ok(final.drum.level > chorus.drum.level);

  const finalDrumBar = final.drum.barSteps.at(-1);
  assert.deepEqual(finalDrumBar.kick.map((active, index) => active ? index : -1).filter((index) => index >= 0), [0]);
  assert.deepEqual(finalDrumBar.snare.map((active, index) => active ? index : -1).filter((index) => index >= 0), [0]);
  assert.deepEqual(finalDrumBar.crash.map((active, index) => active ? index : -1).filter((index) => index >= 0), [0]);
  assert.deepEqual(final.bass.barSteps.at(-1), ["root", ...Array.from({ length: 15 }, () => "hold")]);
  assert.deepEqual(final.piano.barSteps.at(-1)[0], { active: true, style: "hold", durationSteps: 16 });
  assert.deepEqual(final.piano.barSteps.at(-1)[8], { active: true, style: "chord", durationSteps: 7 });
});

test("the load control separates recommendations and saved chords inside one compact menu", () => {
  assert.match(appSource, /className="miniChordLoadSelect stage3RecommendedLoadSelect stage3UserLoadSelect"/);
  assert.match(appSource, /optionTabs=\{miniChordLoadLibrary\.optionTabs\}/);
  assert.match(appSource, /options=\{miniChordLoadLibrary\.options\}/);
  assert.match(appSource, /managedListMode/);
  assert.match(appSource, /triggerLabel="불러오기"/);
  assert.match(appSource, /onChange=\{loadSelectedMiniChordArrangement\}/);
  assert.match(appSource, /onDeleteSelectedOptions/);
  assert.match(appSource, /items\.filter\(\(item\) => item\.builtIn \|\| !selectedIds\.includes\(item\.id\)\)/);
  assert.doesNotMatch(appSource, /function MiniChordLoadDialog/);
  assert.doesNotMatch(appSource, /\.map\(getMiniChordSlotDisplayLabel\)/);
  assert.match(styleSource, /\.metronomeSelectPortal\.miniChordLoadSelect/);
  assert.match(styleSource, /contain: layout paint/);
});

test("custom playback honors per-section dynamics, held notes and chord boundaries", () => {
  assert.match(appSource, /customDrumPattern\.level/);
  assert.match(appSource, /customBassPattern\.level/);
  assert.match(appSource, /customPianoPattern\.level/);
  assert.match(appSource, /getMiniChordBassHeldStepCount/);
  assert.match(appSource, /step\.durationSteps/);
  assert.match(appSource, /miniChordSlotHasExplicitChord/);
  assert.match(appSource, /miniChordBarIndex/);
  assert.match(appSource, /getBackingPianoGuideToneVoicing/);
});

test("a loaded mini chord recommendation locks its built-in structure and accompaniment", () => {
  assert.match(appSource, /const miniChordRecommendedAccompanimentLocked = appMode === APP_MODES\.MINI_CHORD_MAKER/);
  assert.match(appSource, /setMiniChordRecommendedProgressionId\(isRecommendedProgression \? next\.id : ""\)/);
  assert.match(appSource, /disabled=\{miniChordEditLocked \|\| miniChordRecommendedAccompanimentLocked\}/);
  assert.match(appSource, /const miniChordStructureLocked = miniChordEditLocked \|\| miniChordRecommendedAccompanimentLocked;/);
  assert.match(appSource, /const miniChordArrangementEditLocked = miniChordStructureLocked;/);
  assert.match(appSource, /if \(miniChordStructureLocked\) return;/);
  assert.match(appSource, /추천 기본팩 잠금 · 편집하려면 저장해 사본을 만드세요/);
  assert.match(appSource, /disabled=\{miniChordStructureLocked\}/);
  assert.match(appSource, /libraryType: miniChordRecommendedProgressionId \? "recommended-progression" : "user"/);
});

test("bar controls keep the familiar presets, add inline input and place history below", () => {
  const measureStripIndex = appSource.indexOf('<div className="miniChordMeasureStrip"');
  const editToolbarIndex = appSource.indexOf('<div className="miniChordEditToolbar"');

  assert.match(appSource, /const MINI_CHORD_BAR_OPTIONS = \[4, 8, 16, 32, 64\]/);
  assert.doesNotMatch(appSource, /MINI_CHORD_BAR_OPTIONS = \[[^\]]*96/);
  assert.match(appSource, /aria-label="마디 수 직접 입력"/);
  assert.match(appSource, /const retainedBarCount = Math\.max\(/);
  assert.match(appSource, /normalizeMiniChordSlots\(slots, retainedBarCount\)/);
  assert.ok(measureStripIndex >= 0);
  assert.ok(editToolbarIndex > measureStripIndex);
});

test("a HOLD token cannot suppress the root attack of an explicit half-bar chord", () => {
  const carriedBass = Array.from({ length: 16 }, () => "rest");
  carriedBass[8] = "hold";
  carriedBass[9] = "hold";

  assert.equal(shouldAddMiniChordExplicitSlotFallback({
    end: 12,
    hasExplicitChord: true,
    part: "bass",
    start: 8,
    steps: carriedBass,
  }), true);
});
