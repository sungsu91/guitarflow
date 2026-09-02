import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appSource = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
const runtimeSource = await readFile(new URL("../src/AppRuntime.jsx", import.meta.url), "utf8");
const navigationCss = await readFile(
  new URL("../src/navigation/responsive-navigation.css", import.meta.url),
  "utf8",
);

test("navigation controls paint immediate feedback without waiting for React state", () => {
  assert.match(appSource, /const NAVIGATION_PRESS_MIN_MS = 80;/);
  assert.match(appSource, /element\.classList\.add\("is-instant-pressed"\)/);
  assert.match(appSource, /onPointerDownCapture=\{handleAppPointerDownCapture\}/);
  assert.match(appSource, /onPointerCancelCapture=\{handleAppPointerCancelCapture\}/);
  assert.match(appSource, /"\.desktopSidebarNavItem"/);
  assert.match(navigationCss, /\.desktopSidebarNavItem/);
  assert.match(navigationCss, /\.is-instant-pressed[\s\S]*scale\(0\.975\)/);
  assert.match(navigationCss, /transform 70ms/);
});

test("destination shell commits outside the large App render before mode state changes", () => {
  assert.match(appSource, /function ModeEntryShell\(\{ categoryId = null, mode, viewerMode = null \}\)/);
  assert.match(appSource, /function NavigationTransitionLayer\(\)/);
  assert.match(appSource, /useSyncExternalStore\([\s\S]*subscribeNavigationTransition/);
  assert.match(appSource, /className=\{`modeEntryShell modeEntryShell--\$\{mode\}`\}/);
  assert.match(appSource, /flushSync\(\(\) => \{[\s\S]*beginNavigationTransition/);
  assert.match(
    appSource,
    /requestAnimationFrame\(\(\) => \{[\s\S]*requestAnimationFrame\(commitAfterShellPaint\)/,
  );
  assert.match(appSource, /startTransition\(commit\)/);
  const navigationScheduler = appSource.slice(
    appSource.indexOf("const requestNavigationCommit = useCallback"),
    appSource.indexOf("useEffect(() => () => cancelScheduledNavigationCommit"),
  );
  assert.doesNotMatch(navigationScheduler, /setTimeout/);
  assert.match(appSource, /NAVIGATION_PHASE_TRACE_META_NAME = "rifflab-navigation-phase"/);
  assert.match(appSource, /shellPaintBoundaryPassed: true/);
  assert.doesNotMatch(appSource, /setPendingAppMode|pendingAppMode/);
  assert.doesNotMatch(navigationCss, /spinner|animation:\s*spin/i);
  assert.match(navigationCss, /\.modeEntryTransitionLayer \{[\s\S]*position: fixed/);
  assert.match(runtimeSource, /import "\.\/navigation\/responsive-navigation\.css";/);
});

test("mode cleanup and state initialization start only after the shell paint boundary", () => {
  const tunerHandler = appSource.slice(
    appSource.indexOf("const showTunerMode = useCallback"),
    appSource.indexOf("const showFretboardViewer = useCallback"),
  );
  const fretboardHandler = appSource.slice(
    appSource.indexOf("const showFretboardViewer = useCallback"),
    appSource.indexOf("const showDesignLab = useCallback"),
  );

  assert.match(tunerHandler, /requestNavigationCommit\([\s\S]*\(\) => \{[\s\S]*stopMic\(\)[\s\S]*setAppMode\(APP_MODES\.TUNER\)/);
  assert.match(fretboardHandler, /requestNavigationCommit\([\s\S]*\(\) => \{[\s\S]*stopBackingScheduler\(\)[\s\S]*setAppMode\(APP_MODES\.FRETBOARD_VIEWER\)/);
});

test("practice categories and fretboard tabs are independent navigation destinations", () => {
  assert.match(appSource, /if \(appMode === APP_MODES\.PRACTICE\) return `\$\{appMode\}:\$\{categoryId\}`/);
  assert.match(appSource, /if \(appMode === APP_MODES\.FRETBOARD_VIEWER\) return `\$\{appMode\}:\$\{viewerMode\}`/);
  assert.match(appSource, /const showIndependentPracticeCategory[\s\S]*requestNavigationCommit/);
  assert.match(appSource, /const selectFretboardViewerMode[\s\S]*requestNavigationCommit/);
});

test("every user-facing normal mode enters through the shell-first scheduler", () => {
  const navigationHandlers = [
    "showMiniChordMaker",
    "showIndependentPracticeCategory",
    "showMetronomeMode",
    "showTunerMode",
    "showFretboardViewer",
    "toggleUtilityMenu",
  ];

  navigationHandlers.forEach((handlerName) => {
    assert.match(
      appSource,
      new RegExp(`const ${handlerName} = useCallback[\\s\\S]{0,700}requestNavigationCommit`),
      `${handlerName} must schedule its content after the destination shell`,
    );
  });
  assert.match(appSource, /const applyHashRoute[\s\S]*requestNavigationCommit/);
});

test("heavy fretboard catalog fills after the primary fretboard frame", () => {
  assert.match(appSource, /requestIdleCallback\(revealCatalog, \{ timeout: 180 \}\)/);
  assert.match(
    appSource,
    /fretboardCatalogReady \? \([\s\S]*<Activity mode=\{getModeActivityState\(viewerMode, FRETBOARD_VIEWER_MODES\.CHORD\)\}>/,
  );
});

test("tuner is retained but inactive, and shooter no longer waits behind a splash", () => {
  assert.match(appSource, /<Activity mode=\{getModeActivityState\(appMode, APP_MODES\.TUNER\)\}>/);
  assert.match(appSource, /active=\{appMode === APP_MODES\.TUNER\}/);
  assert.doesNotMatch(appSource, /function ShooterLaunchOverlay/);
  assert.match(appSource, /preloadShooterMapImages\(entryAssets\?\.mapSkin\)/);
});

test("fretboard mode selection is not reset when the viewer is re-entered", () => {
  assert.doesNotMatch(
    appSource,
    /if \(appMode !== APP_MODES\.FRETBOARD_VIEWER\) return;\s*setViewerMode\(FRETBOARD_VIEWER_MODES\.CHORD\);/,
  );
});
