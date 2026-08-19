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

  assert.match(appSource, /\{!mapEditor\.enabled \? \(\s*<>\s*<div\s+className=\{`mobileShooterDifficultyControl/);
  assert.match(appSource, /className="mobileShooterTargetHud"/);
  assert.match(appSource, /className=\{`mobileShooterMicHud/);
  assert.match(appSource, /className="mobileShooterScoreHud"/);
  assert.match(appCss, /@media \(max-width: 680px\), \(min-width: 1024px\) \{/);
});

test("desktop map studio keeps its editor panel beside the preview", async () => {
  const [appSource, desktopCss, mapEditorCss] = await Promise.all([
    readFile(appSourceUrl, "utf8"),
    readFile(desktopStyleUrl, "utf8"),
    readFile(mapEditorStyleUrl, "utf8"),
  ]);

  assert.match(desktopCss, /shooterMode:not\(:has\(> \.shooterPanel--mapEditorWorkspace\)\)/);
  assert.match(desktopCss, /> \.shooterPanel:not\(\.shooterPanel--mapEditorWorkspace\) > \.shooterArena/);
  assert.match(desktopCss, /aspect-ratio: 390 \/ 844 !important/);
  assert.match(mapEditorCss, /grid-template-columns: minmax\(340px, 390px\) minmax\(340px, 460px\) !important/);
  assert.match(mapEditorCss, /justify-content: center !important/);
  assert.match(mapEditorCss, /aspect-ratio: 390 \/ 844 !important/);
  assert.match(mapEditorCss, /calc\(\(100dvh - 48px\) \* 0\.462085\)/);
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
  assert.match(panelSource, /title="기타 이펙트 보정" value="FLOOR · AURA"/);
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
