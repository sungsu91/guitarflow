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
    /--desktop-sidebar-width: clamp\(242px, 17vw, 274px\)/,
  );
  assert.match(
    styles,
    /--desktop-workspace-left: calc\(var\(--desktop-sidebar-width\) \+ 36px\)/,
  );
  assert.match(
    styles,
    /\.desktopWorkspaceContent \{[\s\S]*?box-sizing: border-box;[\s\S]*?padding-left: var\(--desktop-workspace-left\);[\s\S]*?padding-right: clamp\(24px, 4vw, 72px\);/,
  );
  assert.match(
    styles,
    /> \.desktopSidebar \{[\s\S]*?position: fixed;[\s\S]*?top: 12px;[\s\S]*?bottom: 12px;[\s\S]*?left: 12px;[\s\S]*?display: flex;[\s\S]*?width: var\(--desktop-sidebar-width\);/,
  );
  assert.match(styles, /\.desktopSidebarNavItem\.is-active \{[\s\S]*?border-color:[\s\S]*?background:[\s\S]*?box-shadow:/);
  assert.match(styles, /\.desktopSidebarSettings > summary \{[\s\S]*?border-color:[\s\S]*?background:[\s\S]*?box-shadow:/);
  assert.match(styles, /\.desktopSidebarStatusLogo \{[\s\S]*?padding: 0;[\s\S]*?border: 0;[\s\S]*?background: none;[\s\S]*?box-shadow: none;/);
  assert.match(styles, /\.desktopSidebarUtilityGroup[\s\S]*?:is\(\.desktopSidebarSettings > summary, \.desktopSidebarNavItem\)[\s\S]*?color: var\(--desktop-sidebar-card-text\) !important;[\s\S]*?opacity: 1 !important;/);
  assert.match(styles, /> \.desktopSidebar \.desktopSidebarUtilityGroup[\s\S]*> \.desktopSidebarSettings > summary,[\s\S]*> \.desktopSidebar \.desktopSidebarUtilityGroup[\s\S]*> \.desktopSidebarNavItem \{[\s\S]*border-color: var\(--desktop-sidebar-card-border\) !important;[\s\S]*background: var\(--desktop-sidebar-card-bg\) !important;[\s\S]*box-shadow: var\(--desktop-sidebar-card-shadow\) !important;/);
  assert.match(styles, /\.desktopSidebarStatusLogo--beginner \{\s*color: #9dcc9f !important;/);
  assert.match(styles, /\.desktopSidebarStatusLogo--solo \{\s*color: #f0bd47 !important;/);
  assert.match(styles, /\.desktopSidebarStatusLogo--rhythm \{\s*color: #f08b82 !important;/);
  assert.match(styles, /\.desktopSidebarStatusLogo--arranger \{\s*color: #d9ac69 !important;/);
  assert.match(styles, /\.desktopSidebarStatusLogo--editor \{\s*color: #9fb6cf !important;/);
  assert.match(styles, /\.desktopSidebarInstagramIcon \{\s*color: var\(--desktop-sidebar-card-icon\);/);
  assert.match(styles, /\.desktopSidebarNavItem--rhythm\.is-active \{[\s\S]*?border-color:[\s\S]*?background:[\s\S]*?inset 3px 0 0/);
  assert.equal((sidebarSource.match(/<DesktopSidebarSectionHeading>/g) ?? []).length, 2);
  assert.equal((sidebarSource.match(/className="desktopSidebarDivider"/g) ?? []).length, 1);
  [
    "튜너",
    "지판 보기",
    "메트로놈",
    "슈팅게임",
    "단일 음 위치 익히기",
    "스케일 · 펜타토닉",
    "연습 코스",
    "리듬 코드 전환",
    "반주 · 편집",
    "미니반주",
    "오디오 스튜디오",
    "사운드 및 리듬 설정",
    "사용설명서 & 도움말",
    "문의하기",
  ].forEach((label) => assert.match(sidebarSource, new RegExp(label.replace("&", "&"))));
  assert.match(sidebarSource, /mark="초보 ★"/);
  assert.match(sidebarSource, /mark="SOLO"/);
  assert.match(sidebarSource, /mark="HOT •"/);
  assert.match(sidebarSource, /mark="진행 구성"/);
  assert.match(sidebarSource, /mark="간편 편집"/);
  assert.doesNotMatch(sidebarSource, /MenuStatusBadge|status="DEV"|index="④"/);
  assert.match(sidebarSource, /<InstagramMark size=\{18\}/);
  assert.doesNotMatch(sidebarSource, /MessagesSquare|@sungsu91_/);
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
