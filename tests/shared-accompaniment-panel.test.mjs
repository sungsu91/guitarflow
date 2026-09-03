import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appSource = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
const panelSource = await readFile(new URL("../src/rhythm/SharedAccompanimentPanel.jsx", import.meta.url), "utf8");
const appCss = await readFile(new URL("../src/style.css", import.meta.url), "utf8");

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
  assert.equal((appSource.match(/<SharedAccompanimentPanel[\s\S]{0,180}defaultExpanded/g) ?? []).length, 2);
  assert.doesNotMatch(appSource, /defaultExpanded=\{false\}/);
  assert.doesNotMatch(appSource, /className="stage3BackingBandPanel"/);
});

test("shared panel owns collapse, sound controls, beat selection, and settings entry", () => {
  assert.match(panelSource, /<details/);
  assert.match(panelSource, /리듬 사용자 설정/);
  assert.match(panelSource, /<summary>[\s\S]*sharedAccompanimentSettingsButton[\s\S]*리듬 사용자 설정[\s\S]*<\/summary>/);
  assert.doesNotMatch(panelSource, /sharedAccompanimentSettingsBar/);
  assert.match(panelSource, /event\.preventDefault\(\);[\s\S]*event\.stopPropagation\(\);/);
  assert.match(
    appCss,
    /@media \(max-width: 719px\)[\s\S]*?\.sharedAccompanimentPanel > summary \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\) auto auto !important/,
  );
  assert.match(
    appCss,
    /\.sharedAccompanimentPanel > summary \.sharedAccompanimentSettingsButton \{[\s\S]*?grid-column: 2 !important;[\s\S]*?grid-row: 1 !important/,
  );
  assert.match(panelSource, /onTogglePart\(part\.id\)/);
  assert.match(panelSource, /part\.onBeatChange\(option\.id\)/);
  assert.match(panelSource, /data-backing-volume-part/);
});

