import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appUrl = new URL("../src/App.jsx", import.meta.url);
const cssUrl = new URL("../src/layouts/responsive-play-focus.css", import.meta.url);
const polishUrl = new URL("../src/polish.css", import.meta.url);
const mobileLayoutUrl = new URL("../src/layouts/mobileLayout.js", import.meta.url);
const sharedAccompanimentUrl = new URL("../src/rhythm/SharedAccompanimentPanel.jsx", import.meta.url);

test("landscape practice reuses the mounted controls in dedicated left and right workstations", async () => {
  const appSource = await readFile(appUrl, "utf8");

  assert.match(appSource, /const stage3LandscapeLoadToolbar = \(/);
  assert.match(appSource, /<div className="stage3PracticeUtilityPanel">[\s\S]*?\{stage3LandscapeLoadToolbar\}/);
  assert.doesNotMatch(appSource, /landscapePlayFocus \? stage3LandscapeLoadToolbar : null/);
  assert.match(appSource, /const referenceLandscapeBeatStrip = \(/);
  assert.match(appSource, /hasDirectionPractice && \(landscapePlayFocus \|\| !isMobileLayout\) \? referenceLandscapeBeatStrip : null/);
  assert.match(appSource, /isMobileLayout && !landscapePlayFocus \? referenceLandscapeBeatStrip : null/);
});

test("mobile landscape fretboard omits the shared bottom navigation", async () => {
  const appSource = await readFile(appUrl, "utf8");

  assert.match(appSource, /const hideFretboardLandscapeNavigation = appMode === APP_MODES\.FRETBOARD_VIEWER[\s\S]*?&& viewportProfile\.isLandscape[\s\S]*?&& viewportProfile\.isMobileSurface/);
  assert.match(appSource, /appMode !== APP_MODES\.MENU[\s\S]*?!hideFretboardLandscapeNavigation[\s\S]*?<section className="hud">/);
});

test("mobile landscape workstations use grid columns, safe areas, and isolated scrolling", async () => {
  const css = await readFile(cssUrl, "utf8");

  assert.match(css, /Mobile landscape workstation V2/);
  assert.match(css, /grid-template-columns: minmax\(0, 3fr\) minmax\(248px, 2fr\) !important/);
  assert.match(css, /stage3LoadToolbar[\s\S]*grid-template-columns: minmax\(0, 1fr\) minmax\(0, 1fr\) 70px !important/);
  assert.match(css, /stage3DesktopSideColumn[\s\S]*overflow-y: auto !important/);
  assert.match(css, /referenceTrainingMainRow > \.referenceTrainingToolbar\.referenceTrainingToolbar[\s\S]*overflow-y: auto !important/);
  assert.match(css, /safe-area-inset-left/);
  assert.match(css, /safe-area-inset-right/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(css, /--landscape-nav-height: 0px/);
  assert.match(css, /--landscape-stage-height: 100dvh/);
  assert.match(css, /viewport-mobile-surface\.landscapePlayFocus > \.hud\.hud,[\s\S]*display: none !important/);
  assert.match(css, /desktopWorkspace:has\(main\.app\.viewport-mobile-surface\.landscapePlayFocus\)/);
  assert.doesNotMatch(css, /\.stage3LoadToolbar[^{]*\{[^}]*position:\s*(?:absolute|fixed)/s);
});

test("standalone metronome keeps backing transport and recorder controls in the right rail", async () => {
  const css = await readFile(cssUrl, "utf8");

  assert.match(css, /metronomeMode\.viewport-mobile-surface\.landscapePlayFocus[\s\S]*grid-template-columns: minmax\(0, 3fr\) minmax\(248px, 2fr\) !important/);
  assert.match(css, /> \.standaloneMetronomePanel > \.backingLoopPanel[\s\S]*grid-column: 2 !important/);
  assert.match(css, /backingLoopMainControls[\s\S]*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\) !important/);
  assert.match(css, /backingLoopRecorderHardware[\s\S]*display: none !important/);
  assert.match(css, /metronomeHeroCard\.metronomeHeroCard--interactive[\s\S]*grid-template-rows: minmax\(0, 1fr\) 40px !important/);
  assert.match(css, /metronomeAdvancedDock[\s\S]*border-radius: 7px !important[\s\S]*overflow: hidden !important/);
  assert.match(css, /backingLoopPlayerBar[\s\S]*display: grid !important[\s\S]*grid-template-columns: minmax\(96px, 1\.15fr\) 54px minmax\(84px, 1fr\) !important/);
  assert.match(css, /> \.standaloneMetronomePanel > \.backingLoopPanel[\s\S]*height: min\(100%, clamp\(156px, 42dvh, 164px\)\) !important/);
  assert.match(css, /backingLoopPlayerBar[\s\S]*border-radius: 12px !important[\s\S]*inset 0 3px 8px rgba\(8, 5, 4, 0\.66\)/);
  assert.match(css, /backingLoopPlayerIconButton, \.backingLoopVolumeMute\)[\s\S]*inset 0 2px 4px rgba\(7, 5, 4, 0\.68\)/);
  assert.match(css, /backingLoopPlaylistToggle[\s\S]*inset 0 2px 5px rgba\(7, 5, 4, 0\.7\)/);
  assert.match(css, /backingLoopPlayerPlayButton[\s\S]*height: 40px !important/);
  assert.match(css, /Standalone metronome mobile landscape composition/);
  assert.match(css, /grid-template-rows: repeat\(14, minmax\(0, 1fr\)\) !important/);
  assert.match(css, /metronomeBeatMatrix\.metronomeBeatMatrix--main[\s\S]*grid-row: 1 \/ 10 !important/);
  assert.match(css, /metronomeHeroCard\.metronomeHeroCard--interactive[\s\S]*grid-row: 10 \/ 15 !important/);
  assert.match(css, /metronomeAdvancedDock\.metronomeAdvancedDock[\s\S]*grid-row: 1 \/ 4 !important/);
  assert.match(css, /standaloneMetronomeControl\.standaloneMetronomeControl[\s\S]*grid-row: 4 \/ 9 !important/);
  assert.match(css, /backingLoopPanel\.backingLoopPanel[\s\S]*grid-row: 9 \/ 15 !important[\s\S]*grid-template-rows: minmax\(0, 1fr\) clamp\(48px, 14dvh, 118px\) !important/);
  assert.match(css, /backingLoopTrackText strong[\s\S]*color: rgba\(255, 235, 194, 0\.96\) !important/);
  assert.match(css, /backingLoopRepeatButton\[data-repeat-mode="sequential"\][\s\S]*backingLoopShuffleButton:not\(\.active\)[\s\S]*background: rgba\(255, 255, 255, 0\.035\) !important[\s\S]*color: rgba\(226, 226, 226, 0\.62\) !important/);
  assert.match(css, /backingLoopRepeatButton\[data-repeat-mode="repeat-all"\][\s\S]*backingLoopShuffleButton\.active[\s\S]*background: rgba\(255, 255, 255, 0\.18\) !important[\s\S]*color: rgba\(255, 255, 255, 0\.98\) !important/);
  assert.match(css, /backingLoopPlayerModes[\s\S]*backingLoopRepeatButton\[data-repeat-mode="sequential"\][\s\S]*> svg \{[\s\S]*stroke: rgba\(226, 226, 226, 0\.62\) !important/);
  assert.match(css, /backingLoopRepeatButton\[data-repeat-mode="sequential"\][\s\S]*backingLoopShuffleButton:not\(\.active\)[\s\S]*\):focus-visible \{[\s\S]*outline-color: rgba\(226, 226, 226, 0\.28\) !important/);
  assert.match(css, /backingLoopRepeatButton\[data-repeat-mode="repeat-all"\][\s\S]*backingLoopShuffleButton\.active[\s\S]*\):focus-visible \{[\s\S]*outline-color: rgba\(255, 255, 255, 0\.78\) !important/);
  assert.match(css, /Standalone metronome short landscape:[\s\S]*metronomeHeroActionPanel[\s\S]*position: relative !important/);
  assert.match(css, /Standalone metronome short landscape:[\s\S]*backingLoopPanel\.backingLoopPanel[\s\S]*grid-template-rows: minmax\(0, 1fr\) 45px !important/);
  assert.match(css, /Standalone metronome short landscape:[\s\S]*backingLoopPlayerBar[\s\S]*display: flex !important[\s\S]*background: transparent !important[\s\S]*box-shadow: none !important/);
  assert.match(css, /--metronome-backing-small-control: 29px[\s\S]*--metronome-backing-play-control: 41px[\s\S]*--metronome-backing-list-control: 54px/);
});

test("scale landscape prioritizes the portrait-style backing player", async () => {
  const [css, polish] = await Promise.all([
    readFile(cssUrl, "utf8"),
    readFile(polishUrl, "utf8"),
  ]);

  assert.match(css, /Scale practice mobile landscape/);
  assert.match(css, /scaleBlockTrainingPanel\.referenceTrainingPanel[\s\S]*grid-template-rows: minmax\(0, 1fr\) 60px !important/);
  assert.match(css, /referenceStandaloneMetronomeDeck\.referenceStandaloneMetronomeDeck[\s\S]*clamp\(74px, 21dvh, 84px\)[\s\S]*minmax\(0, 1fr\) !important/);
  assert.match(css, /scaleTrainingBackingLoop > \.backingLoopPanel\.backingLoopPanel[\s\S]*grid-template-rows: minmax\(0, 1fr\) 45px !important/);
  assert.match(css, /scaleBlockTrainingPanel\.referenceTrainingPanel[\s\S]*referenceTrainingBoard > \.trainingSharedFretboard[\s\S]*--fretboard-board-height: calc\(100% - var\(--fretboard-board-top\) - var\(--fretboard-board-bottom\)\) !important/);
  assert.match(css, /scaleBlockTrainingPanel\.referenceTrainingPanel[\s\S]*referenceTrainingBoard > \.trainingSharedFretboard \.fretboardComponentScroller[\s\S]*height: 100% !important[\s\S]*overflow: hidden !important/);
  assert.match(css, /backingLoopMainControls\.backingLoopMainControls--mobile[\s\S]*display: grid !important[\s\S]*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\) !important/);
  assert.match(css, /scaleTrainingBackingLoop \.backingLoopTrackText strong[\s\S]*font-size: 10\.5px !important[\s\S]*line-height: 10\.5px !important/);
  assert.match(css, /backingLoopRepeatButton\[data-repeat-mode="sequential"\][\s\S]*color: rgba\(255, 241, 211, 0\.7\) !important/);
  assert.match(css, /max-width: 780px[\s\S]*--scale-backing-small-control: 27px[\s\S]*--scale-backing-list-control: 50px/);
  assert.match(css, /backingLoopMainControls \.backingLoopButton[\s\S]*height: 41px !important[\s\S]*border-radius: 1px !important[\s\S]*font-size: 11px !important/);
  assert.match(css, /scaleBlockTrainingPanel\.referenceTrainingPanel[\s\S]*referenceMetronomeActionPanel\.referenceMetronomeActionPanel[\s\S]*border-radius: 12px !important/);
  assert.match(polish, /Backing Loop mini player:[\s\S]*@media \(max-width: 767px\), \(orientation: landscape\) and \(max-height: 500px\)/);
});

test("single-note landscape mirrors the reference two-panel composition", async () => {
  const css = await readFile(cssUrl, "utf8");

  assert.match(css, /Single-note mobile landscape: mirror the reference composition/);
  assert.match(css, /firstPositionTrainingPanel\.referenceTrainingPanel[\s\S]*grid-template-columns: minmax\(0, 1\.75fr\) minmax\(248px, 1fr\) !important/);
  assert.match(css, /firstPositionTrainingPanel\.referenceTrainingPanel[\s\S]*grid-template-rows: minmax\(0, 1fr\) clamp\(88px, 22dvh, 166px\) !important/);
  assert.match(css, /referenceTrainingMainRow::before[\s\S]*grid-column: 1 !important[\s\S]*grid-row: 1 \/ -1 !important/);
  assert.match(css, /trainingSharedFretboard[\s\S]*--fretboard-board-height: calc\(100% - var\(--fretboard-board-top\) - var\(--fretboard-board-bottom\)\) !important/);
  assert.match(css, /referenceTrainingToolbar > \.referenceStandaloneMetronomeDeck\.referenceStandaloneMetronomeDeck[\s\S]*grid-template-rows: minmax\(0, 1\.04fr\) minmax\(0, 1fr\) !important/);
  assert.match(css, /referenceTrainingToolbar\.referenceTrainingToolbar[\s\S]*scrollbar-gutter: auto !important/);
  assert.match(css, /firstPositionTrainingPanel\.referenceTrainingPanel[\s\S]*button\.metronomeHeroPlayButton[\s\S]*grid-column: 2 !important[\s\S]*order: 2 !important/);
  assert.match(css, /firstPositionTrainingPanel\.referenceTrainingPanel[\s\S]*button\.metronomeHeroTapTempoButton[\s\S]*grid-column: 1 !important[\s\S]*order: 1 !important/);
  assert.match(css, /firstPositionTrainingPanel\.referenceTrainingPanel[\s\S]*referenceMetronomeActionPanel\.referenceMetronomeActionPanel::before[\s\S]*display: none !important[\s\S]*content: none !important/);
  assert.match(css, /firstPositionTrainingPanel\.referenceTrainingPanel[\s\S]*metronomeBpmAdjustGroup > button[\s\S]*border: 0 !important[\s\S]*background: transparent !important[\s\S]*box-shadow: none !important/);
  assert.match(css, /referenceMetronomeHeroCard \.metronomeBpmAdjustDivider[\s\S]*visibility: visible !important[\s\S]*width: 58% !important[\s\S]*height: 1px !important/);
  assert.match(css, /referenceStandaloneMetronomeControl > \.metronomeOptions\.metronomeOptions--splitTone[\s\S]*height: 100% !important/);
});

test("rhythm-code landscape reserves the left rail for progression and fretboard growth", async () => {
  const [appSource, css, sharedAccompanimentSource] = await Promise.all([
    readFile(appUrl, "utf8"),
    readFile(cssUrl, "utf8"),
    readFile(sharedAccompanimentUrl, "utf8"),
  ]);

  assert.match(css, /Rhythm code:[\s\S]*grid-template-rows: minmax\(0, 1fr\) !important/);
  assert.match(css, /stage3DesktopSideColumn \.stage3LoadToolbar[\s\S]*grid-template-columns: minmax\(0, 1fr\) minmax\(0, 1fr\) 70px !important/);
  assert.match(css, /stage3DesktopPrimaryColumn[\s\S]*grid-row: 1 !important[\s\S]*grid-template-rows: minmax\(0, 1fr\) 62px !important/);
  assert.match(css, /stage3DesktopPrimaryColumn \.chordTransitionChart[\s\S]*grid-template-rows: 82px minmax\(0, 1fr\) !important/);
  assert.match(css, /stage3EmptyProgressionReadout[\s\S]*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\) !important[\s\S]*grid-template-rows: repeat\(2, 28px\) !important/);
  assert.match(css, /stage3DesktopPrimaryColumn \.currentProgressionReadout[\s\S]*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\) !important[\s\S]*height: 59px !important/);
  assert.match(css, /stage3ReferenceBeatMetronomeStrip \.referenceBeatMetronomeDot\.beatDot[\s\S]*--beat-dot-size: clamp\(26px, 3\.25vw, 29px\) !important/);
  assert.match(css, /stage3ReferenceBeatMetronomeStrip \.referenceBeatMetronomeDot\.beatDot \{[\s\S]*pointer-events: auto !important[\s\S]*touch-action: manipulation !important/);
  assert.match(css, /stage3ReferenceBeatMetronomeStrip \.beatIndicatorRow \{\s*transform: translateX\(36px\) !important/);
  assert.match(css, /stage3BpmTransportCard[\s\S]*metronomeBpmAdjustDivider[\s\S]*display: block !important/);
  assert.match(css, /metronomeOptions--headerToggle[\s\S]*grid-template-rows: 40px !important/);
  assert.match(css, /metronomeOptions\.metronomeOptions--headerToggle:not\(\.metronomeOptions--collapsed\) \{[\s\S]*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\) !important[\s\S]*grid-template-rows: 36px 42px !important/);
  assert.match(css, /stage3ReferenceBeatMetronomeStrip \.referenceBeatMetronomeDot\.beatDot--strong \.beatDot__glyph \{[\s\S]*outline: 1\.5px solid var\(--training-beat-strong\) !important/);
  assert.match(css, /stage3ReferenceBeatMetronomeStrip \.referenceBeatMetronomeDot\.beatDot--mute \.beatDot__glyph \{[\s\S]*border-style: dashed !important/);
  assert.match(css, /stage3StandaloneMetronomeControl[\s\S]*metronomeSelectControl--toneSlot \.metronomeSelectLabelDot--strong \{[\s\S]*outline: 1px solid var\(--training-beat-strong\) !important/);
  assert.match(css, /stage3StandaloneMetronomeControl[\s\S]*min-height: 42px !important/);
  assert.match(css, /sharedAccompanimentPanel--training[\s\S]*min-height: 42px !important[\s\S]*miniChordBackingRow[\s\S]*rgba\(235, 219, 194, 0\.56\) !important/);
  assert.match(css, /sharedAccompanimentPanel--training > summary::after[\s\S]*content: "" !important/);
  assert.match(css, /:is\(\.firstPositionTrainingPanel\.referenceTrainingPanel, \.scaleBlockTrainingPanel\.referenceTrainingPanel\)[\s\S]*\.referenceTrainingMainRow > \.referenceBeatMetronomeStrip[\s\S]*radial-gradient\(circle at 50% 18%, rgba\(216, 151, 165, 0\.08\), transparent 62%\)/);
  assert.match(appSource, /optionsHeaderToggle=\{landscapePlayFocus\}/);
  assert.match(appSource, /toneControlsAfterSubdivision=\{landscapePlayFocus\}/);
  assert.match(appSource, /hidePartSummary=\{landscapePlayFocus\}/);
  assert.match(appSource, /activateDotsOnPointerUp=\{landscapePlayFocus\}/);
  assert.match(appSource, /event\.pointerType !== "touch" && event\.pointerType !== "pen"/);
  assert.match(appSource, /onPointerUp=\{handlePointerUp\}/);
  assert.match(appSource, /Array\.from\(\{ length: landscapePlayFocus \? 8 : 4 \}/);
  assert.match(sharedAccompanimentSource, /<span>반주 사운드<\/span>/);
  assert.match(sharedAccompanimentSource, /!hidePartSummary \? <b>드럼 · 베이스 · 피아노<\/b> : null/);
});

test("temporary viewport testing does not change the production compact-width fallback", async () => {
  const mobileLayoutSource = await readFile(mobileLayoutUrl, "utf8");

  assert.match(mobileLayoutSource, /MOBILE_LAYOUT_MAX_WIDTH = 680/);
});
