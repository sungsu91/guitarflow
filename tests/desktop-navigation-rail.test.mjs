import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const desktopStyleUrl = new URL("../src/layouts/desktop-layout.css", import.meta.url);
const sidebarSourceUrl = new URL("../src/navigation/DesktopSidebarNavigation.jsx", import.meta.url);
const appSourceUrl = new URL("../src/App.jsx", import.meta.url);

test("desktop navigation is a fixed full sidebar on the left wall", async () => {
  const [styles, sidebarSource] = await Promise.all([
    readFile(desktopStyleUrl, "utf8"),
    readFile(sidebarSourceUrl, "utf8"),
  ]);

  assert.match(
    styles,
    /--desktop-sidebar-width: clamp\(226px, 17vw, 258px\)/,
  );
  assert.match(
    styles,
    /\.desktopWorkspaceContent \{[\s\S]*?padding-left: calc\(var\(--desktop-sidebar-width\) \+ 36px\);[\s\S]*?padding-right: clamp\(24px, 4vw, 72px\);/,
  );
  assert.match(
    styles,
    /> \.desktopSidebar \{[\s\S]*?position: fixed;[\s\S]*?top: 12px;[\s\S]*?bottom: 12px;[\s\S]*?left: 12px;[\s\S]*?display: flex;[\s\S]*?width: var\(--desktop-sidebar-width\);/,
  );
  assert.match(styles, /\.desktopSidebarNavItem\.is-active \{[\s\S]*?border-color:[\s\S]*?background:[\s\S]*?box-shadow:/);
  assert.equal((sidebarSource.match(/className="desktopSidebarDivider"/g) ?? []).length, 3);
  [
    "튜너",
    "지판 보기",
    "메트로놈",
    "슈팅게임",
    "단일 음 위치 익히기",
    "스케일 · 펜타토닉",
    "리듬 & 코드",
    "미니반주",
    "오디오 스튜디오",
    "사운드 및 리듬 설정",
    "사용설명서 & 도움말",
    "문의하기",
  ].forEach((label) => assert.match(sidebarSource, new RegExp(label.replace("&", "&"))));
});

test("desktop uses direct sidebar utilities while mobile keeps the popup navigation", async () => {
  const [styles, sidebarSource, appSource] = await Promise.all([
    readFile(desktopStyleUrl, "utf8"),
    readFile(sidebarSourceUrl, "utf8"),
    readFile(appSourceUrl, "utf8"),
  ]);

  assert.match(
    styles,
    /> \.hud > \.modeSwitch,[\s\S]*?\.mainHub > \.mainBottomNav \{\s*display: none !important;/,
  );
  assert.match(appSource, /\{utilityMenuOpen && !isDesktopLayout \? \(/);
  assert.match(appSource, /<DesktopSidebarNavigation[\s\S]*?onOpenTuner=\{showTunerMode\}[\s\S]*?onResetSound=\{resetBackingVolumeSettings\}/);
  assert.match(sidebarSource, /<details className="desktopSidebarSettings">[\s\S]*?backingVolumeControls\.map/);
  assert.match(sidebarSource, /onOpenRhythmSettings/);
  assert.match(
    styles,
    /@media \(max-width: 1023px\) \{[\s\S]*?\.desktopWorkspaceContent \{[\s\S]*?display: contents !important;/,
  );
});
