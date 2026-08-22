import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Tracker OFF never receives the active status class", async () => {
  const source = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");

  assert.match(
    source,
    /const trackerIsActive = metronomeTrackerMode === "bars"\s*\|\| \(metronomeTrackerMode === "timer" && metronomeTimerCountdown\);/,
  );
  assert.match(
    source,
    /className=\{`metronomeAdvancedSummary \$\{metronomeAdvancedPanel === "tracker"[\s\S]*?\$\{trackerIsActive \? "active" : ""\}`\}/,
  );
  assert.doesNotMatch(
    source,
    /metronomeTrackerMode !== "off" \|\| metronomeCountInBars > 0 \? "active"/,
  );
});
