import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const hookUrl = new URL("../src/shooter/maps/editor/useMapEditMode.js", import.meta.url);
const panelUrl = new URL("../src/shooter/maps/editor/MapEditPanel.jsx", import.meta.url);

test("map editor Apply saves and rebases the session without closing it", async () => {
  const [hookSource, panelSource] = await Promise.all([
    readFile(hookUrl, "utf8"),
    readFile(panelUrl, "utf8"),
  ]);
  const applyStart = hookSource.indexOf("const applyEditing = useCallback");
  const applyEnd = hookSource.indexOf("const selectedPlacement", applyStart);
  const applySource = hookSource.slice(applyStart, applyEnd);

  assert.ok(applyStart >= 0 && applyEnd > applyStart);
  assert.match(panelSource, /className="mapEditApplyButton"[^>]*onClick=\{applyEditing\}/);
  assert.match(panelSource, /effectEditor\?\.hasChanges && await effectEditor\.applyEditing\(\)/);
  assert.match(panelSource, /monsterEditor\?\.hasChanges && await monsterEditor\.applyEditing\(\)/);
  assert.doesNotMatch(applySource, /finishEditing\(\)/);
  assert.match(applySource, /setCommittedState/);
  assert.match(applySource, /setDraftState/);
  assert.match(applySource, /sessionBaseCacheRef\.current\.set/);
  assert.match(applySource, /historyCacheRef\.current\.set/);
  assert.match(applySource, /setSaveStatus\("saved"\)/);
});

test("saving several edited maps rebases every saved draft for repeated Apply", async () => {
  const hookSource = await readFile(hookUrl, "utf8");
  const saveStart = hookSource.indexOf("const saveSessionPlacements = useCallback");
  const saveEnd = hookSource.indexOf("const applyEditing = useCallback", saveStart);
  const saveSource = hookSource.slice(saveStart, saveEnd);

  assert.ok(saveStart >= 0 && saveEnd > saveStart);
  assert.match(saveSource, /savedEntries\.forEach\(\(\[skinId, savedPlacements\]\)/);
  assert.match(saveSource, /draftCacheRef\.current\.set\(skinId/);
  assert.match(saveSource, /sessionBaseCacheRef\.current\.set\(skinId/);
  assert.match(saveSource, /historyCacheRef\.current\.set\(skinId/);
});

test("effect tuning save validation does not depend on its rewritten defaults module", async () => {
  const [viteConfig, normalizationSource] = await Promise.all([
    readFile(new URL("../vite.config.js", import.meta.url), "utf8"),
    readFile(new URL("../src/shooter/effects/effectTuningNormalization.js", import.meta.url), "utf8"),
  ]);

  assert.match(
    viteConfig,
    /from "\.\/src\/shooter\/effects\/effectTuningNormalization\.js"/,
  );
  assert.doesNotMatch(viteConfig, /from "\.\/src\/shooter\/effects\/effectTuning\.js"/);
  assert.doesNotMatch(normalizationSource, /effectTuningDefaults/);
});
