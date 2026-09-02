import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const desktopCss = readFileSync(new URL("../src/layouts/desktop-layout.css", import.meta.url), "utf8");
const appCss = readFileSync(new URL("../src/style.css", import.meta.url), "utf8");

test("mini chord repeat edges keep independent start and end controls", () => {
  assert.match(appSource, /data-mini-chord-repeat-edge="start"[\s\S]*?repeatStart: !bar\.repeatStart/);
  assert.match(appSource, /data-mini-chord-repeat-edge="end"[\s\S]*?repeatEnd: !bar\.repeatEnd/);
  assert.match(appSource, /onPointerDown=\{\(event\) => event\.stopPropagation\(\)\}/);
});

test("repeat marks use fixed SVG line and dots instead of shrinking text", () => {
  assert.match(appSource, /function MiniChordRepeatBoundaryIcon/);
  assert.match(appSource, /vectorEffect="non-scaling-stroke"/);
  assert.match(appSource, /viewBox="0 0 14 72"/);
  assert.match(appSource, /y2="71"/);
  assert.match(appSource, /<circle cx=\{isStart \? 10 : 4\} cy="28" r="1\.8" \/>/);
  assert.match(appSource, /<circle cx=\{isStart \? 10 : 4\} cy="44" r="1\.8" \/>/);
  assert.doesNotMatch(appSource, /miniChordRepeatBoundary miniChordRepeatBoundary--start">\|:/);
});

test("desktop mini chord header and repeat hit zones are isolated from mobile", () => {
  const desktopBlock = desktopCss.slice(desktopCss.indexOf("Desktop mini-chord score"));
  assert.match(desktopBlock, /@media \(min-width: 1024px\)/);
  assert.match(desktopBlock, /--mini-chord-desktop-header-height: 19px/);
  assert.match(desktopBlock, /--mini-chord-desktop-repeat-hit-width: 18px/);
  assert.match(desktopBlock, /\.miniChordVoltaLayer \{[\s\S]*top: 1px !important[\s\S]*height: 18px !important/);
  assert.match(desktopBlock, /\.miniChordNavigationMarkerLayer \{[\s\S]*top: 1px !important[\s\S]*height: 17px !important/);
  assert.match(desktopBlock, /\.miniChordCommandMarkerLayer \{[\s\S]*top: 2px !important[\s\S]*height: 15px !important/);
  assert.match(desktopBlock, /\.miniChordMarkHotspotEnding[\s\S]*right: var\(--mini-chord-desktop-repeat-hit-width\)[\s\S]*left: var\(--mini-chord-desktop-repeat-hit-width\)/);
  assert.match(desktopBlock, /\.miniChordMarkHotspotStart, \.miniChordMarkHotspotEnd\):is\(:hover, :focus-visible\)[\s\S]*background: linear-gradient/);
  assert.match(desktopBlock, /\.miniChordBarGhostNumber \{[\s\S]*top: 2px !important/);
  assert.match(desktopBlock, /\.miniChordRepeatBoundary \{[\s\S]*place-items: start center !important/);
  assert.match(desktopBlock, /\.miniChordRepeatBoundaryIcon[\s\S]*width: 14px[\s\S]*height: calc\(100% - 6px\)[\s\S]*min-height: 64px[\s\S]*max-height: 78px/);
  assert.match(appCss, /@media \(max-width: 680px\)[\s\S]*\.miniChordRepeatBoundaryIcon \{[\s\S]*display: none !important/);
});

test("mini chord keeps one section label and reuses the shared desktop transport actions", () => {
  assert.match(
    appSource,
    /className=\{`miniChordSectionRangeBar[\s\S]*?\}`\}\s*\/>/,
  );
  assert.doesNotMatch(
    appSource,
    /miniChordSectionRangeBar[\s\S]{0,500}?isAppliedArrangementRowSegmentStart \? arrangementOverride\.sectionName/,
  );
  assert.match(
    appSource,
    /<MetronomeTransportCard[\s\S]*?actionOrder=\{!isMobileLayout \? "tap-play" : "play-tap"\}[\s\S]*?countInEnabled=\{miniChordCountIn\}[\s\S]*?onCountInChange=\{changeMiniChordCountIn\}[\s\S]*?showCountIn=\{!isMobileLayout\}/,
  );
  assert.match(appSource, /const miniChordCountInRef = useRef\(false\)/);
  assert.match(appSource, /!isMobileLayoutRef\.current && miniChordCountInRef\.current/);
  assert.match(
    desktopCss,
    /\.miniChordDesktopMetronomeActionPanel \{[\s\S]*?grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/,
  );
});
