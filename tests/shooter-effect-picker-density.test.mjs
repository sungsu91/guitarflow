import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appStyleUrl = new URL("../src/style.css", import.meta.url);
const appSourceUrl = new URL("../src/App.jsx", import.meta.url);

test("mobile effect picker shows four aligned sets and a standalone floor row", async () => {
  const [appCss, appSource] = await Promise.all([
    readFile(appStyleUrl, "utf8"),
    readFile(appSourceUrl, "utf8"),
  ]);
  const marker = "/* Mobile effect picker:";
  const compactRuleIndex = appCss.lastIndexOf(marker);

  assert.notEqual(compactRuleIndex, -1);

  const compactCss = appCss.slice(compactRuleIndex);

  assert.match(appSource, /const SHOOTER_EFFECT_SET_PAIRS = \[/);
  assert.match(appSource, /id: "fire", label: "불꽃", auraId: "fire-lava-aura", floorId: "fire-portal"/);
  assert.match(appSource, /id: "moonlight", label: "달빛", auraId: "moonlight-aura", floorId: "moonlight-floor"/);
  assert.match(appSource, /id: "galactic", label: "은하", auraId: "galactic-orbital-aura", floorId: "galactic-orbital-floor"/);
  assert.match(appSource, /id: "vine", label: "넝쿨", auraId: "enchanted-vine-aura", floorId: "enchanted-vine-floor"/);
  assert.match(appSource, /id: "frost", label: "서리", auraId: "frost-snowflake-aura", floorId: "frost-snowflake-floor"/);
  assert.match(appSource, /isMobileLayout \? \(\s*<div className="shooterEffectSetPicker"/);
  assert.match(appSource, /className="shooterEffectSetCard shooterEffectSetCard--aura"/);
  assert.match(appSource, /className="shooterEffectSetCard shooterEffectSetCard--floor"/);
  assert.match(appSource, /SHOOTER_STANDALONE_FLOOR_EFFECT_OPTIONS\.map/);
  assert.match(appSource, /<span>FLOOR 2<\/span>/);

  assert.match(compactCss, /@media \(max-width: 719px\)/);
  assert.match(compactCss, /\.shooterEffectSetScroller,[\s\S]*overflow-x: auto;[\s\S]*scroll-snap-type: x mandatory/);
  assert.match(compactCss, /\.shooterEffectSetTrack,[\s\S]*grid-auto-columns: calc\(\(100% - 18px\) \/ 4\)/);
  assert.match(compactCss, /\.shooterEffectSetCard--aura \{[\s\S]*grid-template-rows: 68px minmax\(17px, auto\) !important;[\s\S]*min-height: 94px !important/);
  assert.match(compactCss, /\.shooterEffectSetCard--floor \{[\s\S]*grid-template-rows: 36px minmax\(17px, auto\) !important;[\s\S]*min-height: 62px !important/);
  assert.match(compactCss, /\.shooterEffectStandaloneCard \{[\s\S]*grid-template-rows: 40px minmax\(17px, auto\) !important;[\s\S]*min-height: 66px !important/);
  assert.match(compactCss, /\.shooterEffectSetCard--aura \.shooterEffectPreviewLayer \{[\s\S]*56px\) !important;[\s\S]*translate\(-50%, 50%\) !important/);
  assert.match(compactCss, /\.shooterEffectSetCard--floor \.shooterEffectPreviewLayer \{[\s\S]*58px\) !important;[\s\S]*translate\(-50%, 50%\) !important/);

  assert.match(
    appCss.slice(0, compactRuleIndex),
    /@media \(min-width: 720px\) \{[\s\S]*\.shooterEffectPreview \{[\s\S]*height: 118px !important/,
  );
});
