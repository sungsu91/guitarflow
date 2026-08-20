import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appStyleUrl = new URL("../src/style.css", import.meta.url);

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
