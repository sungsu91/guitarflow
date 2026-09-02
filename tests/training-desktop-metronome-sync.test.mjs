import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appUrl = new URL("../src/App.jsx", import.meta.url);
const desktopStyleUrl = new URL("../src/layouts/desktop-layout.css", import.meta.url);

test("single and scale desktop training reuse the standalone metronome component tree", async () => {
  const appSource = await readFile(appUrl, "utf8");

  assert.match(
    appSource,
    /isMobileLayout\s*\? "referenceStandaloneMetronomeDeck standaloneMetronomePanel"\s*: "trainingStandaloneMetronomeDeck standaloneMetronomePanel"/,
  );
  assert.match(
    appSource,
    /actionPanelClassName=\{[\s\S]*isMobileLayout[\s\S]*"referenceMetronomeActionPanel"[\s\S]*"trainingStandaloneMetronomeActionPanel"/,
  );
  assert.match(
    appSource,
    /className=\{[\s\S]*isMobileLayout[\s\S]*"standaloneMetronomeControl referenceStandaloneMetronomeControl"[\s\S]*"standaloneMetronomeControl trainingStandaloneMetronomeControl"/,
  );
  assert.match(
    appSource,
    /selectedCategory\.id === "scale-block" \? \(\s*!isMobileLayout \? \(\s*<BackingLoop\s+desktopPresentation="standalone"\s+mobile=\{false\}\s+ownerMode=\{APP_MODES\.PRACTICE\}/,
  );
  assert.doesNotMatch(
    appSource,
    /!isMobileLayout \? \(\s*<BackingLoop mobile=\{false\} ownerMode=\{APP_MODES\.PRACTICE\} \/>\s*\) : selectedCategory\.id === "scale-block"/,
  );
  assert.match(
    appSource,
    /selectedCategory\.id === "scale-block" \? \([\s\S]*?!isMobileLayout \? \([\s\S]*?<BackingLoop\s+desktopPresentation="standalone"\s+mobile=\{false\}\s+ownerMode=\{APP_MODES\.PRACTICE\}[\s\S]*?\) : \([\s\S]*?<div className="scaleTrainingBackingLoop">\s*<BackingLoop mobile ownerMode=\{APP_MODES\.PRACTICE\} \/>/,
  );
  assert.match(
    appSource,
    /<BackingLoop\s+desktopPresentation="standalone"\s+mobile=\{isMobileLayout\}\s+ownerMode=\{APP_MODES\.METRONOME\}/,
  );
});

test("desktop training only scales the shared standalone panels", async () => {
  const styles = await readFile(desktopStyleUrl, "utf8");

  assert.match(
    styles,
    /> \.referenceTrainingToolbar > \.trainingStandaloneMetronomeDeck \{[\s\S]*grid-auto-rows: max-content[\s\S]*background: transparent !important/,
  );
  assert.match(
    styles,
    /\.trainingStandaloneMetronomeDeck > :is\([\s\S]*\.metronomeHeroCard,[\s\S]*\.trainingStandaloneMetronomeControl,[\s\S]*\.backingLoopPanel[\s\S]*\) \{[\s\S]*width: 100% !important/,
  );
  assert.match(
    styles,
    /\.trainingStandaloneMetronomeDeck > \.metronomeHeroCard--interactive \{[\s\S]*min-height: 150px !important/,
  );
  assert.match(
    styles,
    /\.trainingStandaloneMetronomeActionPanel \{[\s\S]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/,
  );
  assert.match(
    styles,
    /\.backingLoopPanel--desktop\.backingLoopPanel--standaloneDesktop\s+\.backingLoopPlayerBar \{[\s\S]*justify-content: center !important/,
  );
  assert.doesNotMatch(
    styles,
    /\.trainingStandaloneMetronomeDeck > \.backingLoopPanel--desktop \{[\s\S]*overflow: hidden !important/,
  );
});

test("desktop training dots match the latest mobile strong weak and mute states", async () => {
  const styles = await readFile(desktopStyleUrl, "utf8");

  assert.match(styles, /--training-beat-strong: #c77f90/);
  assert.match(styles, /--training-beat-weak: #d9aa55/);
  assert.match(styles, /--training-beat-mute: rgba\(126, 128, 130, 0\.88\)/);
  assert.match(
    styles,
    /\.referenceBeatMetronomeDot\.beatDot--strong \.beatDot__glyph \{[\s\S]*outline: 1\.5px solid var\(--training-beat-strong\)[\s\S]*outline-offset: 3px/,
  );
  assert.match(
    styles,
    /\.referenceBeatMetronomeDot\.beatDot--weak \.beatDot__glyph \{[\s\S]*border-color: var\(--training-beat-weak\)[\s\S]*border-style: solid/,
  );
  assert.match(
    styles,
    /\.referenceBeatMetronomeDot\.beatDot--mute \.beatDot__glyph \{[\s\S]*border-style: dashed[\s\S]*repeating-linear-gradient/,
  );
  assert.match(
    styles,
    /\.referenceBeatMetronomeDot\.beatDot\.active \.beatDot__glyph \{[\s\S]*drop-shadow\(0 0 11px var\(--training-beat-current-glow\)\)/,
  );
  assert.match(
    styles,
    /> \.referenceTrainingPanel:is\(\.firstPositionTrainingPanel, \.scaleBlockTrainingPanel\)[\s\S]*grid-template-rows: minmax\(0, 1fr\) clamp\(114px, 12vh, 128px\) !important/,
  );
  assert.match(
    styles,
    /\.referenceTrainingPanel:is\(\.firstPositionTrainingPanel, \.scaleBlockTrainingPanel\)[\s\S]*\.referenceBeatMetronomeStrip \.beatIndicatorRow \{[\s\S]*width: min\(640px, 100%\) !important[\s\S]*gap: clamp\(18px, 2vw, 32px\) !important/,
  );
  assert.match(
    styles,
    /\.referenceTrainingPanel:is\(\.firstPositionTrainingPanel, \.scaleBlockTrainingPanel\)[\s\S]*\.referenceBeatMetronomeDot \{[\s\S]*--beat-dot-touch: clamp\(66px, 4\.4vw, 76px\)[\s\S]*--beat-dot-size: clamp\(46px, 3\.15vw, 54px\)/,
  );
  assert.match(
    styles,
    /\.referenceTrainingPanel:is\(\.firstPositionTrainingPanel, \.scaleBlockTrainingPanel\)[\s\S]*\.referenceBeatMetronomeDot \.beatDot__glyph \{[\s\S]*width: var\(--beat-dot-size\) !important[\s\S]*height: var\(--beat-dot-size\) !important/,
  );
  assert.match(
    styles,
    /\.referenceTrainingBoard \.trainingSharedFretboard \{[\s\S]*transform: translateY\(clamp\(8px, 1vh, 12px\)\)/,
  );
});

test("desktop single and scale fretboards enclose their beat strips as one surface", async () => {
  const styles = await readFile(desktopStyleUrl, "utf8");

  assert.match(styles, /Single-note and scale practice present the fretboard and beat-state strip/);
  assert.match(
    styles,
    /> \.referenceTrainingPanel:is\(\.firstPositionTrainingPanel, \.scaleBlockTrainingPanel\)[\s\S]*?> \.referenceTrainingMainRow \{[\s\S]*?row-gap: 0 !important;/,
  );
  assert.match(
    styles,
    /> \.referenceTrainingMainRow > \.referenceTrainingBoard \{[\s\S]*?border-bottom-right-radius: 0 !important;[\s\S]*?border-bottom-left-radius: 0 !important;/,
  );
  assert.match(
    styles,
    /> \.referenceTrainingMainRow > \.referenceBeatMetronomeStrip \{[\s\S]*?border-top: 0 !important;[\s\S]*?border-top-right-radius: 0 !important;[\s\S]*?border-top-left-radius: 0 !important;/,
  );
});
