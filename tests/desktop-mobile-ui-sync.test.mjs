import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const desktopLayoutSourceUrl = new URL("../src/layouts/DesktopLayout.jsx", import.meta.url);
const desktopStyleUrl = new URL("../src/layouts/desktop-layout.css", import.meta.url);
const appSourceUrl = new URL("../src/App.jsx", import.meta.url);
const appStyleUrl = new URL("../src/style.css", import.meta.url);
const mapEditorStyleUrl = new URL("../src/shooter/maps/editor/map-editor.css", import.meta.url);
const mapEditorPanelUrl = new URL("../src/shooter/maps/editor/MapEditPanel.jsx", import.meta.url);
const mapEditorHookUrl = new URL("../src/shooter/maps/editor/useMapEditMode.js", import.meta.url);

test("desktop shell keeps the shared app navigation instead of a legacy sidebar", async () => {
  const [layoutSource, desktopCss] = await Promise.all([
    readFile(desktopLayoutSourceUrl, "utf8"),
    readFile(desktopStyleUrl, "utf8"),
  ]);

  assert.doesNotMatch(layoutSource, /desktopSidebar|desktopNav|DESKTOP_NAV_ITEMS/);
  assert.match(layoutSource, /desktopWorkspaceContent/);
  assert.match(desktopCss, /\.hud > \.modeSwitch,[\s\S]*\.mainBottomNav[\s\S]*display: grid !important/);
  assert.match(desktopCss, /width: min\(100%, 1180px\)/);
});

