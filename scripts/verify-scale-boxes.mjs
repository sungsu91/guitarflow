import { createServer } from "vite";

const ROOTS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const TYPES = ["major", "minor"];
const FAMILIES = ["pentatonic", "scale"];
const BOXES = [1, 2, 3, 4, 5];
const NOTE_NAMES = ROOTS;
const NOTE_INDEX = Object.fromEntries(NOTE_NAMES.map((note, index) => [note, index]));
const SCALE_INTERVALS = {
  pentatonic: {
    major: [0, 2, 4, 7, 9],
    minor: [0, 3, 5, 7, 10],
  },
  scale: {
    major: [0, 2, 4, 5, 7, 9, 11],
    minor: [0, 2, 3, 5, 7, 8, 10],
  },
};
const STANDARD_TUNING = {
  6: "E2",
  5: "A2",
  4: "D3",
  3: "G3",
  2: "B3",
  1: "E4",
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function pitchToMidi(pitch) {
  const match = String(pitch).match(/^([A-G]#?)(-?\d+)$/);
  assert(match, `Invalid pitch: ${pitch}`);
  return (Number(match[2]) + 1) * 12 + NOTE_INDEX[match[1]];
}

function getPitchClass(pitch) {
  const match = String(pitch).match(/^([A-G]#?)/);
  assert(match, `Invalid pitch class: ${pitch}`);
  return match[1];
}

const server = await createServer({
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});

try {
  const { buildScaleBlockPractice } = await server.ssrLoadModule("/src/App.jsx");
  const rows = [];

  for (const root of ROOTS) {
    for (const type of TYPES) {
      for (const family of FAMILIES) {
        const groupRows = [];
        for (const box of BOXES) {
          const practice = buildScaleBlockPractice(root, type, family, box);
          const noteFrets = practice.notes.map((note) => Number(note.fretNumber));
          const minFret = Math.min(...noteFrets);
          const maxFret = Math.max(...noteFrets);
          const patternOffsets = Object.values(practice.pattern.stringOffsets).flat();
          const originalMinFret = practice.placement.baseStartFret + Math.min(...patternOffsets);
          const originalMaxFret = practice.placement.baseStartFret + Math.max(...patternOffsets);
          const context = `${root} ${type} ${family} BOX${box}`;

          assert(practice.displayBox === box, `${context}: display BOX number mismatch`);
          assert(minFret >= 0, `${context}: negative fret ${minFret}`);
          assert(maxFret <= 16, `${context}: unnecessarily high representative position ${minFret}-${maxFret}`);
          assert(practice.placement.octaveShift % 12 === 0, `${context}: shift is not a 12-fret octave`);
          assert(practice.visibleFrets[0] === minFret, `${context}: visible range does not start at the pattern minimum`);
          assert(practice.visibleFrets.at(-1) === maxFret, `${context}: visible range does not end at the pattern maximum`);
          if (minFret === 0) {
            assert(maxFret + 12 > 15, `${context}: open position was selected despite a valid 1-15 fret candidate`);
          }
          if (maxFret > 15) {
            assert(minFret - 12 < 0, `${context}: fret ${maxFret} could still be folded down without crossing the nut`);
          }

          for (const [stringNumber, expectedOffsets] of Object.entries(practice.pattern.stringOffsets)) {
            const actualOffsets = practice.notes
              .filter((note) => Number(note.stringNumber) === Number(stringNumber))
              .map((note) => Number(note.fretNumber) - practice.placement.startFret)
              .sort((a, b) => a - b);
            assert(
              JSON.stringify(actualOffsets) === JSON.stringify([...expectedOffsets].sort((a, b) => a - b)),
              `${context}: BOX shape changed on string ${stringNumber}`,
            );
          }

          const allowedIntervals = SCALE_INTERVALS[family][type];
          let rootNoteCount = 0;
          for (const note of practice.notes) {
            const expectedMidi = pitchToMidi(STANDARD_TUNING[note.stringNumber]) + Number(note.fretNumber);
            assert(pitchToMidi(note.pitch) === expectedMidi, `${context}: incorrect pitch at string ${note.stringNumber}, fret ${note.fretNumber}`);
            const interval = (NOTE_INDEX[getPitchClass(note.pitch)] - NOTE_INDEX[root] + 12) % 12;
            assert(allowedIntervals.includes(interval), `${context}: ${note.pitch} is outside the selected scale`);
            if (interval === 0) rootNoteCount += 1;
          }
          assert(rootNoteCount > 0, `${context}: no root note is present`);

          const row = {
            box,
            family,
            maxFret,
            minFret,
            originalMaxFret,
            originalMinFret,
            root,
            shift: practice.placement.octaveShift,
            sourceBox: practice.sourceBox,
            type,
          };
          rows.push(row);
          groupRows.push(row);
        }

        assert(
          new Set(groupRows.map((row) => row.sourceBox)).size === BOXES.length,
          `${root} ${type} ${family}: the five source patterns were not preserved exactly once`,
        );
        for (let index = 1; index < groupRows.length; index += 1) {
          const previous = groupRows[index - 1];
          const current = groupRows[index];
          const context = `${root} ${type} ${family} BOX${previous.box}->BOX${current.box}`;
          assert(previous.minFret < current.minFret, `${context}: fret positions do not strictly increase`);
          assert(current.minFret <= previous.maxFret, `${context}: adjacent BOX fret ranges are disconnected`);
        }
      }
    }
  }

  const adjusted = rows.filter((row) => row.shift !== 0);
  const formerlyHigh = rows.filter((row) => row.originalMaxFret >= 18);
  const remainingHigh = rows.filter((row) => row.maxFret >= 18);
  const highest = Math.max(...rows.map((row) => row.maxFret));
  const structuralExtended = rows.filter((row) => row.maxFret > 15);
  const openPosition = rows.filter((row) => row.minFret === 0);
  const cMajorPentatonic = rows.filter((row) => row.root === "C" && row.type === "major" && row.family === "pentatonic");

  assert(remainingHigh.length === 0, `${remainingHigh.length} combinations still select fret 18 or higher`);
  assert(formerlyHigh.every((row) => row.maxFret <= 16), "A formerly high pattern was not folded into the practical range");

  console.log(`Verified ${rows.length} Key × Type × Family × BOX combinations.`);
  console.log(`Octave-adjusted combinations: ${adjusted.length}`);
  console.log(`Formerly 18+ fret combinations corrected: ${formerlyHigh.length}`);
  console.log(`Highest selected representative fret: ${highest}`);
  console.log(`Structural 16-fret exceptions (cannot shift lower without negative frets): ${structuralExtended.length}`);
  console.log(`Open-position representatives used only when preferable: ${openPosition.length}`);
  console.log("C major pentatonic display order:");
  cMajorPentatonic.forEach((row) => {
    console.log(`  BOX${row.box}: ${row.minFret}-${row.maxFret} (source pattern ${row.sourceBox})`);
  });
} finally {
  await server.close();
}
