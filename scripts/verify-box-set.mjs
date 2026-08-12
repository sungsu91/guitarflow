import { createServer } from "vite";

const ROOTS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const TYPES = ["major", "minor"];
const FAMILIES = ["pentatonic", "scale"];
const NOTE_INDEX = Object.fromEntries(ROOTS.map((note, index) => [note, index]));
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
  const { buildScaleBoxSetPractice } = await server.ssrLoadModule("/src/App.jsx");
  const summaries = [];

  for (const root of ROOTS) {
    for (const type of TYPES) {
      for (const family of FAMILIES) {
        const ascending = buildScaleBoxSetPractice(root, type, family, "ascending");
        const descending = buildScaleBoxSetPractice(root, type, family, "descending");
        const ascendingPositions = ascending.sequence.map((step) => `s${step.stringNumber}-f${step.fretNumber}`);
        const descendingPositions = descending.sequence.map((step) => `s${step.stringNumber}-f${step.fretNumber}`);

        assert(
          JSON.stringify(descendingPositions) === JSON.stringify([...ascendingPositions].reverse()),
          `${root} ${type} ${family} BOX SET: descending path is not the exact reverse of ascending`,
        );

        for (const [direction, practice] of [["ascending", ascending], ["descending", descending]]) {
          const context = `${root} ${type} ${family} BOX SET ${direction}`;
          const frets = practice.notes.map((note) => Number(note.fretNumber));
          const coveredBoxes = new Set(practice.sequence.flatMap((step) => step.boxMemberships ?? []));
          const positionKeys = practice.sequence.map((step) => `s${step.stringNumber}-f${step.fretNumber}`);

          assert(practice.boxSet === true, `${context}: BOX SET flag missing`);
          assert(practice.phrasePath.direction === direction, `${context}: direction metadata mismatch`);
          assert(practice.notes.length >= 8, `${context}: phrase path is too short`);
          assert(practice.notes.length < practice.phrasePath.availablePositionCount, `${context}: all BOX notes were displayed`);
          assert(practice.sequence.length === practice.notes.length, `${context}: phrase contains repeated or missing positions`);
          assert(new Set(positionKeys).size === positionKeys.length, `${context}: string+fret position repeated`);
          assert(Math.min(...frets) >= 0, `${context}: negative fret used`);
          assert(Math.max(...frets) <= 15, `${context}: phrase path exceeds the practical 15-fret range`);
          assert(practice.sequence[0].stringNumber === (direction === "ascending" ? 6 : 1), `${context}: path begins on the wrong outer string`);
          assert(practice.sequence.at(-1).stringNumber === (direction === "ascending" ? 1 : 6), `${context}: path finishes on the wrong outer string`);
          assert([1, 2, 3, 4, 5].every((box) => coveredBoxes.has(box)), `${context}: BOX1-5 coverage is incomplete`);
          assert(practice.phrasePath.movementTypes.includes("same-string"), `${context}: same-string movement metadata missing`);
          assert(practice.phrasePath.movementTypes.includes("adjacent-box"), `${context}: adjacent-box movement metadata missing`);
          assert(practice.phrasePath.movementTypes.includes("full-span"), `${context}: full-span movement metadata missing`);

          let maxFretJump = 0;
          let maxPitchStep = 0;
          let diagonalMoves = 0;
          let sameStringMoves = 0;
          for (let index = 1; index < practice.sequence.length; index += 1) {
            const previous = practice.sequence[index - 1];
            const current = practice.sequence[index];
            const previousMidi = pitchToMidi(previous.pitch);
            const currentMidi = pitchToMidi(current.pitch);
            const stringMove = direction === "ascending"
              ? previous.stringNumber - current.stringNumber
              : current.stringNumber - previous.stringNumber;
            const fretMove = current.fretNumber - previous.fretNumber;
            const pitchStep = Math.abs(currentMidi - previousMidi);
            maxFretJump = Math.max(maxFretJump, Math.abs(fretMove));
            maxPitchStep = Math.max(maxPitchStep, pitchStep);
            if (stringMove > 0 && fretMove !== 0) diagonalMoves += 1;
            if (stringMove === 0) sameStringMoves += 1;
            assert(
              direction === "ascending" ? currentMidi > previousMidi : currentMidi < previousMidi,
              `${context}: absolute pitch reversed at step ${index + 1}`,
            );
            assert(stringMove === 0 || stringMove === 1, `${context}: string path skipped or reversed at step ${index + 1}`);
            assert(Math.abs(fretMove) <= 7, `${context}: unplayable ${Math.abs(fretMove)}-fret jump at step ${index + 1}`);
          }
          assert(diagonalMoves > 0, `${context}: no diagonal position transition found`);
          assert(sameStringMoves > 0, `${context}: no same-string BOX movement found`);

          const allowedIntervals = SCALE_INTERVALS[family][type];
          let rootCount = 0;
          for (const note of practice.notes) {
            const expectedMidi = pitchToMidi(STANDARD_TUNING[note.stringNumber]) + Number(note.fretNumber);
            assert(pitchToMidi(note.pitch) === expectedMidi, `${context}: incorrect pitch at string ${note.stringNumber}, fret ${note.fretNumber}`);
            const interval = (NOTE_INDEX[getPitchClass(note.pitch)] - NOTE_INDEX[root] + 12) % 12;
            assert(allowedIntervals.includes(interval), `${context}: ${note.pitch} is outside the selected scale`);
            if (interval === 0) rootCount += 1;
          }
          assert(rootCount > 0, `${context}: phrase path contains no root note`);
          assert(practice.visibleFrets[0] === Math.min(...frets), `${context}: visible range starts incorrectly`);
          assert(practice.visibleFrets.at(-1) === Math.max(...frets), `${context}: visible range ends incorrectly`);

          summaries.push({
            context,
            diagonalMoves,
            maxFret: Math.max(...frets),
            maxFretJump,
            maxPitchStep,
            minFret: Math.min(...frets),
            notes: practice.notes.length,
            steps: practice.sequence.length,
          });
        }
      }
    }
  }

  console.log(`Verified ${summaries.length} Key × Type × Family × Direction BOX SET phrase paths.`);
  console.log(`Highest BOX SET fret: ${Math.max(...summaries.map((summary) => summary.maxFret))}`);
  console.log(`Largest adjacent fret movement: ${Math.max(...summaries.map((summary) => summary.maxFretJump))}`);
  console.log(`Largest adjacent absolute pitch movement: ${Math.max(...summaries.map((summary) => summary.maxPitchStep))} semitones`);
  console.log(`Shortest/longest phrase: ${Math.min(...summaries.map((summary) => summary.steps))}/${Math.max(...summaries.map((summary) => summary.steps))} steps`);
  console.log(`Fewest diagonal transitions: ${Math.min(...summaries.map((summary) => summary.diagonalMoves))}`);
} finally {
  await server.close();
}
