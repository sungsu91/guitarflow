import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { getIsMobileLayout } from "../src/layouts/mobileLayout.js";
import {
  LAYERED_SHOOTER_MAP_SKINS,
  getShooterMapsForLayout,
} from "../src/shooter/maps/registry.js";

test("a physical iPhone receives the complete portrait map catalog", () => {
  const physicalPhoneWindow = {
    matchMedia: () => ({ matches: true }),
    navigator: {
      maxTouchPoints: 5,
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit Mobile Safari",
      userAgentData: undefined,
    },
  };
  const isMobileLayout = getIsMobileLayout(physicalPhoneWindow);
  const mapIds = getShooterMapsForLayout(isMobileLayout, { isPortraitLayout: true })
    .map((map) => map.id);

  assert.equal(isMobileLayout, true);
  assert.deepEqual(mapIds, LAYERED_SHOOTER_MAP_SKINS.map((map) => map.id));
  assert.equal(mapIds.length, 8);
});

test("Vercel revalidates the entry document so phones cannot retain an old map registry", async () => {
  const config = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));
  const cacheHeaderFor = (source) => config.headers
    .find((entry) => entry.source === source)
    ?.headers.find((header) => header.key.toLowerCase() === "cache-control")
    ?.value;

  assert.equal(cacheHeaderFor("/"), "public, max-age=0, must-revalidate");
  assert.equal(cacheHeaderFor("/index.html"), "public, max-age=0, must-revalidate");
});

test("the mobile Safari map picker cannot clip direct choices below its first row", async () => {
  const [appSource, styles, mobileStyles] = await Promise.all([
    readFile(new URL("../src/App.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/style.css", import.meta.url), "utf8"),
    readFile(new URL("../src/shooter/mobile-skin-configurator.css", import.meta.url), "utf8"),
  ]);

  assert.match(
    appSource,
    /className=\{`shooterGuitarPickerModal shooterGuitarPickerModal--\$\{shooterSkinTab\}`\}/,
  );
  assert.match(
    styles,
    /\.shooterGuitarPickerModal--map\s*\{[\s\S]*?display: flex;[\s\S]*?height: 318px !important;[\s\S]*?min-height: 318px !important;/,
  );
  assert.match(
    styles,
    /\.shooterGuitarPickerModal--map[\s\S]*?\.shooterMapPickerGrid\s*\{[\s\S]*?display: flex !important;[\s\S]*?flex-flow: row wrap;/,
  );
  assert.match(
    styles,
    /\.shooterGuitarPickerModal--map[\s\S]*?\.shooterMapCard\s*\{[\s\S]*?flex: 0 0 calc\(\(100% - 12px\) \/ 3\);[\s\S]*?height: 61px !important;[\s\S]*?aspect-ratio: auto !important;/,
  );
  assert.match(
    mobileStyles,
    /\.shooterGuitarPickerOverlay--arenaPreview[\s\S]*?\.shooterGuitarPickerModal--map\s*\{[\s\S]*?height: 318px !important;[\s\S]*?max-height: none !important;/,
  );
  assert.match(
    mobileStyles,
    /\.shooterGuitarPickerModal--map[\s\S]*?\.shooterMapPickerGrid\s*\{[\s\S]*?display: flex !important;[\s\S]*?flex-flow: row wrap !important;/,
  );
  assert.match(
    mobileStyles,
    /\.shooterMapPickerGrid[\s\S]*?> \.shooterMapCard\s*\{[\s\S]*?flex: 0 0 calc\(\(100% - 12px\) \/ 3\) !important;[\s\S]*?min-height: 61px !important;/,
  );
});
