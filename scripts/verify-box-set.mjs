import { createServer } from "vite";

const ROOTS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const TYPES = ["major", "minor"];
const FAMILIES = ["pentatonic", "scale"];
const BOXES = [1, 2, 3, 4, 5];
const ROUTE_BOXES = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5];
const ROUTE_STRINGS = {
  ascending: [6, 5, 5, 4, 4, 3, 3, 2, 2, 1],
  descending: [1, 2, 2, 3, 3, 4, 4, 5, 5, 6],
};
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

function getPositionKey(note) {
  return `s${note.stringNumber}-f${note.fretNumber}`;
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
  const {
    buildScaleBlockPractice,
    buildScaleBoxSetPractice,
  } = await server.ssrLoadModule("/src/App.jsx");
  const summaries = [];

  for (const root of ROOTS) {
    for (const type of TYPES) {
      for (const family of FAMILIES) {
        const boxPractices = BOXES.map((box) => buildScaleBlockPractice(root, type, family, box));
        const positionsByBox = new Map(boxPractices.map((practice) => [
          practice.displayBox,
          new Set(practice.notes.map(getPositionKey)),
        ]));
        const sourcePatternByBox = new Map(boxPractices.map((practice) => [
          practice.displayBox,
          practice.sourceBox,
        ]));
        const unionPositions = new Set(boxPractices.flatMap((practice) => practice.notes.map(getPositionKey)));
        const ascending = buildScaleBoxSetPractice(root, type, family, "ascending");
        const descending = buildScaleBoxSetPractice(root, type, family, "descending");
        const ascendingPositions = ascending.sequence.map(getPositionKey);
        const descendingPositions = descending.sequence.map(getPositionKey);

        assert(ascending.sequence.length === descending.sequence.length, `${root} ${type} ${family}: SET direction lengths differ`);
        assert(ascending.sequence.length === ROUTE_BOXES.length, `${root} ${type} ${family}: SET must use two core notes from each BOX`);
        assert(
          JSON.stringify(descendingPositions) !== JSON.stringify([...ascendingPositions].reverse()),
          `${root} ${type} ${family}: SET ↘ incorrectly reverses SET ↗`,
        );

        for (const [direction, practice] of [["ascending", ascending], ["descending", descending]]) {
          const context = `${root} ${type} ${family} BOX SET ${direction}`;
          const notes = practice.notes;
          const sequence = practice.sequence;
          const positionKeys = sequence.map(getPositionKey);
          const frets = sequence.map((note) => Number(note.fretNumber));
          const expectedStrings = ROUTE_STRINGS[direction];
          const allowedIntervals = SCALE_INTERVALS[family][type];
          const rootIndex = NOTE_INDEX[root];

          assert(practice.boxSet === true, `${context}: BOX SET flag missing`);
          assert(practice.setPath.source === "existing-boxes", `${context}: route source is not existing BOX1-5 data`);
          assert(practice.setPath.direction === direction, `${context}: direction metadata mismatch`);
          assert(practice.setPath.diagonal === (direction === "ascending" ? "up-right" : "down-right"), `${context}: diagonal metadata mismatch`);
          assert(JSON.stringify(practice.setPath.boxOrder) === JSON.stringify(BOXES), `${context}: BOX order metadata mismatch`);
          assert(JSON.stringify(practice.setPath.notesPerBox) === JSON.stringify([2, 2, 2, 2, 2]), `${context}: notes are unevenly distributed across BOXes`);
          assert(!("phrasePath" in practice), `${context}: obsolete Phrase path layer remains`);
          assert(!("pathSequence" in practice), `${context}: obsolete hidden path sequence remains`);
          assert(notes.length === ROUTE_BOXES.length, `${context}: displayed SET route length mismatch`);
          assert(sequence.length === notes.length, `${context}: PLAY has hidden or missing notes`);
          assert(
            JSON.stringify(notes.map(getPositionKey)) === JSON.stringify(sequence.map(getPositionKey)),
            `${context}: PLAY order differs from displayed SET order`,
          );
          assert(new Set(positionKeys).size === positionKeys.length, `${context}: string+fret position repeated`);
          assert(Math.min(...frets) >= 0, `${context}: negative fret used`);
          assert(Math.max(...frets) <= 15, `${context}: route exceeds the practical 15-fret range`);
          assert(JSON.stringify(sequence.map((note) => note.routeBox)) === JSON.stringify(ROUTE_BOXES), `${context}: BOX1→5 order is broken`);
          assert(JSON.stringify(sequence.map((note) => note.stringNumber)) === JSON.stringify(expectedStrings), `${context}: stair-step string route is broken`);
          assert(sequence[0].stringNumber === (direction === "ascending" ? 6 : 1), `${context}: route starts on the wrong outer string`);
          assert(sequence.at(-1).stringNumber === (direction === "ascending" ? 1 : 6), `${context}: route finishes on the wrong outer string`);
          assert(practice.label.endsWith(direction === "ascending" ? "SET ↗" : "SET ↘"), `${context}: direction label mismatch`);

          let maxFretJump = 0;
          for (let index = 0; index < sequence.length; index += 1) {
            const step = sequence[index];
            const note = notes[index];
            const positionKey = getPositionKey(step);
            const expectedBox = ROUTE_BOXES[index];
            const previousBox = ROUTE_BOXES[index - 1];

            assert(step.pathOrder === index + 1, `${context}: PLAY path order mismatch at step ${index + 1}`);
            assert(note.pathOrder === index + 1, `${context}: displayed path order mismatch at step ${index + 1}`);
            assert(step.routeStage === index + 1, `${context}: route stage trace mismatch at step ${index + 1}`);
            assert(step.routeBox === expectedBox, `${context}: route BOX trace mismatch at step ${index + 1}`);
            assert(step.sourceBox === expectedBox, `${context}: source BOX trace mismatch at step ${index + 1}`);
            assert(step.sourcePatternBox === sourcePatternByBox.get(expectedBox), `${context}: source pattern BOX trace mismatch at step ${index + 1}`);
            assert(step.boxMemberships.includes(expectedBox), `${context}: position does not belong to its traced BOX at step ${index + 1}`);
            assert(positionsByBox.get(expectedBox).has(positionKey), `${context}: position was not copied from BOX${expectedBox} at step ${index + 1}`);
            assert(unionPositions.has(positionKey), `${context}: position was synthesized outside BOX1-5 at step ${index + 1}`);
            assert(!("phraseOrder" in step), `${context}: hidden Phrase order remains at step ${index + 1}`);
            assert(!("melodicPattern" in step), `${context}: hidden melodic pattern remains at step ${index + 1}`);

            const expectedMidi = pitchToMidi(STANDARD_TUNING[step.stringNumber]) + Number(step.fretNumber);
            assert(pitchToMidi(step.pitch) === expectedMidi, `${context}: incorrect pitch at string ${step.stringNumber}, fret ${step.fretNumber}`);
            const interval = (NOTE_INDEX[getPitchClass(step.pitch)] - rootIndex + 12) % 12;
            assert(allowedIntervals.includes(interval), `${context}: ${step.pitch} is outside the selected scale`);

            if (index === 0 || expectedBox === previousBox) {
              assert(step.connectionFromBox == null, `${context}: false BOX transition marker at step ${index + 1}`);
            } else {
              const previous = sequence[index - 1];
              const fretJump = Math.abs(step.fretNumber - previous.fretNumber);
              const usesSharedBoundary = step.boxMemberships.includes(previousBox)
                || previous.boxMemberships.includes(expectedBox);
              assert(step.connectionFromBox === previousBox, `${context}: BOX boundary trace mismatch at step ${index + 1}`);
              assert(step.stringNumber === previous.stringNumber, `${context}: BOX${previousBox}→${expectedBox} does not connect on the same string`);
              assert(usesSharedBoundary || fretJump <= 5, `${context}: BOX${previousBox}→${expectedBox} boundary is not shared or nearby`);
            }

            if (index > 0) {
              const fretJump = Math.abs(step.fretNumber - sequence[index - 1].fretNumber);
              maxFretJump = Math.max(maxFretJump, fretJump);
              assert(fretJump <= 7, `${context}: excessive ${fretJump}-fret jump at step ${index + 1}`);
              assert(Math.abs(step.stringNumber - sequence[index - 1].stringNumber) <= 1, `${context}: skipped string at step ${index + 1}`);
            }
          }

          assert(practice.visibleFrets[0] === Math.min(...frets), `${context}: visible range starts incorrectly`);
          assert(practice.visibleFrets.at(-1) === Math.max(...frets), `${context}: visible range ends incorrectly`);
          summaries.push({ context, maxFret: Math.max(...frets), maxFretJump, minFret: Math.min(...frets) });
        }
      }
    }
  }

  console.log(`Verified ${summaries.length} Key × Type × Family × Direction BOX SET routes.`);
  console.log("Verified every SET position against its traced source BOX and BOX1→2→3→4→5 order.");
  console.log("Verified displayed SET notes and PLAY sequence are identical with no Phrase Pattern layer.");
  console.log(`Highest BOX SET fret: ${Math.max(...summaries.map((summary) => summary.maxFret))}`);
  console.log(`Largest adjacent fret movement: ${Math.max(...summaries.map((summary) => summary.maxFretJump))}`);
} finally {
  await server.close();
}
