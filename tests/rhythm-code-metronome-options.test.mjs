import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appSource = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
const polishCss = await readFile(new URL("../src/polish.css", import.meta.url), "utf8");

function getSourceRange(startMarker, endMarker) {
  const start = appSource.indexOf(startMarker);
  const end = appSource.indexOf(endMarker, start + 1);
  assert.notEqual(start, -1, `${startMarker} should exist`);
  assert.notEqual(end, -1, `${endMarker} should follow ${startMarker}`);
  return appSource.slice(start, end);
}

test("rhythm code places its four metronome dropdowns above accompaniment", () => {
  const utilityIndex = appSource.indexOf('<div className="stage3PracticeUtilityPanel">');
  const optionsIndex = appSource.indexOf('className="standaloneMetronomeControl referenceStandaloneMetronomeControl stage3StandaloneMetronomeControl"');
  const accompanimentIndex = appSource.indexOf('className="sharedAccompanimentPanel--training"');

  assert.ok(utilityIndex < optionsIndex, "options should follow the BPM/metronome utility panel");
  assert.ok(optionsIndex < accompanimentIndex, "options should precede accompaniment sound");

  const optionsBlock = getSourceRange(
    "accentTone={stage3MetronomeAccentTone}",
    "<SharedAccompanimentPanel",
  );
  assert.match(optionsBlock, /splitToneControls/);
  assert.match(optionsBlock, /onTimeSignatureChange=\{changeStage3MetronomeTimeSignature\}/);
  assert.match(optionsBlock, /onSubdivisionChange=\{changeStage3MetronomeSubdivision\}/);
  assert.match(optionsBlock, /onAccentToneChange=\{changeStage3MetronomeAccentTone\}/);
  assert.match(optionsBlock, /onWeakToneChange=\{changeStage3MetronomeWeakTone\}/);
  assert.match(optionsBlock, /onOptionsCollapseChange=\{isMobileLayout \? setStage3MetronomeOptionsCollapsed : null\}/);
  assert.match(optionsBlock, /optionsCollapsed=\{isMobileLayout && stage3MetronomeOptionsCollapsed\}/);
  assert.doesNotMatch(optionsBlock, /changeTrainingMetronomeTimeSignature|changeMetronomeAccentTone|changeMetronomeWeakTone/);
  assert.equal((appSource.match(/onOptionsCollapseChange=\{isMobileLayout/g) ?? []).length, 1);
});

test("rhythm code metronome settings own state and runtime refs", () => {
  for (const setting of ["TimeSignature", "Subdivision", "AccentTone", "WeakTone", "BeatPattern", "SoundOn"]) {
    assert.match(appSource, new RegExp(`const \\[stage3Metronome${setting}, setStage3Metronome${setting}\\]`));
    assert.match(appSource, new RegExp(`const stage3Metronome${setting}Ref = useRef`));
  }

  const frameSource = getSourceRange("const runChordTransitionFrame", "const runMetronomeFrame");
  assert.match(frameSource, /getTimeSignatureOption\(stage3MetronomeTimeSignatureRef\.current\)/);
  assert.match(frameSource, /getSubdivisionOption\(stage3MetronomeSubdivisionRef\.current\)/);
  assert.match(frameSource, /playStage3PatternTick\(beatInBar, subdivisionIndex\)/);
  assert.doesNotMatch(frameSource, /getTimeSignatureOption\("4\/4"\)/);

  const tickSource = getSourceRange("const playTick", "const playVisualLabTick");
  assert.match(tickSource, /stage3MetronomeAccentToneRef\.current/);
  assert.match(tickSource, /stage3MetronomeWeakToneRef\.current/);
  assert.match(tickSource, /scope === METRONOME_SETTING_SCOPES\.STAGE3[\s\S]*stage3MetronomeSoundOnRef\.current[\s\S]*metronomeOnRef\.current/);
  const stage3StartSource = getSourceRange('if (safeCategory.id === "rhythm")', "const audio = ensureAudioContext");
  assert.doesNotMatch(stage3StartSource, /setMetronomeOn\(true\)|metronomeOnRef\.current = true/);
  assert.doesNotMatch(tickSource, /STAGE3_FIXED_METRONOME_TONE_ID/);
  const storedSettingsSource = getSourceRange("function getStoredStage3Settings", "function getStoredStage3QuickSlots");
  assert.equal((storedSettingsSource.match(/metronomeSoundOn: false/g) ?? []).length, 2);
  assert.doesNotMatch(storedSettingsSource, /parsed\.metronomeSoundOn/);
});

test("rhythm code braille matches the scale trainer and remains independent", () => {
  const stage3Braille = getSourceRange(
    '<div className="referenceBeatMetronomeStrip stage3ReferenceBeatMetronomeStrip"',
    "<div className=\"stage3PracticeUtilityPanel\">",
  );
  assert.match(stage3Braille, /beatPattern=\{stage3NormalizedBeatPattern\}/);
  assert.match(stage3Braille, /beatsPerMeasure=\{stage3MetronomeBeatsPerMeasure\}/);
  assert.match(stage3Braille, /dotClassName="referenceBeatMetronomeDot"/);
  assert.match(stage3Braille, /onBeatClick=\{cycleStage3BeatState\}/);
  assert.match(stage3Braille, /timeSignature=\{stage3MetronomeTimeSignature\}/);
  assert.match(stage3Braille, /stage3MetronomeSoundToggle--mobile/);
  assert.match(stage3Braille, /stage3MetronomeSoundToggle--desktop/);
  assert.match(stage3Braille, /aria-pressed=\{stage3MetronomeSoundOn\}/);
  assert.equal((stage3Braille.match(/aria-controls="stage3-metronome-options-options"/g) ?? []).length, 2);
  assert.match(stage3Braille, /toggleStage3MetronomeSound/);
  assert.equal((stage3Braille.match(/<span>매트로놈<\/span>/g) ?? []).length, 2);

  assert.match(polishCss, /Rhythm-code-only metronome options/);
  assert.match(polishCss, /stage3StandaloneMetronomeControl[\s\S]*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(polishCss, /@media \(max-width: 767px\)[\s\S]*stage3StandaloneMetronomeControl[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(polishCss, /stage3ReferenceBeatMetronomeStrip/);
  assert.match(polishCss, /button\.referenceBeatMetronomeDot\.beatDot[\s\S]*background: transparent !important/);
  assert.match(polishCss, /--beat-dot-size: 20px/);
  assert.match(polishCss, /stage3ProgressHud\.stage3ProgressHud[\s\S]*grid-template-columns: 66px minmax\(0, 1fr\) 66px/);
  assert.match(polishCss, /stage3ReferenceBeatMetronomeStrip[\s\S]*grid-column: 2 !important/);
  assert.match(polishCss, /stage3MetronomeSoundToggle[\s\S]*grid-template-columns: 16px minmax\(0, 1fr\)[\s\S]*width: 66px !important/);
  assert.match(polishCss, /stage3MetronomeSoundToggle--mobile/);
  assert.match(polishCss, /stage3StandaloneMetronomeControl[\s\S]*metronomeOptionsCollapseButton[\s\S]*top: -2px !important[\s\S]*right: 0 !important/);
  assert.match(polishCss, /metronomeOptions--collapsed[\s\S]*display: flex !important/);
});

test("rhythm code metronome sound controls only the dedicated click track", () => {
  const tickSource = getSourceRange("const playTick", "const playVisualLabTick");
  assert.match(tickSource, /scope === METRONOME_SETTING_SCOPES\.STAGE3/);
  assert.match(tickSource, /stage3MetronomeSoundOnRef\.current/);
  assert.match(tickSource, /stage3MetronomeAccentToneRef\.current/);
  assert.match(tickSource, /stage3MetronomeWeakToneRef\.current/);
  assert.doesNotMatch(tickSource, /backingDrumEnabled|backingBassEnabled|backingPianoEnabled|stopBackingScheduler/);
});
