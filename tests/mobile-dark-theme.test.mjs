import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const runtimeUrl = new URL("../src/AppRuntime.jsx", import.meta.url);
const mobileDarkThemeUrl = new URL("../src/layouts/mobile-dark-theme.css", import.meta.url);

test("mobile dark corrections load after responsive workstation styles", async () => {
  const runtimeSource = await readFile(runtimeUrl, "utf8");
  const responsiveIndex = runtimeSource.indexOf('import "./layouts/responsive-play-focus.css"');
  const darkThemeIndex = runtimeSource.indexOf('import "./layouts/mobile-dark-theme.css"');

  assert.ok(responsiveIndex >= 0);
  assert.ok(darkThemeIndex > responsiveIndex);
});

test("mobile dark theme covers shared selects, arrangement fields, and landscape workstations", async () => {
  const css = await readFile(mobileDarkThemeUrl, "utf8");

  assert.match(css, /theme-brand\.viewport-mobile-surface[\s\S]*?\.metronomeSelectButton/);
  assert.match(css, /miniChordArrangementSectionFields[\s\S]*?:is\(input, select\)/);
  assert.match(css, /theme-brand\.metronomeMode\.viewport-mobile-surface\.viewport-landscape\.landscapePlayFocus/);
  assert.match(css, /metronomeBeatMatrix\.metronomeBeatMatrix--main/);
  assert.match(css, /referenceTrainingMainRow/);
  assert.match(css, /referenceBeatMetronomeStrip/);
  assert.match(css, /referenceStandaloneMetronomeDeck\.standaloneMetronomePanel/);
  assert.match(css, /referenceMetronomeHeroCard\.referenceMetronomeHeroCard/);
  assert.match(css, /metronomeSelectButton\.metronomeSelectButton/);
  assert.match(css, /scalePickerPanel\.referenceScalePicker/);
  assert.match(css, /trainingNoteGuideToggle\.trainingNoteGuideToggle\.selected/);
  assert.match(css, /stage3ProgressHud > \.stage3ReferenceBeatMetronomeStrip/);
  assert.match(css, /stage3BpmTransportCard/);
  assert.match(css, /sharedAccompanimentPanel--training/);
  assert.match(css, /stage3EmptyProgressionMeasure > span/);
});

test("mobile dark corrections stay isolated from desktop and light theme", async () => {
  const css = await readFile(mobileDarkThemeUrl, "utf8");

  assert.doesNotMatch(css, /theme-light/);
  assert.doesNotMatch(css, /viewport-desktop-surface/);
  assert.match(css, /theme-brand\.viewport-mobile-surface/);
});
