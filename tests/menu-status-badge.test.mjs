import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const componentSource = fs.readFileSync(new URL("../src/components/MenuStatusBadge.jsx", import.meta.url), "utf8");
const appSource = fs.readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const cssSource = fs.readFileSync(new URL("../src/components/menu-status-badge.css", import.meta.url), "utf8");

test("menu status badge system exposes the approved status vocabulary", () => {
  for (const status of ["HOT", "NEW", "BETA", "PRO", "DEV", "BEGINNER", "SOLO"]) {
    assert.match(componentSource, new RegExp(`\\b${status}:`));
    assert.match(cssSource, new RegExp(`utilityMenuStatusBadge--${status.toLowerCase()}`));
  }
  assert.match(componentSource, /BEGINNER:[^\n]+text: "초보"/);
  assert.match(componentSource, /SOLO:[^\n]+text: "SOLO"/);
  assert.doesNotMatch(componentSource, /\bVIP\b/);
});

test("menu applies status badges without changing the item actions", () => {
  assert.match(appSource, /<UtilityMenuTitle status="BEGINNER">단일 음 위치 익히기<\/UtilityMenuTitle>/);
  assert.match(appSource, /<UtilityMenuTitle status="SOLO">스케일 · 펜타토닉<\/UtilityMenuTitle>/);
  assert.match(appSource, /<UtilityMenuTitle status="DEV">미니반주<\/UtilityMenuTitle>/);
  assert.match(appSource, /<UtilityMenuTitle status="DEV">오디오 스튜디오<\/UtilityMenuTitle>/);
  assert.match(appSource, /<UtilityMenuTitle status="HOT">리듬 &amp; 코드<\/UtilityMenuTitle>/);
  assert.match(appSource, /onClick=\{showAudioStudio\}/);
  assert.match(appSource, /onClick=\{showCurriculum\}/);
});

test("audio studio follows mini backing in the utility menu", () => {
  const miniBackingIndex = appSource.indexOf('<UtilityMenuTitle status="DEV">미니반주</UtilityMenuTitle>');
  const audioStudioIndex = appSource.indexOf('<UtilityMenuTitle status="DEV">오디오 스튜디오</UtilityMenuTitle>');
  const soundPanelIndex = appSource.indexOf('<section className="utilitySoundPanel"', audioStudioIndex);

  assert.ok(miniBackingIndex >= 0);
  assert.ok(audioStudioIndex > miniBackingIndex);
  assert.ok(soundPanelIndex > audioStudioIndex);
});

test("badge layout reserves compact fixed width and theme-specific palettes", () => {
  assert.match(cssSource, /flex:\s*0 0 36px/);
  assert.match(cssSource, /\.theme-light[\s\S]*utilityMenuStatusBadge--hot/);
  assert.match(cssSource, /utilityMenuStatusBadge--pro[\s\S]*linear-gradient/);
  assert.match(cssSource, /@media \(max-width: 350px\)/);
});
