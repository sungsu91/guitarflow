import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appStyleUrl = new URL("../src/style.css", import.meta.url);
const appSourceUrl = new URL("../src/App.jsx", import.meta.url);

test("brand-dark mobile skin loadout uses the compact speech-bubble typography", async () => {
  const appCss = await readFile(appStyleUrl, "utf8");
  const themedLoadoutRules = [
    "shooterSkinArenaLoadoutSummary > small",
    "shooterSkinArenaLoadoutSummary strong",
    "shooterSkinArenaLoadoutSummary em",
    "shooterSkinArenaEquipmentRow small",
    "shooterSkinArenaEquipmentRow strong",
  ];

  for (const selector of themedLoadoutRules) {
    assert.match(
      appCss,
      new RegExp(`\\.app:is\\(\\.theme-brand, \\.theme-light, \\.theme-dark\\) \\.${selector.replaceAll(" ", "\\s+")}`),
      `${selector} must include the brand-dark theme`,
    );
  }
});

test("skin tabs follow the requested guitar, effect, map, pick, monster order", async () => {
  const appSource = await readFile(appSourceUrl, "utf8");
  const tabBlock = appSource.match(/const SHOOTER_SKIN_TABS = \[([\s\S]*?)\n\];/)?.[1] ?? "";

  assert.deepEqual(
    [...tabBlock.matchAll(/\{ id: "([^"]+)", label: "([^"]+)" \}/g)]
      .map(([, id, label]) => [id, label]),
    [
      ["guitar", "기타"],
      ["effect", "이펙트"],
      ["map", "맵"],
      ["pick", "피크"],
      ["monster", "몹스킨"],
    ],
  );
});

test("physical mobile map catalog keeps a dedicated touch-scroll area", async () => {
  const [appSource, appCss] = await Promise.all([
    readFile(appSourceUrl, "utf8"),
    readFile(appStyleUrl, "utf8"),
  ]);

  assert.match(appSource, /shooterSkinPickerBodyFrame--\$\{shooterSkinTab\}/);
  assert.match(appCss, /shooterSkinPickerBodyFrame--map[\s\S]*?height: 100%;[\s\S]*?overflow: hidden;/);
  assert.match(appCss, /shooterSkinConfigurator--arenaPreview \.shooterSkinPickerBody[\s\S]*?overflow-y: auto !important;[\s\S]*?touch-action: pan-y !important;/);
});
