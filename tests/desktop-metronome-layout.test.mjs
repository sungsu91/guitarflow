import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const desktopStyleUrl = new URL("../src/layouts/desktop-layout.css", import.meta.url);
const desktopLayoutUrl = new URL("../src/layouts/DesktopLayout.jsx", import.meta.url);
const appUrl = new URL("../src/App.jsx", import.meta.url);

test("desktop metronome uses one shared tree in a monitor-width workspace", async () => {
  const styles = await readFile(desktopStyleUrl, "utf8");

  assert.match(styles, /\.desktopLayout \.desktopWorkspaceContent > main\.app\.app\.app\.metronomeMode/);
  assert.match(styles, /grid-template-areas:\s*"advanced advanced"\s*"visual visual"\s*"transport transport"\s*"controls backing"/);
  assert.match(styles, /> \.metronomeBeatMatrix--main \{[\s\S]*grid-area: visual/);
  assert.match(styles, /> \.metronomeHeroCard--interactive \{[\s\S]*grid-area: transport/);
  assert.match(styles, /> \.standaloneMetronomeControl \{[\s\S]*grid-area: controls/);
  assert.match(styles, /> \.standaloneMetronomeControl \{[\s\S]*align-self: stretch/);
  assert.match(styles, /> \.standaloneMetronomeControl[\s\S]*> \.metronomeOptions\.metronomeOptions--splitTone \{[\s\S]*grid-template-rows: repeat\(2, minmax\(0, 1fr\)\) !important[\s\S]*height: 100% !important/);
  assert.match(styles, /> \.metronomeOptions\.metronomeOptions--splitTone[\s\S]*> \.metronomeSelectControl\.metronomeSelectControl \{[\s\S]*grid-template-rows: 15px minmax\(48px, 1fr\) !important/);
  assert.match(styles, /button\.metronomeSelectButton\.metronomeSelectButton \{[\s\S]*height: 100% !important[\s\S]*min-height: 48px !important/);
  assert.match(styles, /> \.backingLoopPanel \{[\s\S]*grid-area: backing/);
  assert.match(styles, /backingLoopPanel--standaloneDesktop[\s\S]*\.backingLoopMainControls[\s\S]*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(styles, /--desktop-metronome-visual-height: clamp\(184px, calc\(100dvh - 788px\), 292px\)/);
  assert.match(styles, /\.metronomeBeatMatrix--beats-12[\s\S]*--beat-dot-touch: clamp\(40px/);
  assert.match(styles, /--desktop-metronome-circle-radius: clamp\([\s\S]*112px/);
  assert.match(styles, /@media \(min-width: 1024px\) and \(min-height: 720px\)[\s\S]*--desktop-metronome-visual-height: clamp\(300px, calc\(100dvh - 570px\), 494px\)[\s\S]*padding-bottom: clamp\(0px, calc\(882px - 100dvh\), 82px\) !important/);
  assert.match(styles, /> \.metronomeBeatMatrix--main \{[\s\S]*padding-bottom: 58px !important/);
  assert.match(styles, /> \.metronomeBeatMatrix--main\.metronomeBeatMatrix--circle \{[\s\S]*padding: 20px clamp\(28px, 3vw, 48px\) 66px !important/);
  assert.match(styles, /--beat-dot-touch: clamp\(28px, calc\(\(var\(--desktop-metronome-visual-height\) - 140px\) \/ 5\.7\), 64px\)/);
  assert.match(styles, /\.backingLoopMiniPlayer--desktop \{[\s\S]*grid-template-rows: 31px 8px 41px !important[\s\S]*height: 94px !important/);
  assert.match(styles, /\.backingLoopMiniPlayer--desktop[\s\S]*\.backingLoopPlayerPlayButton \{[\s\S]*width: 41px !important[\s\S]*background: linear-gradient\(155deg, #fffdf6, #e3cc9f\) !important/);
  assert.match(styles, /\.backingLoopPlayerBar \{[\s\S]*display: flex !important[\s\S]*justify-content: center !important[\s\S]*gap: 10px !important/);
});

test("desktop supporting panels move beside the unchanged mobile-first content", async () => {
  const [styles, appSource] = await Promise.all([
    readFile(desktopStyleUrl, "utf8"),
    readFile(appUrl, "utf8"),
  ]);

  assert.match(styles, /--desktop-training-control-width: clamp\(368px, 29vw, 448px\)/);
  assert.match(styles, /\.referenceTrainingMainRow \{[\s\S]*grid-template-columns: minmax\(0, 1fr\) var\(--desktop-training-control-width\)/);
  assert.match(styles, /> \.referenceTrainingMainRow > \.referenceTrainingToolbar \{[\s\S]*grid-column: 2[\s\S]*grid-row: 1 \/ 3/);
  assert.match(styles, /> \.referenceTrainingMainRow > \.referenceTrainingBoard \{[\s\S]*grid-column: 1[\s\S]*grid-row: 1/);
  assert.match(styles, /\.referenceTrainingPanel\.firstPositionTrainingPanel[\s\S]*> \.referenceTrainingMainRow > \.referenceTrainingToolbar > \.trainingStandaloneMetronomeDeck \{[\s\S]*align-content: center !important/);
  assert.match(styles, /> \.referenceTrainingPanel:is\(\.firstPositionTrainingPanel, \.scaleBlockTrainingPanel\)[\s\S]*> \.referenceTrainingMainRow \{[\s\S]*row-gap: 0 !important[\s\S]*column-gap: var\(--desktop-training-gap\) !important/);
  assert.match(styles, /> \.referenceTrainingMainRow > \.referenceBeatMetronomeStrip \{[\s\S]*border-top: 0 !important[\s\S]*border-top-right-radius: 0 !important/);
  assert.match(styles, /\.referenceTrainingBoard \.trainingSharedFretboard \{[\s\S]*aspect-ratio: 2\.58 \/ 1/);
  assert.match(styles, /\.scaleBlockTrainingPanel \.stage2HeaderScalePicker \.referenceScalePicker \{[\s\S]*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(styles, /> \.referenceTrainingToolbar > \.trainingStandaloneMetronomeDeck \{[\s\S]*grid-auto-rows: max-content/);
  assert.match(styles, /\.trainingStandaloneMetronomeDeck > :is\([\s\S]*\.backingLoopPanel[\s\S]*\) \{[\s\S]*width: 100% !important/);
  assert.match(styles, /\.scaleBlockTrainingPanel[\s\S]*\.trainingStandaloneMetronomeDeck[\s\S]*> \.backingLoopPanel--desktop\.backingLoopPanel--standaloneDesktop \{[\s\S]*grid-template-columns: minmax\(0, 1fr\) !important[\s\S]*overflow: hidden !important/);
  assert.match(styles, /@media \(max-width: 1439px\), \(max-height: 820px\)[\s\S]*padding-bottom: 94px/);
  assert.match(styles, /background: var\(--riff-surface-shell\) !important/);
  assert.doesNotMatch(styles, /grid-template-areas:\s*"board hero"\s*"board controls"/);
  assert.match(appSource, /hasDirectionPractice && \(landscapePlayFocus \|\| !isMobileLayout\) \? referenceLandscapeBeatStrip : null/);
  assert.match(appSource, /isMobileLayout && !landscapePlayFocus \? referenceLandscapeBeatStrip : null/);
  assert.match(styles, /--desktop-stage3-control-width: clamp\(400px, 31vw, 470px\)/);
  assert.match(styles, /> \.chordTransitionPanel \{[\s\S]*grid-template-columns: minmax\(0, 1fr\) var\(--desktop-stage3-control-width\)/);
  assert.match(styles, /> \.chordTransitionPanel > \.stage3DesktopPrimaryColumn \{[\s\S]*--desktop-stage3-work-width: 100%[\s\S]*--desktop-stage3-progression-width: 96%[\s\S]*grid-template-rows: minmax\(0, 1fr\) clamp\(114px, 12vh, 128px\)[\s\S]*background: var\(--riff-surface-panel\)/);
  assert.match(styles, /\.stage3DesktopPrimaryColumn \.chordTransitionChart \{[\s\S]*grid-template-rows: 22px clamp\(96px, 11vh, 112px\) minmax\(0, 1fr\)[\s\S]*background: transparent !important/);
  assert.match(styles, /\.stage3DesktopProgressionHeading \{[\s\S]*grid-row: 1[\s\S]*width: var\(--desktop-stage3-progression-width\)/);
  assert.match(styles, /\.stage3ProgressionHeader \{[\s\S]*grid-row: 2[\s\S]*width: var\(--desktop-stage3-progression-width\) !important[\s\S]*border: 0 !important[\s\S]*background: transparent !important/);
  assert.match(styles, /\.stage3ProgressionHeader \.currentProgressionReadout \{[\s\S]*--desktop-stage3-progression-gap: clamp\(16px, 1\.8vw, 32px\)/);
  assert.match(styles, /\.stage3ProgressionHeader \.rhythmChordMeasure \{[\s\S]*var\(--desktop-stage3-progression-gap\)[\s\S]*min-height: 84px !important[\s\S]*background: var\(--riff-control-rest\) !important/);
  assert.match(styles, /\.stage3EmptyProgressionReadout \{[\s\S]*grid-row: 2[\s\S]*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\) !important[\s\S]*width: var\(--desktop-stage3-progression-width\) !important/);
  assert.match(styles, /\.stageChordSharedFretboard \{[\s\S]*grid-row: 3[\s\S]*align-self: stretch[\s\S]*width: var\(--desktop-stage3-work-width\) !important[\s\S]*max-width: none !important/);
  assert.match(styles, /\.stage3ProgressHud \{[\s\S]*grid-template-rows: minmax\(94px, 1fr\) !important[\s\S]*border: 1px solid var\(--riff-border-soft\) !important[\s\S]*background: var\(--riff-surface-panel-raised\) !important/);
  assert.match(styles, /\.stage3DesktopBeatHeading \{[\s\S]*grid-column: 1[\s\S]*grid-row: 1/);
  assert.match(styles, /\.stage3ProgressHud \.stage3ReferenceBeatMetronomeStrip \{[\s\S]*grid-row: 1 !important[\s\S]*border: 0 !important[\s\S]*background: transparent !important/);
  assert.match(styles, /\.stage3ReferenceBeatMetronomeStrip \.referenceBeatMetronomeDot\.beatDot \{[\s\S]*--beat-dot-size: clamp\(46px, 3\.15vw, 54px\)/);
  assert.match(styles, /\.stage3ProgressHud \.stage3MetronomeSoundToggle--desktop \{[\s\S]*grid-column: 3 !important[\s\S]*width: clamp\(96px, 7vw, 110px\) !important[\s\S]*height: 56px !important/);
  assert.match(styles, /\.stage3StandaloneTransportDeck \{[\s\S]*background: transparent !important/);
  assert.match(styles, /\.stage3StandaloneTransportDeck > \.metronomeHeroCard--interactive \{[\s\S]*min-height: 150px !important/);
  assert.match(styles, /\.stage3StandaloneTransportDeck[\s\S]*> \.metronomeHeroCard--interactive::before,[\s\S]*> \.metronomeHeroCard--interactive::after \{[\s\S]*display: none !important/);
  assert.match(styles, /\.stage3StandaloneBpmActionPanel > \.metronomeHeroTapTempoButton \{\s*grid-column: 1/);
  assert.match(styles, /button\.stage3CountInToggle\.countInToggleButton \{[\s\S]*background: transparent !important/);
  assert.match(styles, /\.stage3DesktopSideColumn > :is\([\s\S]*\.sharedAccompanimentPanel--training[\s\S]*background: var\(--riff-surface-panel\) !important/);
  assert.match(appSource, /className=\{isMobileLayout \? "stage3MobileTransportDeck" : "standaloneMetronomePanel stage3StandaloneTransportDeck"\}/);
  assert.match(appSource, /cardClassName=\{isMobileLayout \? "stage3BpmTransportCard" : ""\}/);
  assert.match(appSource, /actionOrder="tap-play"/);
  assert.match(appSource, /isMobileLayout && landscapePlayFocus \? \([\s\S]*stage3StartControlCluster--focus/);
  assert.match(appSource, /\) : !isMobileLayout \? stage3DesktopMetronomeSoundToggle : null\}/);
  assert.match(appSource, /cardClassName=\{isMobileLayout \? "referenceMetronomeHeroCard" : ""\}/);
  assert.match(appSource, /selectedCategory\.id === "scale-block" \? \(\s*!isMobileLayout \? \(\s*<BackingLoop\s+desktopPresentation="standalone"\s+mobile=\{false\}\s+ownerMode=\{APP_MODES\.PRACTICE\}/);
  assert.doesNotMatch(appSource, /className="stage3CollapsedBpmControl"/);
  assert.doesNotMatch(appSource, /stage3ProgressionHeader--empty/);
  assert.match(appSource, /className="stage3DesktopProgressionHeading">코드 진행/);
  assert.match(appSource, /className="stage3DesktopBeatHeading">박자 진행/);
  assert.match(appSource, /data-measure-number=\{measure\.measureIndex \+ 1\}/);
  assert.match(appSource, /data-measure-state=\{!isMobileLayout \? \(isCurrentMeasure \? "current" : "upcoming"\) : undefined\}/);
  assert.match(appSource, /data-progression-state=\{isMobileLayout \? \(isCurrentChord \? "current" : isNextChord \? "next" : "upcoming"\) : undefined\}/);
  assert.match(styles, /\.rhythmChordMeasure > button \+ button \{\s*border-left: 0 !important/);
  assert.match(styles, /\.rhythmChordMeasure\.active \{[\s\S]*border-color: var\(--riff-border-selected\) !important/);
  assert.match(styles, /\.miniChordMakerPanel\.miniChordMakerPanelCompact[\s\S]*grid-template-columns: minmax\(0, 1fr\) minmax\(360px, 420px\)/);
  assert.match(styles, /--desktop-fretboard-catalog-width: clamp\(720px, 53%, 920px\)/);
  assert.match(styles, /html:has\(body \.desktopLayout \.fretboardViewerPanel--desktopUnified\) \{[\s\S]*scrollbar-gutter: stable/);
  assert.match(styles, /\.fretboardViewerPanel\.fretboardViewerPanel--desktopUnified[\s\S]*grid-template-columns: minmax\(0, 1fr\) var\(--desktop-fretboard-catalog-width\)/);
  assert.match(styles, /> \.fretboardViewerPanel--desktopUnified[\s\S]*> \.viewerControlPanel \{[\s\S]*grid-column: 1[\s\S]*width: 100% !important/);
  assert.match(styles, /\.fretboardViewerPanel--desktopUnified\.fretboardViewerPanel:not\(\.fretboardViewerPanel--chord\)[\s\S]*grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(styles, /> :is\(\.viewerMapCard, \.viewerModeControlSlot\) \{[\s\S]*width: min\(980px, 100%\) !important/);
  assert.match(styles, /\.fretboardViewerPanel--desktopUnified\.fretboardViewerPanel\.fretboardViewerPanel[\s\S]*> \.viewerModeTabs\.viewerModeTabs[\s\S]*height: 56px !important/);
  assert.match(styles, /main\.app\.app\.app\.theme-light[\s\S]*> \.fretboardViewerPanel--desktopUnified[\s\S]*border-color: rgba\(160, 128, 78, 0\.43\) !important/);
  assert.match(styles, /main\.app\.app\.app\.theme-brand[\s\S]*> \.fretboardViewerPanel--desktopUnified[\s\S]*background: linear-gradient\(180deg, #242018, #15130f\) !important/);
});

test("desktop fretboard preserves the selected view and supports mouse-dragging catalog rows", async () => {
  const [styles, appSource] = await Promise.all([
    readFile(desktopStyleUrl, "utf8"),
    readFile(appUrl, "utf8"),
  ]);

  assert.doesNotMatch(appSource, /const enteredFretboardViewer = appMode === APP_MODES\.FRETBOARD_VIEWER[\s\S]*if \(!isMobileLayout && enteredFretboardViewer\)[\s\S]*setViewerMode\(FRETBOARD_VIEWER_MODES\.CHORD\)/);
  assert.match(appSource, /requestIdleCallback\(revealCatalog, \{ timeout: 180 \}\)/);
  const viewerModeHandler = appSource.slice(
    appSource.indexOf("const selectFretboardViewerMode = useCallback"),
    appSource.indexOf("const handleViewerChordSound = useCallback"),
  );
  assert.match(viewerModeHandler, /setViewerMode\(nextMode\)/);
  assert.doesNotMatch(viewerModeHandler, /ensureAudioReady/);
  assert.match(appSource, /data-desktop-draggable=\{desktopDraggable \? "true" : undefined\}/);
  assert.match(appSource, /window\.addEventListener\("pointerup", stopWindowPointerDrag, true\)/);
  assert.match(appSource, /if \(\(event\.buttons & 1\) === 0\)[\s\S]*stopPointerDrag\(event\.pointerId\)/);
  assert.match(appSource, /onLostPointerCapture=\{finishPointerDrag\}/);
  assert.match(appSource, /event\.currentTarget\.scrollLeft = drag\.scrollLeft - deltaX/);
  assert.match(styles, /\.chordMiniGrid\[data-desktop-draggable="true"\][\s\S]*cursor: grab/);
});

test("desktop dark theme overrides shared light BPM cards", async () => {
  const styles = await readFile(desktopStyleUrl, "utf8");

  assert.match(styles, /\.desktopLayout main\.app\.app\.app:is\(\.theme-dark, \.theme-brand\) :is\([\s\S]*\.referenceStandaloneMetronomeDeck > \.metronomeHeroCard--interactive/);
  assert.match(styles, /linear-gradient\(150deg, #1c1812, #0d0b08 68%, #17120c\) !important/);
  assert.match(styles, /> \.referenceMetronomeActionPanel \{[\s\S]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(styles, /> \.referenceMetronomeActionPanel[\s\S]*> button \{[\s\S]*position: relative !important[\s\S]*background: transparent !important/);
  assert.match(styles, /> \.metronomeBpmAdjustGroup[\s\S]*> :is\(button\.metronomeHeroBpmButton, button\.metronomeHeroBpmJumpButton\) \{[\s\S]*-webkit-text-fill-color: currentColor !important[\s\S]*transform: none !important/);
  assert.match(styles, /> \.metronomeHeroActionPanel\.metronomeHeroActionPanel \{[\s\S]*position: relative !important[\s\S]*grid-column: 1 \/ -1 !important[\s\S]*overflow: hidden !important/);
  assert.match(styles, /> \.backingLoopMainControls[\s\S]*> \.backingLoopButton:disabled \{[\s\S]*#201b13 !important[\s\S]*opacity: 1 !important/);
});

test("the duplicate shooter bottom transport is not rendered", async () => {
  const [styles, appSource] = await Promise.all([
    readFile(desktopStyleUrl, "utf8"),
    readFile(appUrl, "utf8"),
  ]);

  assert.doesNotMatch(appSource, /className="controlBar compactControls shooterControlBar"/);
  assert.doesNotMatch(styles, /> \.shooterControlBar/);
});

test("desktop-only styling remains behind the existing device-aware layout gate", async () => {
  const [styles, layoutSource] = await Promise.all([
    readFile(desktopStyleUrl, "utf8"),
    readFile(desktopLayoutUrl, "utf8"),
  ]);

  assert.match(layoutSource, /\(hover: hover\) and \(pointer: fine\)/);
  assert.match(layoutSource, /isLikelyMobileDevice\(window\.navigator\)/);
  assert.match(layoutSource, /useLayoutEffect/);
  assert.match(layoutSource, /isDesktopLayout \? "desktopLayout" : "mobileLayoutShell"/);
  assert.doesNotMatch(layoutSource, /if \(!isDesktopLayout\) return children/);
  assert.match(styles, /\.mobileLayoutShell,[\s\S]*\.mobileLayoutContent,[\s\S]*display: contents/);
  assert.match(styles, /\.stage3DesktopPrimaryColumn,[\s\S]*\.stage3DesktopSideColumn \{\s*display: contents/);
  assert.doesNotMatch(styles, /viewport-mobile-surface[^\n]*grid-template-areas/);
});

test("metronome visuals expose beat density without changing the shared beat state", async () => {
  const appSource = await readFile(appUrl, "utf8");

  assert.match(appSource, /metronomeBeatMatrix--beats-\$\{beatCount\}/);
  assert.match(appSource, /--circle-beat-count": beatCount/);
  assert.match(appSource, /const desktopMetronomeOptionsTarget = !isMobileLayout[\s\S]*target\.closest\("\.metronomeVisualOptionsPanel"\)/);
  assert.match(appSource, /const directInteractiveTarget = target\.closest\([\s\S]*const interactiveTarget = directInteractiveTarget \|\| desktopMetronomeOptionsTarget/);
  assert.match(appSource, /const desktopOptionsSwipe = !isMobileLayout \? metronomeOptionsSwipeStartRef\.current : null[\s\S]*if \(deltaY <= -12\) setMetronomeVisualOptionsOpen\(true\)/);
  assert.match(appSource, /if \(!isMobileLayout && event\.target\?\.closest\?\.\("button\.metronomeBeatButton"\)\) return/);
  assert.match(appSource, /const handleMetronomeOptionsSwipeStart = useCallback\(\(event\) => \{[\s\S]*event\.stopPropagation\(\);[\s\S]*if \(event\.target\?\.closest\?\.\("button"\)\)[\s\S]*metronomeOptionsSwipeStartRef\.current = null/);
});
