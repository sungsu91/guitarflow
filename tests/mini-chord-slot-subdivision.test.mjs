import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  MINI_CHORD_SLOTS_PER_BAR,
  getMiniChordTimelineHalves,
  mergeMiniChordSlot,
  normalizeMiniChordSlots,
  normalizeMiniChordSplitSlots,
  splitMiniChordSlot,
} from "../src/mini-chord/slotSubdivision.js";

test("legacy two-slot measures migrate to four one-beat playback slots", () => {
  const migrated = normalizeMiniChordSlots(
    ["C", "G", "Am", "F"],
    2,
    { sourceSlotsPerBar: 2 },
  );

  assert.equal(MINI_CHORD_SLOTS_PER_BAR, 4);
  assert.deepEqual(migrated, ["C", "", "G", "", "Am", "", "F", ""]);
});

test("splitting a half copies its current chord and exposes two independent beats", () => {
  const result = splitMiniChordSlot(["C", "", "G", ""], [], 2, 1);
  const halves = getMiniChordTimelineHalves(result.slots, result.splitSlots, 0);

  assert.deepEqual(result.splitSlots, [1]);
  assert.equal(result.slots[2], "G");
  assert.equal(result.slots[3], "G");
  assert.equal(halves[0].slots.length, 1);
  assert.deepEqual(halves[0].playbackSlotIndexes, [0, 1]);
  assert.equal(halves[1].slots.length, 2);
  assert.deepEqual(halves[1].slots.map((slot) => slot.index), [2, 3]);
});

test("split markers stay bounded when the measure count changes", () => {
  assert.deepEqual(normalizeMiniChordSplitSlots([0, 1, 3, 4, -1, 1], 2), [0, 1, 3]);
});

test("merging a split half keeps the selected beat and restores one two-beat cell", () => {
  const merged = mergeMiniChordSlot(
    ["C", "Am7", "G", ""],
    [0],
    0,
    1,
    { preferredSlotIndex: 1, preferredValue: "Am7" },
  );
  const halves = getMiniChordTimelineHalves(merged.slots, merged.splitSlots, 0);

  assert.deepEqual(merged.splitSlots, []);
  assert.deepEqual(merged.slots, ["Am7", "", "G", ""]);
  assert.equal(halves[0].isSplit, false);
  assert.deepEqual(halves[0].slots.map((slot) => slot.index), [0]);
  assert.deepEqual(halves[0].playbackSlotIndexes, [0, 1]);
});

test("the split chord HUD commits both one-beat slots in one state update", async () => {
  const appSource = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");

  assert.match(appSource, /className="miniChordPickerSlotTabs"/);
  assert.match(appSource, /onCommitSlots\?\.\(/);
  assert.match(appSource, /editorSlotIndexes\.map\(\(targetSlotIndex\) => \(\{/);
  assert.match(appSource, /setMiniChordSlots\(\(slots\) => \{/);
  assert.match(appSource, /safeUpdates\.forEach/);
  assert.match(appSource, /onMerge\?\.\(/);
  assert.match(appSource, /분할된 1박 두 칸을 2박으로 다시 합치기/);
  assert.doesNotMatch(
    appSource.slice(
      appSource.indexOf('className={`miniChordSplitButton'),
      appSource.indexOf('className="miniChordPopupCloseButton"'),
    ),
    /disabled=\{isSplit\}/,
  );
});

test("split editor reserves non-overlapping columns and exposes the selected chord", async () => {
  const appSource = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
  const appCss = await readFile(new URL("../src/style.css", import.meta.url), "utf8");
  const polishCss = await readFile(new URL("../src/polish.css", import.meta.url), "utf8");
  const desktopCss = await readFile(new URL("../src/layouts/desktop-layout.css", import.meta.url), "utf8");

  assert.match(appSource, /className="miniChordPickerSelectedChord"/);
  assert.match(
    desktopCss,
    /miniChordMeasureEditorPanel \.miniChordPickerHeader \{\s*grid-template-columns: minmax\(72px, 1fr\) minmax\(104px, 1\.25fr\) 62px !important/,
  );
  assert.match(appCss, /miniChordPickerSlotTabs \{[^}]*pointer-events: auto !important/);
  assert.match(appCss, /miniChordPickerSlotTabs > button \{[^}]*pointer-events: auto !important/);
  assert.match(desktopCss, /miniChordPickerSelectedChord[\s\S]*grid-column: 2 !important[\s\S]*text-align: left !important/);
  assert.match(desktopCss, /miniChordPickerHeaderActions[\s\S]*grid-column: 3 !important[\s\S]*width: 62px !important/);
  assert.match(polishCss, /@media \(max-width: 680px\)[\s\S]*grid-template-columns: minmax\(58px, 1fr\) minmax\(96px, 1\.25fr\) 62px !important/);
  assert.match(polishCss, /miniChordPickerSelectedChord[\s\S]*text-align: left !important/);
});

test("rests keep the stored N.C. value but render with a font-independent SVG", async () => {
  const appSource = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");

  assert.match(appSource, /const MINI_CHORD_REST_LABEL = "N\.C\."/);
  assert.match(appSource, /function MiniChordRestIcon/);
  assert.match(appSource, /isMiniChordRestValue\(slot\.chord\)[\s\S]*?<MiniChordRestIcon/);
});
