import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appSourceUrl = new URL("../src/App.jsx", import.meta.url);

test("shooter starts in KO while preserving later language choices", async () => {
  const appSource = await readFile(appSourceUrl, "utf8");

  assert.match(appSource, /const SHOOTER_SOLFEGE_STORAGE_KEY = "rifflabShooterSolfegeOnV2";/);
  assert.match(appSource, /const SHOOTER_DEFAULT_SOLFEGE_ON = true;/);
  assert.match(appSource, /storedPreference === null \? SHOOTER_DEFAULT_SOLFEGE_ON : storedPreference !== "false"/);
  assert.match(appSource, /useState\(getStoredShooterSolfegeOn\)/);
  assert.match(appSource, /localStorage\.setItem\(SHOOTER_SOLFEGE_STORAGE_KEY, String\(shooterSolfegeOn\)\)/);
});
