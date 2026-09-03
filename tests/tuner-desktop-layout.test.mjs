import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const tunerSource = await readFile(new URL("../src/tuner/TunerMode.jsx", import.meta.url), "utf8");
const tunerCss = await readFile(new URL("../src/tuner/tuner-mode.css", import.meta.url), "utf8");

function getFunctionSource(name, nextName) {
  const start = tunerSource.indexOf(`function ${name}`);
  const end = tunerSource.indexOf(`function ${nextName}`, start + 1);
  assert.notEqual(start, -1, `${name} must exist`);
  assert.notEqual(end, -1, `${nextName} must follow ${name}`);
  return tunerSource.slice(start, end);
}

test("desktop tuner reuses the mobile controls and gauge without numeric readouts", () => {
  const desktopLayout = getFunctionSource("DesktopTunerLayout", "TunerMode");

  assert.match(desktopLayout, /<MobileTunerControls/);
  assert.match(desktopLayout, /showReadout=\{false\}/);
  assert.match(desktopLayout, /showDirectionScale=\{false\}/);
  assert.match(desktopLayout, /<TunerRecognitionStatus/);
  assert.match(desktopLayout, /showMode=\{false\}/);
  assert.doesNotMatch(desktopLayout, /<TunerReadout/);
});

test("desktop expansion stays outside mobile breakpoints", () => {
  assert.match(tunerCss, /@media \(min-width: 768px\) \{[\s\S]*?\.tunerModeBody--desktop/);
  assert.match(tunerCss, /@media \(min-width: 1024px\) \{[\s\S]*?main\.app\.app\.app\.tunerMode/);
  assert.match(tunerCss, /\.desktopWorkspaceContent:has\(> main\.app\.tunerMode\) \{[\s\S]*?padding-left: var\(--desktop-workspace-left\);/);
  assert.match(tunerCss, /\.tunerModeShell--desktop \.tunerMobileControls/);
  assert.match(tunerCss, /\.tunerDesktopPitchColumn/);
});

test("mobile tuner keeps its gauge-first portrait composition", () => {
  const mobileLayout = getFunctionSource("MobileTunerLayout", "DesktopTunerLayout");

  assert.match(mobileLayout, /<MobileTunerControls/);
  assert.match(mobileLayout, /tunerModeBody--mobile/);
  assert.match(mobileLayout, /showReadout=\{false\}/);
  assert.match(mobileLayout, /showDirectionScale=\{false\}/);
  assert.match(mobileLayout, /showTarget/);
  assert.match(tunerCss, /\(orientation: landscape\) and \(max-width: 1024px\) and \(hover: none\)/);
  assert.match(tunerCss, /var\(--portrait-mobile-canvas-height, 100dvh\)/);
});
