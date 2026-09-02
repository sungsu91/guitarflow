import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appSourceUrl = new URL("../src/App.jsx", import.meta.url);
const styleSourceUrl = new URL("../src/style.css", import.meta.url);

test("desktop skin picker is a single window without the live loadout stage", async () => {
  const [appSource, styleSource] = await Promise.all([
    readFile(appSourceUrl, "utf8"),
    readFile(styleSourceUrl, "utf8"),
  ]);

  assert.match(appSource, /shooterGuitarPickerOverlay--desktopWindow/);
  assert.match(appSource, /shooterSkinConfigurator--desktopWindow/);
  assert.doesNotMatch(appSource, /<section className="shooterSkinLivePreview"/);
  assert.match(styleSource, /\.shooterGuitarPickerOverlay--desktopWindow[\s\S]*?backdrop-filter: none !important/);
  assert.match(styleSource, /\.shooterSkinConfigurator--desktopWindow[\s\S]*?display: block !important/);
  assert.match(
    styleSource,
    /\.shooterSkinConfigurator--desktopWindow[\s\S]*?transform: translateY\(clamp\(-112px, -11dvh, -52px\)\)/,
  );
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
