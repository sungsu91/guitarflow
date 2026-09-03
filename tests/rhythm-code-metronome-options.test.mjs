import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appSource = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
const appCss = await readFile(new URL("../src/style.css", import.meta.url), "utf8");
const polishCss = await readFile(new URL("../src/polish.css", import.meta.url), "utf8");
const desktopCss = await readFile(new URL("../src/layouts/desktop-layout.css", import.meta.url), "utf8");
const responsiveCss = await readFile(new URL("../src/layouts/responsive-play-focus.css", import.meta.url), "utf8");
const mobileDarkCss = await readFile(new URL("../src/layouts/mobile-dark-theme.css", import.meta.url), "utf8");

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
  assert.match(
    appSource,
    /className="sharedAccompanimentPanel--training"\s+defaultExpanded=\{!isMobileLayout \|\| !viewportProfile\.isLandscape\}/,
  );
  assert.doesNotMatch(optionsBlock, /changeTrainingMetronomeTimeSignature|changeMetronomeAccentTone|changeMetronomeWeakTone/);
  assert.equal((appSource.match(/onOptionsCollapseChange=\{isMobileLayout/g) ?? []).length, 1);
  assert.match(
    appSource,
    /stage3MetronomeOptionsCollapsed, setStage3MetronomeOptionsCollapsed\] = useState\(\s*\(\) => viewportProfile\.isMobileSurface && viewportProfile\.isLandscape/,
  );
  assert.match(appSource, /optionsCollapsed \? "펼침" : "접기"/);
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

test("every metronome surface defaults both tone selectors to Tick", () => {
  const libraryDefaults = getSourceRange("function makeStage3LibraryItem", "function getCompactFretRange");
  assert.match(libraryDefaults, /accentTone = "tick"/);
  assert.match(libraryDefaults, /weakTone = "tick"/);

  const sharedDefaults = getSourceRange(
    "const createDefaultMetronomeSettings",
    "const DEFAULT_ONLY_TRAINING_METRONOME_SCOPES",
  );
  assert.match(sharedDefaults, /accentTone: "tick"/);
  assert.match(sharedDefaults, /weakTone: "tick"/);

  assert.match(appSource, /metronomeAccentTone, setMetronomeAccentTone\] = useState\("tick"\)/);
  assert.match(appSource, /metronomeWeakTone, setMetronomeWeakTone\] = useState\("tick"\)/);
  assert.match(appSource, /metronomeAccentToneRef = useRef\("tick"\)/);
  assert.match(appSource, /metronomeWeakToneRef = useRef\("tick"\)/);

  const storedSettingsSource = getSourceRange("function getStoredStage3Settings", "function getStoredStage3QuickSlots");
  assert.match(storedSettingsSource, /metronomeAccentTone: "tick"/);
  assert.match(storedSettingsSource, /metronomeWeakTone: "tick"/);
  assert.match(storedSettingsSource, /hasCurrentToneDefaults/);
  assert.match(appSource, /metronomeToneDefaultsVersion: STAGE3_METRONOME_TONE_DEFAULTS_VERSION/);

  const presetSource = getSourceRange("function normalizeMetronomePreset", "function getStoredMetronomePresets");
  assert.match(presetSource, /preset\?\.accentTone \?\? preset\?\.tone \?\? "tick"/);
  assert.match(presetSource, /preset\?\.weakTone \?\? preset\?\.tone \?\? "tick"/);
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
  assert.match(stage3Braille, /stage3DesktopMetronomeSoundToggle/);
  assert.match(stage3Braille, /aria-pressed=\{stage3MetronomeSoundOn\}/);
  assert.match(stage3Braille, /toggleStage3MetronomeSound/);

  const desktopSoundToggle = getSourceRange(
    "const stage3DesktopMetronomeSoundToggle",
    "const appInteractionLocked",
  );
  assert.match(desktopSoundToggle, /stage3MetronomeSoundToggle--desktop/);
  assert.match(desktopSoundToggle, /aria-pressed=\{stage3MetronomeSoundOn\}/);
  assert.match(desktopSoundToggle, /toggleStage3MetronomeSound/);

  assert.match(polishCss, /Rhythm-code-only metronome options/);
  assert.match(polishCss, /stage3StandaloneMetronomeControl[\s\S]*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(polishCss, /@media \(max-width: 767px\)[\s\S]*stage3StandaloneMetronomeControl[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(polishCss, /stage3ReferenceBeatMetronomeStrip/);
  assert.match(
    polishCss,
    /button\.referenceBeatMetronomeDot\.beatDot\s*\{[^}]*background: transparent !important[^}]*pointer-events: auto !important/,
  );
  assert.match(polishCss, /--beat-dot-size: clamp\(26px, 7\.4vw, 30px\)/);
  assert.match(polishCss, /stage3ProgressHud\.stage3ProgressHud[\s\S]*grid-template-columns: 66px minmax\(0, 1fr\) 66px/);
  assert.match(polishCss, /stage3ReferenceBeatMetronomeStrip[\s\S]*grid-column: 2 !important/);
  assert.match(polishCss, /stage3MetronomeSoundToggle[\s\S]*grid-template-columns: 16px minmax\(0, 1fr\)[\s\S]*width: 66px !important/);
  assert.match(polishCss, /stage3MetronomeSoundToggle--mobile/);
  assert.match(
    polishCss,
    /stage3MetronomeSoundToggle--mobile[\s\S]*span \{[\s\S]*font-size: 8px !important;[\s\S]*transform: translateY\(2px\) !important;/,
  );
  assert.match(polishCss, /stage3StandaloneMetronomeControl[\s\S]*metronomeOptionsCollapseButton[\s\S]*top: -2px !important[\s\S]*right: 0 !important/);
  assert.match(polishCss, /metronomeOptionsCollapseButton \{[\s\S]*?height: 22px !important;[\s\S]*?font-size: 10px !important;[\s\S]*?font-weight: 900 !important;/);
  assert.match(polishCss, /metronomeOptions--collapsed[\s\S]*display: flex !important/);
  assert.match(desktopCss, /stage3ReferenceBeatMetronomeStrip \.referenceBeatMetronomeDot\.beatDot \{[\s\S]*--beat-dot-size: clamp\(46px, 3\.15vw, 54px\)/);
  assert.match(desktopCss, /Desktop training and rhythm-code reuse the latest mobile strong \/ weak \/ mute language/);
  assert.match(
    desktopCss,
    /:is\(\.referenceTrainingPanel\.firstPositionTrainingPanel, \.referenceTrainingPanel\.scaleBlockTrainingPanel, \.chordTransitionPanel\)[\s\S]*?\.referenceBeatMetronomeDot\.beatDot--strong \.beatDot__glyph \{[\s\S]*?outline: 1\.5px solid var\(--training-beat-strong\) !important;/,
  );
  assert.match(
    desktopCss,
    /:is\(\.referenceTrainingPanel\.firstPositionTrainingPanel, \.referenceTrainingPanel\.scaleBlockTrainingPanel, \.chordTransitionPanel\)[\s\S]*?\.referenceBeatMetronomeDot\.beatDot--mute \.beatDot__glyph \{[\s\S]*?border-style: dashed !important;[\s\S]*?var\(--training-beat-mute-hatch\)/,
  );
  assert.match(desktopCss, /stage3MetronomeSoundToggle--desktop \{[\s\S]*grid-column: 3 !important/);
});

test("desktop rhythm transport reuses the metronome card without sharing playback controls", () => {
  const stage3Transport = getSourceRange(
    'className={isMobileLayout ? "stage3MobileTransportDeck" : "standaloneMetronomePanel stage3StandaloneTransportDeck"}',
    '<MetronomeControl\n            accentEnabled',
  );

  assert.match(stage3Transport, /<MetronomeTransportCard/);
  assert.match(stage3Transport, /bpmPreviewKey="stage3"/);
  assert.match(stage3Transport, /isPlaying=\{isStage3Playing\}/);
  assert.match(stage3Transport, /isPaused=\{isStage3Paused\}/);
  assert.match(stage3Transport, /onBpmChange=\{changeStage3Bpm\}/);
  assert.match(stage3Transport, /onCardPointerDown=\{handleStage3BpmSwipeStart\}/);
  assert.match(stage3Transport, /onCountInChange=\{changeStage3CountIn\}/);
  assert.match(stage3Transport, /onPause=\{pauseStage3Practice\}/);
  assert.match(stage3Transport, /onResume=\{resumeStage3Practice\}/);
  assert.match(stage3Transport, /onStart=\{startStage3Practice\}/);
  assert.match(stage3Transport, /onStop=\{stopStage3Practice\}/);
  assert.match(stage3Transport, /onTapTempo=\{handleStage3TapTempo\}/);
  assert.match(stage3Transport, /showPause/);
  assert.doesNotMatch(stage3Transport, /onStart=\{startMetronomePractice\}|onStop=\{stopMetronomePlayback\}/);

  const standaloneStart = getSourceRange("const startMetronomePractice", "const resetMetronomePractice");
  assert.match(standaloneStart, /appModeRef\.current !== APP_MODES\.METRONOME/);
  assert.match(standaloneStart, /activeMetronomeScopeRef\.current !== METRONOME_SETTING_SCOPES\.STANDALONE/);

  const stage3Start = getSourceRange("const startStage3Practice", "const showMainMenu");
  assert.match(stage3Start, /selectedCategoryIdRef\.current === "rhythm"/);
  assert.match(stage3Start, /METRONOME_SETTING_SCOPES\.STAGE3/);
  assert.match(stage3Start, /startPractice\(selectedCategory\)/);
  assert.match(stage3Start, /stopPracticeSession\(\)/);
  assert.match(stage3Start, /pauseGame\(\)/);
  assert.match(stage3Start, /resumeGame\(\)/);

  assert.match(desktopCss, /stage3StandaloneTransportDeck > \.metronomeHeroCard--interactive \{[\s\S]*padding: 14px 18px 24px !important/);
  assert.doesNotMatch(desktopCss, /stage3ProgressHud \.stage3StartControlCluster/);
});

test("rhythm code pause preserves its backing position and resumes from the same offset", () => {
  const pauseSource = getSourceRange("const pauseGame", "const resumeGame");
  const resumeSource = getSourceRange("const resumeGame", "const portraitOnlyModeActive");
  const transportSource = getSourceRange("function MetronomeTransportCard", "function MetronomeVisualLabPickSwing");

  assert.match(pauseSource, /backingPausedOffsetSecondsRef\.current = elapsedSeconds % session\.cycleSeconds/);
  assert.match(pauseSource, /stopBackingScheduler\(\)/);
  assert.match(pauseSource, /setState\(GAME_STATES\.PAUSED\)/);
  assert.doesNotMatch(pauseSource, /gameTimeRef\.current = 0/);

  assert.match(resumeSource, /startBackingScheduler\([\s\S]*backingPausedOffsetSecondsRef\.current/);
  assert.match(resumeSource, /setState\(GAME_STATES\.PLAYING\)/);
  assert.match(transportSource, /metronomeHeroPauseButton/);
  assert.match(transportSource, /const pauseVisible = showPause && playbackSessionActive/);
  assert.match(transportSource, /const pauseButton = pauseVisible \?/);
  assert.match(transportSource, /pauseVisible \? "metronomeHeroActionPanel--with-pause"/);
  assert.match(transportSource, /isPaused \? <Play[\s\S]*: <Pause/);
  assert.match(transportSource, /playbackSessionActive \? "STOP"/);
  assert.match(appCss, /stage3BpmActionPanel\.metronomeHeroActionPanel--with-pause[\s\S]*repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(
    responsiveCss,
    /stage3BpmActionPanel \{[\s\S]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)[\s\S]*stage3BpmActionPanel\.metronomeHeroActionPanel--with-pause \{[\s\S]*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/,
  );
  assert.match(mobileDarkCss, /Stage 3 transport states: available actions stay bright/);
  assert.match(
    mobileDarkCss,
    /metronomeHeroCountInButton:not\(\.selected\):not\(\[aria-pressed="true"\]\)[\s\S]*opacity: 0\.58 !important/,
  );
});

test("rhythm code metronome sound controls only the dedicated click track", () => {
  const tickSource = getSourceRange("const playTick", "const playVisualLabTick");
  assert.match(tickSource, /scope === METRONOME_SETTING_SCOPES\.STAGE3/);
  assert.match(tickSource, /stage3MetronomeSoundOnRef\.current/);
  assert.match(tickSource, /stage3MetronomeAccentToneRef\.current/);
  assert.match(tickSource, /stage3MetronomeWeakToneRef\.current/);
  assert.doesNotMatch(tickSource, /backingDrumEnabled|backingBassEnabled|backingPianoEnabled|stopBackingScheduler/);
});

test("mobile rhythm code keeps the braille surface inset and aligns its lower cards", () => {
  assert.match(appCss, /Rhythm-code mobile surface balance/);
  assert.match(
    appCss,
    /chordTransitionHud\.stage3ProgressHud \{[\s\S]*inset 0 3px 7px rgba\(94, 63, 24, 0\.1\)/,
  );
  assert.match(
    appCss,
    /metronomeOptionsCollapsedTitle,[\s\S]*sharedAccompanimentPanel--training[\s\S]*font-size: 13px !important;[\s\S]*font-weight: 1000 !important;/,
  );
  assert.match(
    appCss,
    /stage3DesktopSideColumn[\s\S]*sharedAccompanimentPanel--training \{[\s\S]*radial-gradient\(circle at 50% -18%, rgba\(255, 255, 255, 0\.42\), transparent 48%\)[\s\S]*0 9px 18px rgba\(88, 58, 28, 0\.07\)/,
  );
});

test("mobile portrait single-note and scale braille clears the BPM card", () => {
  assert.match(polishCss, /Mobile portrait note trainers/);
  assert.match(
    polishCss,
    /@media \(max-width: 767px\) and \(orientation: portrait\)[\s\S]*:is\(\.firstPositionTrainingPanel\.referenceTrainingPanel, \.scaleBlockTrainingPanel\.referenceTrainingPanel\)[\s\S]*\.referenceStandaloneMetronomeDeck\.standaloneMetronomePanel[\s\S]*> \.referenceBeatMetronomeStrip[\s\S]*\.beatIndicatorRow \{[\s\S]*transform: translateY\(-6px\) !important;/,
  );
});

test("mobile lower cards open from the metronome headline and clear the fixed navigation", () => {
  const optionsShell = getSourceRange(
    "className={`metronomeOptions",
    "{optionsCollapsed ? (",
  );
  assert.match(optionsShell, /optionsCollapsed && onOptionsCollapseChange[\s\S]*onOptionsCollapseChange\(false\)/);
  assert.match(appSource, /event\.stopPropagation\(\);[\s\S]*onOptionsCollapseChange\(!optionsCollapsed\)/);
  assert.match(
    appCss,
    /metronomeOptions\.metronomeOptions--collapsed \{[\s\S]*cursor: pointer !important/,
  );
  assert.match(
    appCss,
    /sharedAccompanimentPanel--training[\s\S]*miniChordBackingRow \{[\s\S]*rgba\(235, 219, 194, 0\.56\)/,
  );
  assert.match(
    appCss,
    /sharedAccompanimentPanel--training\[open\][\s\S]*min-height: calc\(100dvh \+ 172px \+ env\(safe-area-inset-bottom, 0px\)\) !important;[\s\S]*scroll-padding-bottom: calc\(188px \+ env\(safe-area-inset-bottom, 0px\)\) !important/,
  );
  assert.match(
    appCss,
    /Metronome options alone only need the original short scroll runway[\s\S]*metronomeOptions:not\(\.metronomeOptions--collapsed\)[\s\S]*min-height: calc\(100dvh \+ 64px\) !important/,
  );
});

test("compound meters keep numerator pulses and use denominator-aware triple grouping", () => {
  assert.match(appSource, /\{ id: "3\/4", label: "3\/4", beats: 3, beatUnit: 4 \}/);
  assert.match(appSource, /\{ id: "6\/8", label: "6\/8", beats: 6, beatUnit: 8 \}/);
  assert.match(appSource, /\{ id: "12\/8", label: "12\/8", beats: 12, beatUnit: 8 \}/);

  const backingCompilerSource = getSourceRange(
    "const createBackingTimelineEvents",
    "const METRONOME_BEAT_STATES",
  );
  assert.match(backingCompilerSource, /const beatsPerMeasure = signature\.beats/);
  assert.match(backingCompilerSource, /signature\.beatUnit === 8 && beatsPerMeasure % 3 === 0[\s\S]*\? 3[\s\S]*: 4/);
});

test("rhythm code visuals, chord changes, click track, and accompaniment share the Web Audio clock", () => {
  const frameSource = getSourceRange("const runChordTransitionFrame", "const runMetronomeFrame");
  const schedulerSource = getSourceRange("const runBackingScheduler", "const stopMetronomeVisualLab");
  const backingCompilerSource = getSourceRange(
    "const createBackingTimelineEvents",
    "const METRONOME_BEAT_STATES",
  );
  const bpmSource = getSourceRange("const changeBpm", "const changeMetronomeAccentTone");

  assert.match(frameSource, /getRhythmChordPlaybackPosition\(\{/);
  assert.match(frameSource, /audioTime: audio\.currentTime/);
  assert.match(frameSource, /rhythmChordPosition\.chordIndex/);
  assert.match(frameSource, /playStage3PatternTick\(beatInBar, subdivisionIndex\)/);
  assert.doesNotMatch(frameSource, /setInterval|setTimeout/);

  assert.match(schedulerSource, /eventTime = backingCycleStartTimeRef\.current \+ event\.offsetSeconds/);
  assert.match(schedulerSource, /backingCycleStartTimeRef\.current \+= session\.cycleSeconds/);
  assert.match(schedulerSource, /backingDisplayStartTimeRef\.current = backingCycleStartTimeRef\.current/);
  assert.match(schedulerSource, /BACKING_SCHEDULE_AHEAD_SECONDS/);
  assert.match(schedulerSource, /backingPendingSwitchTimeRef\.current/);
  assert.match(schedulerSource, /window\.setInterval\(runBackingScheduler, 25\)/);

  assert.match(backingCompilerSource, /playbackCycleBeats \* beatSeconds/);
  assert.match(backingCompilerSource, /muteRhythmChordRestEvents\(/);
  assert.match(backingCompilerSource, /rhythmChordPlayback\.timeline/);

  assert.match(bpmSource, /isLiveRhythmPractice/);
  assert.match(bpmSource, /requestStage3BackingPatternChange\(\{\}, \{/);
  assert.match(bpmSource, /bpmValue: nextBpm/);
  assert.match(bpmSource, /deferSessionUpdate: true/);
});
