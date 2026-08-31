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
  assert.match(styles, /> \.backingLoopPanel \{[\s\S]*grid-area: backing/);
  assert.match(styles, /\.backingLoopMainControls,[\s\S]*grid-template-columns: repeat\(4, minmax\(112px, 1fr\)\)/);
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
  const styles = await readFile(desktopStyleUrl, "utf8");

  assert.match(styles, /\.referenceTrainingMainRow \{[\s\S]*grid-template-columns: minmax\(680px, 1fr\) minmax\(390px, 440px\)/);
  assert.match(styles, /> \.chordTransitionPanel \{[\s\S]*grid-template-columns: minmax\(680px, 1fr\) minmax\(390px, 440px\)/);
  assert.match(styles, /> \.chordTransitionPanel > \.stage3DesktopSideColumn \{[\s\S]*grid-template-columns: minmax\(0, 1fr\)/);
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

test("desktop fretboard keeps code as the entry view and supports mouse-dragging catalog rows", async () => {
  const [styles, appSource] = await Promise.all([
    readFile(desktopStyleUrl, "utf8"),
    readFile(appUrl, "utf8"),
  ]);

  assert.match(appSource, /const enteredFretboardViewer = appMode === APP_MODES\.FRETBOARD_VIEWER[\s\S]*if \(!isMobileLayout && enteredFretboardViewer\)[\s\S]*setViewerMode\(FRETBOARD_VIEWER_MODES\.CHORD\)/);
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
  assert.match(layoutSource, /if \(!isDesktopLayout\) return children/);
  assert.match(styles, /\.stage3DesktopPrimaryColumn,[\s\S]*\.stage3DesktopSideColumn \{\s*display: contents/);
  assert.doesNotMatch(styles, /viewport-mobile-surface[^\n]*grid-template-areas/);
});

test("metronome visuals expose beat density without changing the shared beat state", async () => {
  const appSource = await readFile(appUrl, "utf8");

  assert.match(appSource, /metronomeBeatMatrix--beats-\$\{beatCount\}/);
  assert.match(appSource, /--circle-beat-count": beatCount/);
  assert.match(appSource, /const desktopMetronomeOptionsTarget = !isMobileLayout[\s\S]*target\.closest\("\.metronomeVisualOptionsPanel"\)/);
  assert.match(appSource, /const desktopOptionsSwipe = !isMobileLayout \? metronomeOptionsSwipeStartRef\.current : null[\s\S]*if \(deltaY <= -12\) setMetronomeVisualOptionsOpen\(true\)/);
  assert.match(appSource, /if \(!isMobileLayout && event\.target\?\.closest\?\.\("button\.metronomeBeatButton"\)\) return/);
});
