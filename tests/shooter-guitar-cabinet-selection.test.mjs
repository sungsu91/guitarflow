import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  DEFAULT_SHOOTER_GUITAR_CABINET_SKIN_ID,
  toggleShooterGuitarCabinetSkinId,
} from "../src/shooter/guitarCabinet.js";

const mobileSkinCssUrl = new URL("../src/shooter/mobile-skin-configurator.css", import.meta.url);

test("cabinet selection can be removed by selecting the equipped cabinet again", () => {
  assert.equal(
    toggleShooterGuitarCabinetSkinId("none", "climate-cabinet"),
    "climate-cabinet",
  );
  assert.equal(
    toggleShooterGuitarCabinetSkinId("climate-cabinet", "climate-cabinet"),
    DEFAULT_SHOOTER_GUITAR_CABINET_SKIN_ID,
  );
  assert.equal(
    toggleShooterGuitarCabinetSkinId("climate-cabinet", "none"),
    DEFAULT_SHOOTER_GUITAR_CABINET_SKIN_ID,
  );
});

test("mobile cabinet card uses the transparent floor-effect treatment", async () => {
  const css = await readFile(mobileSkinCssUrl, "utf8");

  assert.match(css, /html\.shooterCanonicalMobile[\s\S]*\.shooterSkinConfigurator--arenaPreview/);
  assert.match(css, /\.shooterGuitarCabinetPickerItem--standalone[\s\S]*background: transparent !important/);
  assert.match(css, /\.shooterGuitarCabinetPickerItem--standalone\.selected[\s\S]*border-color: rgba\(217, 170, 85, 0\.7\) !important/);
});
