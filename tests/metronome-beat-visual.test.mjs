import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const polishCss = await readFile(new URL("../src/polish.css", import.meta.url), "utf8");
const finalBeatPass = polishCss.slice(polishCss.lastIndexOf("/* Mobile standalone metronome: beat state is structural; playback adds glow only. */"));

test("mobile metronome keeps strong, weak, and mute beat states visually distinct", () => {
  assert.match(finalBeatPass, /beatDot--strong[\s\S]*\.beatDot__glyph \{[\s\S]*border: 2px solid var\(--metro-beat-strong\) !important/);
  assert.match(finalBeatPass, /beatDot--strong[\s\S]*\.beatDot__innerMark \{[\s\S]*position: absolute !important;[\s\S]*width: calc\(100% \+ 10px\) !important;[\s\S]*border: 2px solid var\(--metro-beat-strong\) !important;[\s\S]*transform: translate\(-50%, -50%\) !important/);
  assert.match(finalBeatPass, /beatDot--weak[\s\S]*border-style: solid !important/);
  assert.match(finalBeatPass, /beatDot--weak[\s\S]*opacity: 1 !important/);
  assert.match(finalBeatPass, /beatDot--mute[\s\S]*border-style: dashed !important/);
  assert.match(finalBeatPass, /beatDot--mute[\s\S]*repeating-linear-gradient\(/);
});

test("tone labels reuse the strong and weak beat symbols", () => {
  assert.match(finalBeatPass, /metronomeSelectLabelDot \{[\s\S]*width: 13px;[\s\S]*border: 1\.5px solid var\(--metro-beat-weak\) !important/);
  assert.match(finalBeatPass, /metronomeSelectLabelDot--strong[\s\S]*outline: 1\.5px solid var\(--metro-beat-strong\) !important/);
  assert.match(finalBeatPass, /metronomeSelectLabelDot--weak[\s\S]*border-color: var\(--metro-beat-weak\) !important/);
});

test("current beat adds only an outer glow without replacing its state styling", () => {
  const activeGlyphRule = finalBeatPass.match(/\.beatDot\.metronomeBeatButton\.active\s+\.beatDot__glyph\s*\{([\s\S]*?)\n\s*\}/)?.[1] ?? "";

  assert.match(activeGlyphRule, /drop-shadow\(0 0 5px var\(--metro-current-glow\)\)/);
  assert.doesNotMatch(activeGlyphRule, /\b(?:background|border|outline|opacity)\s*:/);
});

test("both mobile display modes receive restored vertical room without circle clipping", () => {
  assert.match(finalBeatPass, /--metro-visual-height: clamp\(180px, calc\(100dvh - 646px\), 236px\)/);
  assert.match(finalBeatPass, /height: var\(--metro-visual-height\) !important/);
  assert.match(finalBeatPass, /--metro-circle-radius: clamp\(62px, calc\(\(var\(--metro-visual-height\) - 48px\) \/ 2\), 92px\)/);
  assert.match(finalBeatPass, /translate\(var\(--metro-circle-radius\)\)/);
});
