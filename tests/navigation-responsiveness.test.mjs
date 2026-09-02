import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appSource = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
const runtimeSource = await readFile(new URL("../src/AppRuntime.jsx", import.meta.url), "utf8");
const navigationCss = await readFile(
  new URL("../src/navigation/responsive-navigation.css", import.meta.url),
  "utf8",
);

test("navigation controls keep immediate physical feedback outside React state", () => {
  assert.match(appSource, /const NAVIGATION_PRESS_MIN_MS = 80;/);
  assert.match(appSource, /element\.classList\.add\("is-instant-pressed"\)/);
  assert.match(appSource, /onPointerDownCapture=\{handleAppPointerDownCapture\}/);
  assert.match(appSource, /onPointerCancelCapture=\{handleAppPointerCancelCapture\}/);
  assert.match(appSource, /"\.desktopSidebarNavItem"/);
  assert.match(navigationCss, /\.desktopSidebarNavItem/);
  assert.match(navigationCss, /\.is-instant-pressed[\s\S]*scale\(0\.975\)/);
  assert.match(navigationCss, /transform 70ms/);
});

test("navigation never inserts a placeholder, skeleton, pending screen, or loading shell", () => {
  assert.doesNotMatch(appSource, /ModeEntryShell|NavigationTransitionLayer/);
  assert.doesNotMatch(appSource, /transitionStore|beginNavigationTransition|useSyncExternalStore/);
  assert.doesNotMatch(appSource, /NAVIGATION_PHASE_TRACE|화면 준비 중|준비하고 있어요/);
  assert.doesNotMatch(navigationCss, /modeEntry|skeleton|placeholder|spinner|loading/i);
  assert.doesNotMatch(runtimeSource, /transitionStore/);
});

test("the real destination state commits before post-paint cleanup is scheduled", () => {
  const navigationScheduler = appSource.slice(
    appSource.indexOf("const requestNavigationCommit = useCallback"),
    appSource.indexOf("useEffect(() => () => cancelScheduledNavigationCommit"),
  );
  const actualCommitIndex = navigationScheduler.indexOf("flushSync(() =>");
  const deferredWorkIndex = navigationScheduler.indexOf("commitAfterActualPagePaint");

  assert.ok(actualCommitIndex >= 0);
  assert.ok(deferredWorkIndex > actualCommitIndex);
  assert.match(navigationScheduler, /setAppMode\(target\.mode\)/);
  assert.match(navigationScheduler, /setSelectedCategoryId\(target\.categoryId\)/);
  assert.match(navigationScheduler, /setViewerMode\(target\.viewerMode\)/);
  assert.match(
    navigationScheduler,
    /requestAnimationFrame\(\(\) => \{[\s\S]*requestAnimationFrame\(commitAfterActualPagePaint\)/,
  );
  assert.match(navigationScheduler, /startTransition\(commit\)/);
  assert.doesNotMatch(navigationScheduler, /setTimeout/);
});

test("every user-facing mode uses the real-page-first navigation path", () => {
  const navigationHandlers = [
    "selectFretboardViewerMode",
    "showMiniChordMaker",
    "showIndependentPracticeCategory",
    "showShooterMode",
    "showMetronomeMode",
    "showTunerMode",
    "showFretboardViewer",
    "toggleUtilityMenu",
  ];

  navigationHandlers.forEach((handlerName) => {
    assert.match(
      appSource,
      new RegExp(`const ${handlerName} = useCallback[\\s\\S]{0,700}requestNavigationCommit`),
      `${handlerName} must commit the actual destination first`,
    );
  });
  assert.match(appSource, /const applyHashRoute[\s\S]*requestNavigationCommit/);
});

test("heavy fretboard catalog fills inside the real page after its primary frame", () => {
  assert.match(appSource, /requestIdleCallback\(revealCatalog, \{ timeout: 180 \}\)/);
  assert.match(
    appSource,
    /fretboardCatalogReady \? \([\s\S]*<Activity mode=\{getModeActivityState\(viewerMode, FRETBOARD_VIEWER_MODES\.CHORD\)\}>/,
  );
});

test("re-entry state stays retained without introducing a transition page", () => {
  assert.match(appSource, /<Activity mode=\{getModeActivityState\(appMode, APP_MODES\.TUNER\)\}>/);
  assert.match(appSource, /active=\{appMode === APP_MODES\.TUNER\}/);
  assert.doesNotMatch(appSource, /function ShooterLaunchOverlay/);
  assert.match(appSource, /preloadShooterMapImages\(entryAssets\?\.mapSkin\)/);
  assert.doesNotMatch(
    appSource,
    /if \(appMode !== APP_MODES\.FRETBOARD_VIEWER\) return;\s*setViewerMode\(FRETBOARD_VIEWER_MODES\.CHORD\);/,
  );
});
