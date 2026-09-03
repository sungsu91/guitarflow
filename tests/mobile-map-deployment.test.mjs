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
  const [appSource, styles] = await Promise.all([
    readFile(new URL("../src/App.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/style.css", import.meta.url), "utf8"),
  ]);

  assert.match(
    appSource,
    /className=\{`shooterGuitarPickerModal shooterGuitarPickerModal--\$\{shooterSkinTab\}`\}/,
  );
  assert.match(
    styles,
    /\.shooterGuitarPickerModal--map\s*\{[\s\S]*?grid-template-rows: auto auto auto;[\s\S]*?height: auto !important;/,
  );
  assert.match(
    styles,
    /\.shooterGuitarPickerModal--map[\s\S]*?\.shooterSkinPickerBodyFrame--map[\s\S]*?> \.shooterSkinPickerBody\s*\{[\s\S]*?overflow: visible !important;/,
  );
});
