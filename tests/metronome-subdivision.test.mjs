import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  METRONOME_SUBDIVISION_OPTIONS,
  getMetronomeSubdivisionOption,
  getMetronomeSubdivisionTickMs,
} from "../src/metronome/subdivision.js";

test("metronome exposes quarter, eighth, triplet, sixteenth, and sextuplet subdivisions", () => {
  assert.deepEqual(
    METRONOME_SUBDIVISION_OPTIONS.map(({ id, label, notation, clicksPerBeat }) => ({
      id,
      label,
      notation,
      clicksPerBeat,
    })),
    [
      { id: "quarter", label: "♩", notation: undefined, clicksPerBeat: 1 },
      { id: "eighth", label: "♪♪", notation: undefined, clicksPerBeat: 2 },
      { id: "eighth-triplet", label: null, notation: "eighth-triplet", clicksPerBeat: 3 },
      { id: "sixteenth", label: "♬♬", notation: undefined, clicksPerBeat: 4 },
      { id: "sixteenth-triplet", label: null, notation: "sixteenth-triplet", clicksPerBeat: 6 },
    ],
  );
});

test("triplet subdivisions render language-independent three-note SVG notation", async () => {
  const source = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");

  assert.match(source, /data-subdivision-notation=\{notation\}/);
  assert.match(source, /<text className="metronomeSubdivisionNotationNumber"[^>]*>3<\/text>/);
  assert.match(source, /beamCount === 2/);
  assert.match(source, /renderMetronomeOptionLabel\(selectedOption/);
  assert.match(source, /renderMetronomeOptionLabel\(option/);
});

test("subdivision timing divides each beat from the absolute BPM duration", () => {
  for (const bpm of [30, 80, 120, 240]) {
    const beatMs = 60000 / bpm;
    for (const subdivision of METRONOME_SUBDIVISION_OPTIONS) {
      const tickMs = getMetronomeSubdivisionTickMs(bpm, subdivision);
      assert.ok(Math.abs((tickMs * subdivision.clicksPerBeat) - beatMs) < 1e-9);
      assert.ok(Math.abs((tickMs * subdivision.clicksPerBeat * 1000) - (beatMs * 1000)) < 1e-6);
    }
  }
});

test("unknown subdivision ids retain the quarter-note fallback", () => {
  assert.equal(getMetronomeSubdivisionOption("missing").id, "quarter");
});
