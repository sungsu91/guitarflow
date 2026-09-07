import * as additional from "../../src/chords/additionalChords.js";
import * as fixedAdd from "../../src/chords/fixedAddVoicings.js";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
import * as notation from "../../src/music/noteNotation.js";
import * as theory from "../../src/chords/chordTheory.js";
import { getChordFretWindow } from "../../src/fretboard/chordFretWindow.js";

export async function loadChordRuntime(source, injected = {}) {
  source ??= await readFile(new URL("../../src/App.jsx", import.meta.url), "utf8");
  const section = (start, end) => {
    const a = source.indexOf(start), b = source.indexOf(end, a);
    if (a < 0 || b < 0) throw new Error(`Missing runtime boundary: ${start}`);
    return source.slice(a, b);
  };
  const context = vm.createContext({ ...notation, ...theory, ...additional, ...fixedAdd, ...injected, NOTE_FREQUENCIES: {},
    getCompactFretRange: (notes, barres, fallback, stringStates) => getChordFretWindow({ notes, barres, fallback, stringStates }).fretRange,
  });
  vm.runInContext([
    section("function pitchToMidi(", "function getPitchOctave("),
    section("function getChordDisplayNoteName(", "function getFrequencyFromMidi("),
    section("const STANDARD_TUNING =", "function getSixthStringRootFret("),
    section('const CHORD_VIEWER_POSITION_ALL =', 'const CHORD_CATALOG_ALL ='),
    section("function getChordMetaFromLabel(", "function getChordEntryId("),
    "globalThis.catalog = CHORD_VIEW_OPTIONS; globalThis.extensions = CHORD_EXTENSION_OPTIONS;",
  ].join("\n"), context);
  return context;
}

export function snapshotChordRuntime(runtime, formulas = theory.CHORD_TONE_INTERVALS) {
  const result = {};
  for (const root of notation.CHROMATIC_NOTES) {
    for (const [quality, extensions] of Object.entries(formulas)) {
      for (const extension of Object.keys(extensions)) {
        const displayName = runtime.getChordNameFromParts(root, "natural", quality, extension);
        const storedChord = runtime.catalog.find((c) => c.root === root && c.quality === quality && c.extension === extension) ?? null;
        const args = { root, quality, extension, displayName, storedChord };
        result[`${root}:${quality}:${extension}`] = {
          chord: runtime.buildChordToneReferenceOption(args),
          positions: runtime.buildChordReferencePositionMap(args),
        };
      }
    }
  }
  return JSON.parse(JSON.stringify(result));
}
