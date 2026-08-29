import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [appSource, polishCss] = await Promise.all([
  readFile(new URL("../src/App.jsx", import.meta.url), "utf8"),
  readFile(new URL("../src/polish.css", import.meta.url), "utf8"),
]);

test("scale training exposes only scale and pentatonic families with five box positions", () => {
  const trainingFamilySource = appSource.slice(
    appSource.indexOf("const SCALE_TRAINING_FAMILIES ="),
    appSource.indexOf("const PENTATONIC_BOX_PATTERNS ="),
  );

  assert.match(trainingFamilySource, /scale: SCALE_FAMILIES\.scale/);
  assert.match(trainingFamilySource, /pentatonic: SCALE_FAMILIES\.pentatonic/);
  assert.doesNotMatch(trainingFamilySource, /SCALE_LICK|릭|lick/);
  assert.doesNotMatch(appSource, /SCALE_LICK_UI_ENABLED/);
  assert.match(
    appSource,
    /const selectedScaleDetailOptions = isSelectedScaleLick[\s\S]*?: SCALE_BOX_OPTIONS\.map\(\(boxNumber\) => \(\{ id: boxNumber, label: `BOX\$\{boxNumber\}` \}\)\);/,
  );
  assert.doesNotMatch(appSource, /SCALE_BOX_SET_UP_RIGHT_ID|SCALE_BOX_SET_DOWN_RIGHT_ID/);
  assert.match(appSource, /const nextBox = Math\.max\(1, Math\.min\(5, Number\(boxValue\) \|\| 1\)\);/);
});