test("shared accompaniment controls stay responsive and unlocked during playback", () => {
  assert.match(panelSource, /const \[beatValueOverrides, setBeatValueOverrides\] = useState/);
  assert.match(panelSource, /const \[enabledOverrides, setEnabledOverrides\] = useState/);
  assert.match(appSource, /startTransition\(\(\) => \{[\s\S]*setBackingRhythmPattern/);
  assert.match(appSource, /const miniChordEditLocked = miniChordIsStarting/);
  assert.doesNotMatch(appSource, /const miniChordEditLocked = miniChordPlaybackActive/);
  assert.doesNotMatch(appSource, /<SharedAccompanimentPanel[\s\S]{0,220}className="sharedAccompanimentPanel--training"[\s\S]{0,220}disabled=\{gameState === GAME_STATES\.PLAYING\}/);
});

test("mini chord recommendations lock only the in-page panel while shared menus stay independent", () => {
  const miniChordPanelSource = getSourceRange(
    '<SharedAccompanimentPanel\n            className="sharedAccompanimentPanel--miniChord"',
    "{miniChordPageCount > 1",
  );
  const trainingPanelSource = getSourceRange(
    '<SharedAccompanimentPanel\n            className="sharedAccompanimentPanel--training"',
    "</section>",
  );
  const mobileUtilitySource = getSourceRange(
    '<section className="utilitySoundPanel"',
    '<button\n                className="utilityMenuItem utilityMenuItemSecondary utilityMenuItemActive"',
  );

  assert.match(panelSource, /disabled=\{disabled\}/);
  assert.match(panelSource, /data-accompaniment-locked=\{disabled \? "true" : undefined\}/);
  assert.match(panelSource, /disabled && lockedNotice[\s\S]*sharedAccompanimentLockNotice[\s\S]*\{lockedNotice\}/);
  assert.match(miniChordPanelSource, /disabled=\{miniChordEditLocked \|\| miniChordRecommendedAccompanimentLocked\}/);
  assert.match(trainingPanelSource, /disabled=\{stage3RecommendedAccompanimentLocked\}/);
  assert.match(trainingPanelSource, /lockedNotice="기본 제공 팩은 수정할 수 없습니다"/);
  assert.doesNotMatch(miniChordPanelSource, /lockedNotice=/);
  assert.match(appSource, /accompanimentControlsDisabled=\{stage3RecommendedAccompanimentLocked\}/);
  assert.match(mobileUtilitySource, /disabled=\{stage3RecommendedAccompanimentLocked\}/);
  assert.doesNotMatch(mobileUtilitySource, /miniChordRecommendedAccompanimentLocked/);
  assert.match(appSource, /const toggleBackingPartEnabled = useCallback\(\(part\) => \{\s+if \(stage3RecommendedAccompanimentLocked\) return;/);
  assert.match(appSource, /const openMiniChordRhythmSettings = \(\) => \{\s+if \(stage3RecommendedAccompanimentLocked\) return;/);
});

test("light theme accompaniment buttons never switch to a black pressed state", () => {
  const lightSelectedRule = appCss.match(
    /html body \.app\.theme-light\.theme-light \.sharedAccompanimentPanel \.miniChordBeatOptions button\.selected,[\s\S]*?\n\}/,
  )?.[0] ?? "";
  assert.match(lightSelectedRule, /#f8e6bd/);
  assert.match(lightSelectedRule, /button:active/);
  assert.doesNotMatch(lightSelectedRule, /#2b2f32|background:\s*black/);
  assert.match(appCss, /sharedAccompanimentSettingsButton:active[\s\S]*#fffefb/);
  assert.match(appCss, /\.sharedAccompanimentLockNotice \{[\s\S]*font-size: 10px !important;[\s\S]*font-weight: 850 !important;/);
});

test("light theme accompaniment volume rails replace the native dark range chrome", () => {
  assert.match(appCss, /theme-light\.theme-light \.sharedAccompanimentPanel \.miniChordVolumeRail input\[type="range"\][\s\S]*color-scheme: light/);
  assert.match(appCss, /theme-light\.theme-light \.sharedAccompanimentPanel \.miniChordVolumeRail input\[type="range"\]::-webkit-slider-runnable-track[\s\S]*#efe3ca/);
  assert.match(appCss, /theme-light\.theme-light \.sharedAccompanimentPanel \.miniChordVolumeRail input\[type="range"\]::-moz-range-track[\s\S]*#efe3ca/);
  assert.match(appCss, /theme-light\.theme-light \.sharedAccompanimentPanel \.miniChordVolumeRail input\[type="range"\]::-webkit-slider-thumb[\s\S]*#fff5d9/);
});

test("mini chord and rhythm training share the same warm ivory accompaniment surface", () => {
  assert.match(
    appCss,
    /theme-light\.theme-light\.miniChordMakerMode \.sharedAccompanimentPanel--miniChord,[\s\S]*theme-light\.theme-light \.chordTransitionPanel > \.sharedAccompanimentPanel--training \{[\s\S]*rgba\(255, 252, 246, 0\.9\)[\s\S]*rgba\(247, 238, 224, 0\.78\)/,
  );
  assert.match(
    appCss,
    /theme-light\.theme-light\.miniChordMakerMode \.sharedAccompanimentPanel--miniChord \.miniChordBackingRow,[\s\S]*sharedAccompanimentPanel--training \.miniChordBackingRow \{[\s\S]*rgba\(185, 132, 62, 0\.026\)/,
  );
  assert.match(appCss, /@media \(max-width: 767px\)[\s\S]*sharedAccompanimentPanel--training > summary span \{[\s\S]*border-left: 3px solid #b7833f/);
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

test("rhythm settings selection stays local and does not move the active accompaniment", () => {
  const rhythmDialogSource = getSourceRange(
    "function MiniChordRhythmSettingsDialog",
    "function MiniChordArrangementEditorDialog",
  );
  const settingsBindingSource = getSourceRange(
    "const sharedAccompanimentConfigurationDialogs",
    "const closeUtilityMenu",
  );
  const resetSource = getSourceRange(
    "const resetMiniChordUserDefaultPatternsForPart",
    "useEffect(() => {\n    if (appModeRef.current",
  );

  assert.match(rhythmDialogSource, /selectedPatterns\?\.\[part\]/);
  assert.match(rhythmDialogSource, /현재 반주 리듬을 변경하지 않습니다/);
  assert.match(rhythmDialogSource, /const \[selectedPatterns, setSelectedPatterns\] = useState/);
  assert.match(settingsBindingSource, /miniChordRhythmSettingsSelectionRef\.current = nextPatterns/);
  assert.doesNotMatch(appSource, /setMiniChordRhythmSettingsSelectedPatterns/);
  assert.doesNotMatch(settingsBindingSource, /requestGlobalAccompanimentPatternChange\(\{ \[arrangementKey\]: presetId \}/);
  assert.match(resetSource, /requestGlobalAccompanimentPatternChange\(\{\}, \{ forceSessionUpdate: true \}\)/);
  assert.doesNotMatch(resetSource, /\[arrangementKey\]: "basic"|globalDefaults\.rhythmPattern/);
});

test("rhythm reset confirmation is a body-level solid overlay without nested blur artifacts", () => {
  const rhythmDialogSource = getSourceRange(
    "function MiniChordRhythmSettingsDialog",
    "function MiniChordArrangementEditorDialog",
  );

  assert.match(rhythmDialogSource, /resetRequest \? createPortal\(/);
  assert.match(rhythmDialogSource, /<button autoFocus onClick=\{\(\) => setResetRequest\(null\)\}/);
  assert.match(rhythmDialogSource, /document\.body\.style\.overflow = "hidden"/);
  assert.match(rhythmDialogSource, /document\.documentElement\.style\.overflow = "hidden"/);
  assert.match(appCss, /\.miniChordRhythmSettingsDialog::-webkit-scrollbar \{[\s\S]*display: none !important/);
  assert.match(appCss, /\.miniChordRhythmResetConfirmLayer \{[\s\S]*z-index: 100200 !important/);
  assert.match(appCss, /\.miniChordRhythmResetConfirmLayer \{[\s\S]*backdrop-filter: none !important/);
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
