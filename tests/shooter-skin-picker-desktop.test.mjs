import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appSourceUrl = new URL("../src/App.jsx", import.meta.url);
const styleSourceUrl = new URL("../src/style.css", import.meta.url);

test("desktop skin picker is a foreground window with wrapped catalogs", async () => {
  const [appSource, styleSource] = await Promise.all([
    readFile(appSourceUrl, "utf8"),
    readFile(styleSourceUrl, "utf8"),
  ]);

  assert.match(appSource, /shooterGuitarPickerOverlay--desktopWindow/);
  assert.match(appSource, /shooterSkinConfigurator--desktopWindow/);
  assert.doesNotMatch(appSource, /<section className="shooterSkinLivePreview"/);
  assert.match(styleSource, /\.shooterGuitarPickerOverlay--desktopWindow[\s\S]*?place-items: start start !important/);
  assert.match(styleSource, /\.shooterGuitarPickerOverlay--desktopWindow[\s\S]*?background: transparent !important;[\s\S]*?backdrop-filter: none !important/);
  assert.match(styleSource, /\.shooterSkinConfigurator--desktopWindow[\s\S]*?display: block !important/);
  assert.match(styleSource, /\.shooterSkinConfigurator--desktopWindow[\s\S]*?width: clamp\(420px, 34vw, 620px\) !important/);
  assert.match(styleSource, /\.shooterSkinConfigurator--desktopWindow[\s\S]*?height: min\(610px, calc\(100dvh - 48px\)\) !important/);
  assert.match(styleSource, /\.shooterSkinConfigurator--desktopWindow[\s\S]*?transform: none !important/);
  assert.match(appSource, /onClick=\{\(\) => \{\s*applyGuitarVariant\(variant\.id\);\s*\}\}/);
  assert.match(styleSource, /\.shooterSkinConfigurator--desktopWindow \.shooterGuitarPickerGrid,[\s\S]*?grid-auto-flow: row !important;[\s\S]*?overflow: visible !important/);
  assert.match(styleSource, /\.shooterSkinConfigurator--desktopWindow \.shooterMapPickerGrid \{[\s\S]*?display: grid !important;[\s\S]*?grid-auto-flow: row !important;[\s\S]*?overflow: visible !important/);
  assert.match(styleSource, /\.shooterSkinConfigurator--desktopWindow :is\([\s\S]*?\.shooterEffectSetScroller,[\s\S]*?overflow-x: auto/);
});

test("skin picker defers effect decoding and pauses desktop map animation", async () => {
  const appSource = await readFile(appSourceUrl, "utf8");

  assert.doesNotMatch(
    appSource,
    /if \(!shooterGuitarPickerOpen\) return;\s*void preloadShooterEffectCatalog\(\)/,
  );
  assert.match(appSource, /if \(option\.id === "effect"\) void preloadShooterEffectCatalog\(\)/);
  assert.match(appSource, /&& \(isMobileLayout \|\| !shooterGuitarPickerOpen\)/);
});