test("mobile scale picker removes visible field labels and enlarges dropdown text", () => {
  assert.match(polishCss, /Scale \/ pentatonic mobile picker/);
  assert.match(polishCss, /grid-template-rows: 34px !important/);
  assert.match(polishCss, /height: 44px !important;[\s\S]*?min-height: 44px !important;[\s\S]*?max-height: 44px !important;/);
  assert.match(polishCss, /\.scaleFamilySelect \{[\s\S]*?grid-column: 2 !important;[\s\S]*?grid-row: 1 !important;/);
  assert.match(polishCss, /\.scaleTypeSelect \{[\s\S]*?grid-column: 3 !important;[\s\S]*?grid-row: 1 !important;/);
  assert.match(polishCss, /\.scaleDetailSelect \{[\s\S]*?grid-column: 4 !important;[\s\S]*?grid-row: 1 !important;/);
  assert.match(appSource, /showLabel = true/);
  assert.match(appSource, /label="키"[\s\S]*?showLabel=\{!isMobileLayout\}/);
  assert.match(appSource, /label="스케일"[\s\S]*?showLabel=\{!isMobileLayout\}/);
  assert.match(appSource, /label="타입"[\s\S]*?showLabel=\{!isMobileLayout\}/);
  assert.match(appSource, /label=\{selectedScaleDetailLabel\}[\s\S]*?showLabel=\{!isMobileLayout\}/);
  assert.doesNotMatch(polishCss, /> \.metronomeSelectLabel \{/);
  assert.match(polishCss, /\.metronomeSelectButton\.metronomeSelectButton[\s\S]*?padding: 0 4px 0 6px !important;/);
  assert.match(polishCss, /font-size: 12px !important;[\s\S]*?font-weight: 950 !important;/);
  assert.match(polishCss, /html body main\.app\.app\.app\s*> \.metronomeSelectPortal:is\(\.scaleKeySelect, \.scaleFamilySelect, \.scaleTypeSelect, \.scaleDetailSelect\)/);
  assert.match(polishCss, /> \.metronomeSelectMenu[\s\S]*?> \.metronomeSelectOption \{[\s\S]*?height: 32px !important;[\s\S]*?min-height: 32px !important;[\s\S]*?max-height: 32px !important;[\s\S]*?color: var\(--riff-text-strong\) !important;[\s\S]*?font-size: 18px !important;[\s\S]*?font-weight: 900 !important;/);
});

test("scale practice reuses the shared mobile Backing Loop presentation", () => {
  const sharedPlayerPass = polishCss.slice(
    polishCss.indexOf("/* Backing Loop mini player: one cohesive music-player surface on mobile. */"),
    polishCss.indexOf("/* Mobile fretboard viewer layout tuning */"),
  );
  const scalePlacementPass = polishCss.slice(
    polishCss.indexOf("/* Scale play: BackingLoop keeps shared behavior"),
    polishCss.indexOf("/* Gold-dark fretboard viewer"),
  );

  assert.match(sharedPlayerPass, /grid-template-rows: 94px 45px !important/);
  assert.match(sharedPlayerPass, /height: 157px !important/);
  assert.match(sharedPlayerPass, /border-radius: 10px !important/);
  assert.match(scalePlacementPass, /width: calc\(100dvw - 32px\)/);
  assert.doesNotMatch(scalePlacementPass, /backingLoopPanel--mobile/);
  assert.doesNotMatch(polishCss, /standaloneMetronomePanel \.backingLoopPanel\.backingLoopPanel--mobile/);
  assert.doesNotMatch(polishCss, /metronomeMode[\s\S]{0,180}\.backingLoopPanel--mobile/);
});

test("mobile single-note, scale, and rhythm-code practice share beat-state styling", () => {
  const sharedBeatPass = polishCss.slice(polishCss.lastIndexOf("/* Mobile note trainers: one shared beat-state system with a transient playhead glow. */"));

  assert.match(sharedBeatPass, /:is\(\.firstPositionTrainingPanel, \.scaleBlockTrainingPanel, \.chordTransitionPanel\)/);
  assert.match(sharedBeatPass, /--beat-dot-size: clamp\(23px, 6\.8vw, 28px\)/);
  assert.match(sharedBeatPass, /metronomeSelectLabelDot \{[\s\S]*width: 12px;[\s\S]*border: 1\.5px solid var\(--training-beat-weak\) !important/);
  assert.match(sharedBeatPass, /metronomeSelectLabelDot--strong[\s\S]*outline: 1px solid var\(--training-beat-strong\) !important/);
  assert.match(sharedBeatPass, /metronomeSelectLabelDot--weak[\s\S]*border-color: var\(--training-beat-weak\) !important/);
  assert.match(sharedBeatPass, /beatDot--strong[\s\S]*outline: 1\.5px solid var\(--training-beat-strong\) !important/);
  assert.match(sharedBeatPass, /beatDot--weak[\s\S]*border-style: solid !important/);
  assert.match(sharedBeatPass, /beatDot--mute[\s\S]*border-style: dashed !important/);
  assert.match(sharedBeatPass, /beatDot--mute[\s\S]*repeating-linear-gradient\(/);

  const activeGlyphRule = sharedBeatPass.match(/\.referenceBeatMetronomeDot\.beatDot\.active \.beatDot__glyph \{([\s\S]*?)\n\s*\}/)?.[1] ?? "";
  assert.match(activeGlyphRule, /drop-shadow\(0 0 5px var\(--training-beat-current-glow\)\)/);
  assert.doesNotMatch(activeGlyphRule, /\b(?:background|border|outline|opacity)\s*:/);
  assert.match(sharedBeatPass, /beatDot--mute\.active[\s\S]*?border-color: var\(--training-beat-mute\) !important;[\s\S]*?border-style: dashed !important;/);
  assert.match(sharedBeatPass, /beatDot--mute\.active[\s\S]*?filter: none !important;/);
  assert.doesNotMatch(sharedBeatPass, /beatDot--mute\.active[\s\S]*?--riff-dot-active/);
});

test("scale practice waits for the selected metronome samples before its first beat", () => {
  const startPracticeSource = appSource.slice(
    appSource.indexOf("const startPractice = useCallback"),
    appSource.indexOf("const enterPracticePreview = useCallback"),
  );
  const audioReadyIndex = startPracticeSource.indexOf("const audioReady = await ensureAudioReady()");
  const samplesReadyIndex = startPracticeSource.indexOf("await loadMetronomeSamples(audioRef.current || audio)");
  const playingIndex = startPracticeSource.lastIndexOf("setState(GAME_STATES.PLAYING)");

  assert.ok(audioReadyIndex >= 0);
  assert.ok(samplesReadyIndex > audioReadyIndex);
  assert.ok(playingIndex > samplesReadyIndex);
  assert.doesNotMatch(startPracticeSource, /void ensureAudioReady\(\)/);
});
