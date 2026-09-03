import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appSource = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
const styleSource = await readFile(new URL("../src/style.css", import.meta.url), "utf8");

test("mini chord replaces the CAPO strip with left-side whole-key controls", () => {
  const rowStart = appSource.indexOf('className="miniChordTransposeControlBar"');
  const rowEnd = appSource.indexOf('className="miniChordArrangementControlGroup"', rowStart);
  const rowSource = appSource.slice(rowStart, rowEnd);

  assert.ok(rowStart >= 0);
  assert.match(rowSource, /miniChordTransposeStepControls/);
  assert.match(rowSource, /전체 키 반음 낮추기/);
  assert.match(rowSource, /전체 키 반음 올리기/);
  assert.match(rowSource, /resetMiniChordTranspose/);
  assert.doesNotMatch(rowSource, /CAPO|Accidental|샵으로 표기|플랫으로 표기/);
  assert.ok(rowSource.indexOf("miniChordTransposeStepControls") < rowSource.indexOf("miniChordTransposeScope"));
});

test("mini chord derives visible slots while preserving source slots for persistence", () => {
  assert.match(appSource, /displayChord: getMiniChordSoundingLabel\(slot\.chord\)/);
  assert.match(appSource, /slots: miniChordSlots,[\s\S]*?transposeSemitones: miniChordTransposeSemitones/);
  assert.match(appSource, /getMiniChordSourceLabel\(value\)/);
  assert.match(appSource, /miniChordSoundingKey\.accidentalPreference/);
});

test("mini chord save, load and key changes share a lightweight centered indicator", () => {
  assert.match(appSource, /runMiniChordOperation\("키 변경 중"/);
  assert.match(appSource, /runMiniChordOperation\("불러오는 중"/);
  assert.match(appSource, /runMiniChordOperation\("저장 중"/);
  assert.match(appSource, /className="miniChordOperationIndicator"/);
  assert.match(styleSource, /\.miniChordOperationIndicator\s*\{[\s\S]*?position: fixed !important;[\s\S]*?top: 50% !important;[\s\S]*?left: 50% !important;/);
});