test("shooter uses the mobile-master HUD at mobile and desktop sizes", async () => {
  const [appSource, appCss] = await Promise.all([
    readFile(appSourceUrl, "utf8"),
    readFile(appStyleUrl, "utf8"),
  ]);

  assert.match(appSource, /\{!mapEditor\.enabled \? \(\s*<div\s+className="mobileShooterTopHud"/);
  assert.ok(appSource.indexOf('className="mobileShooterTopHud"') < appSource.indexOf('className={`shooterArena'));
  assert.match(appSource, /className=\{`mobileShooterPlayHelpHud/);
  assert.match(appSource, /className=\{`mobileShooterPlayHelpOption/);
  assert.match(appSource, /aria-pressed=\{shooterPlayHelpLevel === level\}/);
  assert.match(appSource, /shooterPlayHelpLevel > 0 \? \(\s*<div className="mobileShooterPlayHelpMessageBar"/);
  assert.match(appSource, /className="mobileShooterPrimaryHudRow"/);
  assert.match(appSource, /className=\{`mobileShooterDifficultyControl/);
  assert.match(appSource, /className="mobileShooterTargetHud"/);
  assert.match(appSource, /className=\{`mobileShooterMicHud/);
  assert.match(appSource, /className="mobileShooterScoreHud"/);
  assert.match(appCss, /@media \(max-width: 680px\), \(min-width: 1024px\) \{/);
  assert.match(appCss, /\.mobileShooterPlayHelpHud \{[\s\S]*height: 40px/);
  assert.match(appCss, /\.mobileShooterPrimaryHudRow \{[\s\S]*grid-template-columns: 104px minmax\(0, 1fr\) 64px/);
  assert.match(appCss, /\.mobileShooterPrimaryHudRow \{[\s\S]*background: rgba\(8, 14, 13, 0\.82\)/);
  assert.match(appCss, /\.mobileShooterPlayHelpMessageBar \{[\s\S]*width: 100%/);
  assert.match(appCss, /\.mobileShooterTopHud \{[\s\S]*user-select: none/);
  assert.match(appCss, /\.mobileShooterTopHud \{[\s\S]*min-height: 40px;[\s\S]*padding: 0/);
  assert.match(appCss, /padding-inline: 0 !important/);
  assert.match(appCss, /\.mobileShooterPrimaryHudRow \{[\s\S]*margin-inline: 0 !important/);
  assert.match(appCss, /button\.mobileShooterMicHud svg \{[\s\S]*opacity: 1 !important/);
  assert.match(appCss, /--shooter-hud-dock-height: 40px/);
  assert.match(appCss, /> \.shooterArena \{[\s\S]*inset: var\(--shooter-hud-dock-height\) 0 0 !important/);
  assert.match(appCss, /\.mobileShooterTargetHud \{[\s\S]*position: absolute;[\s\S]*top: 7px/);
  assert.match(appCss, /\.mobileShooterTopHud:has\(\.mobileShooterPlayHelpMessageBar\)[\s\S]*\+ \.shooterArena :is\(\.mobileShooterTargetHud, \.mobileShooterScoreHud\)/);
});

test("desktop map studio keeps its editor panel beside the preview", async () => {
  const [appSource, desktopCss, mapEditorCss, mapEditPanelSource, useMapEditModeSource] = await Promise.all([
    readFile(appSourceUrl, "utf8"),
    readFile(desktopStyleUrl, "utf8"),
    readFile(mapEditorStyleUrl, "utf8"),
    readFile(mapEditorPanelUrl, "utf8"),
    readFile(mapEditorHookUrl, "utf8"),
  ]);

  assert.match(desktopCss, /shooterMode:not\(:has\(> \.shooterPanel--mapEditorWorkspace\)\)/);
  assert.match(desktopCss, /> \.shooterPanel:not\(\.shooterPanel--mapEditorWorkspace\) > \.shooterArena/);
  assert.match(desktopCss, /aspect-ratio: var\(--shooter-map-reference-aspect, 390 \/ 756\) !important/);
  assert.match(mapEditorCss, /grid-template-columns: minmax\(340px, 390px\) minmax\(340px, 460px\) !important/);
  assert.match(mapEditorCss, /justify-content: center !important/);
  assert.match(mapEditorCss, /aspect-ratio: var\(--shooter-map-reference-aspect, 390 \/ 756\) !important/);
  assert.match(mapEditorCss, /calc\(\(100dvh - 48px\) \* var\(--shooter-map-reference-ratio, 0\.515873\)\)/);
  assert.match(mapEditorCss, /border: 0 !important/);
  assert.doesNotMatch(mapEditorCss, /aspect-ratio: 390 \/ 844 !important/);
  assert.match(appSource, /"--shooter-map-reference-aspect": `\$\{referenceWidth\} \/ \$\{referenceHeight\}`/);
  assert.match(appSource, /"--shooter-map-reference-ratio": referenceWidth \/ referenceHeight/);
  assert.match(mapEditPanelSource, /referenceViewport\?\.height \|\| editor\.skin\.referenceViewport\?\.deviceHeight \|\| 756/);
  assert.match(mapEditPanelSource, /\{viewport\.width\} × \{viewport\.height\} LIVE PREVIEW/);
  assert.doesNotMatch(mapEditPanelSource, /390 × 844 LIVE PREVIEW/);
  assert.match(useMapEditModeSource, /referenceViewport\?\.height \?\? referenceViewport\?\.deviceHeight \?\? 756/);
  assert.match(appSource, /const shooterMapRenderLayout = "mobile"/);
  assert.doesNotMatch(appSource, /shooterUsesMobileMapLayout/);
  assert.match(mapEditorCss, /\.mapEditEffectSlotTabs > button\.is-selected/);
  assert.match(mapEditorCss, /\.mapEditEffectLibrary > button\.is-selected/);
});

test("map studio starts with a collapsed installed-object list and separates selection cancel from close", async () => {
  const [hookSource, panelSource] = await Promise.all([
    readFile(mapEditorHookUrl, "utf8"),
    readFile(mapEditorPanelUrl, "utf8"),
  ]);

  assert.match(panelSource, /<details className="mapEditAdvancedSection mapEditAdvancedSection--installed">/);
  assert.match(panelSource, /<details className="mapEditAdvancedSection mapEditAdvancedSection--effects">/);
  assert.match(panelSource, /<CollapsibleEditorSection title="기타 이펙트 보정" value="FLOOR · AURA · 필요할 때만">/);
  assert.doesNotMatch(panelSource, /<details className="mapEditAdvancedSection mapEditAdvancedSection--effects" open>/);
  assert.match(panelSource, /className="mapEditEffectLibrary"/);
  assert.match(panelSource, /effectEditor\.selectEffect/);
  assert.match(panelSource, /effectEditor\.nudgeActive/);
  assert.match(panelSource, /effectEditor\?\.applyEditing/);
  assert.match(panelSource, /function MapEditMapSwitcher/);
  assert.match(panelSource, /왕복해도 현재 세션의 임시 배치를 유지합니다/);
  assert.match(panelSource, /onMapChange\?\.\(event\.target\.value\)/);
  assert.match(hookSource, /const \[editingActive, setEditingActive\]/);
  assert.match(hookSource, /draftCacheRef = useRef\(new Map\(\)\)/);
  assert.match(hookSource, /const saveSessionPlacements = useCallback/);
  assert.match(hookSource, /Promise\.all\(changedDrafts\.map/);
  assert.doesNotMatch(hookSource, /editingSkinId/);
  assert.match(panelSource, />선택 취소<\/button>/);
  assert.match(panelSource, /onClick=\{closeEditing\}[^>]*>닫기<\/button>/);
  assert.doesNotMatch(panelSource, /배치 보정 모드|DefaultLayoutPreview|기본 배치 미리보기/);
});
