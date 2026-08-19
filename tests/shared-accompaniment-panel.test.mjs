import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appSource = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
const panelSource = await readFile(new URL("../src/rhythm/SharedAccompanimentPanel.jsx", import.meta.url), "utf8");

function getSourceRange(startMarker, endMarker) {
  const start = appSource.indexOf(startMarker);
  const end = appSource.indexOf(endMarker, start + 1);
  assert.notEqual(start, -1, `${startMarker} should exist`);
  assert.notEqual(end, -1, `${endMarker} should follow ${startMarker}`);
  return appSource.slice(start, end);
}

test("mini chord and rhythm training render the exact shared accompaniment panel", () => {
  assert.equal((appSource.match(/<SharedAccompanimentPanel\b/g) ?? []).length, 2);
  assert.match(appSource, /className="sharedAccompanimentPanel--miniChord"/);
  assert.match(appSource, /className="sharedAccompanimentPanel--training"/);
  assert.doesNotMatch(appSource, /className="stage3BackingBandPanel"/);
});

test("shared panel owns collapse, sound controls, beat selection, and settings entry", () => {
  assert.match(panelSource, /<details/);
  assert.match(panelSource, /리듬 사용자 설정/);
  assert.match(panelSource, /onTogglePart\(part\.id\)/);
  assert.match(panelSource, /part\.onBeatChange\(option\.id\)/);
  assert.match(panelSource, /data-backing-volume-part/);
});

test("menu owns sound and rhythm entry while the rhythm dialog contains no duplicate sound controls", () => {
  const rhythmDialogSource = getSourceRange(
    "function MiniChordRhythmSettingsDialog",
    "function MiniChordArrangementEditorDialog",
  );
  assert.match(appSource, /<strong>사운드 및 리듬 설정<\/strong>/);
  assert.match(appSource, /className="utilityRhythmSettingsButton"/);
  assert.match(rhythmDialogSource, /리듬 사용자 설정/);
  assert.doesNotMatch(rhythmDialogSource, /miniChordRhythmSoundRow|기본 볼륨|onSoundToggle/);
});

test("rhythm settings keep editing compact and expose part and full previews", () => {
  const rhythmDialogSource = getSourceRange(
    "function MiniChordRhythmSettingsDialog",
    "function MiniChordArrangementEditorDialog",
  );

  assert.match(rhythmDialogSource, /miniChordRhythmPartHeaderActions/);
  assert.match(rhythmDialogSource, /선택 편집/);
  assert.match(rhythmDialogSource, /miniChordRhythmPartPreviewButton/);
  assert.match(rhythmDialogSource, /전체 미리듣기/);
  assert.doesNotMatch(rhythmDialogSource, /기본 비트 \/ SUBDIVISION/);
});

test("pattern editor and settings part previews schedule only the requested instrument", () => {
  const groovePreviewSource = getSourceRange(
    "const previewMiniChordGrooveDraft",
    "const previewMiniChordGlobalRhythm",
  );
  const settingsPreviewSource = getSourceRange(
    "const previewMiniChordGlobalRhythm",
    "const previewMiniChordArrangementDraft",
  );

  assert.match(groovePreviewSource, /event\.instrument === miniChordGrooveEditorPart/);
  assert.match(groovePreviewSource, /previewForceEnabled: true/);
  assert.match(settingsPreviewSource, /mode === "all"/);
  assert.match(settingsPreviewSource, /event\.instrument === mode/);
  assert.match(settingsPreviewSource, /setMiniChordRhythmSettingsPreviewMode\(mode\)/);
});

test("shared volume sliders stay mounted and coalesce rapid audio updates", () => {
  assert.match(panelSource, /function SharedAccompanimentVolumeSlider/);
  assert.match(panelSource, /ref=\{inputRef\}/);
  assert.doesNotMatch(panelSource, /key=\{`\$\{part\.id\}-\$\{part\.volume\}`\}/);
  assert.match(appSource, /window\.requestAnimationFrame\(flushBackingVolumeInputs\)/);
  assert.match(appSource, /backingPendingVolumeInputsRef\.current\.set\(part/);
});

test("rapid accompaniment pattern changes compile only the latest request", () => {
  assert.match(appSource, /BACKING_PATTERN_CHANGE_DEBOUNCE_MS = 72/);
  assert.match(appSource, /backingPendingPatternCompileRef\.current = compileRequest/);
  assert.match(appSource, /window\.setTimeout\(\(\) => \{/);
});

test("mini chord playback suppresses the stale editing highlight", () => {
  assert.match(
    appSource,
    /!miniChordPlaybackActive && miniChordActiveSlot === slot\.index \? "active" : ""/,
  );
});

test("training progression items no longer store a separate accompaniment rhythm", () => {
  const libraryItemSource = getSourceRange(
    "function makeStage3LibraryItem",
    "function getCompactFretRange",
  );
  assert.doesNotMatch(libraryItemSource, /backingRhythmPattern|backingBassBeat|backingPianoBeat/);
});

test("training playback resolves the shared global user pattern library", () => {
  const prepareSource = getSourceRange(
    "const prepareStage3BackingSession",
    "const preloadStage3BackingEngine",
  );
  assert.match(prepareSource, /resolveGlobalAccompanimentPatterns/);
  assert.match(prepareSource, /miniChordUserDefaultPatternsRef\.current/);
  assert.match(prepareSource, /globalPatternResolution/);
});
