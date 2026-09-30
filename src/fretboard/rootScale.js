const PITCH_CLASSES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const OPEN_MIDI = { 6: 40, 5: 45, 4: 50, 3: 55, 2: 59, 1: 64 };

export function rootScaleOctaves(value) {
  return value === "root-1" ? 1 : value === "root-2" ? 2 : 0;
}

// Repeat a three-string octave shape, deriving frets from the actual tuning.
// This also applies the G-to-B correction without a separate UI rule.
export function buildRootScaleRoute(root, intervals) {
  const rootIndex = PITCH_CLASSES.indexOf(root);
  if (rootIndex < 0 || ![5, 7].includes(intervals.length)) {
    throw new RangeError("Unsupported root scale");
  }
  const stringSteps = intervals.length === 7
    ? [0, 0, 1, 1, 1, 2, 2, 2]
    : [0, 0, 1, 1, 2, 2];
  const paths = [];
  for (const startString of [6, 5]) {
    for (const shift of [0, 12]) {
      const rootFret = (rootIndex - OPEN_MIDI[startString] % 12 + 12) % 12 + shift;
      const rootMidi = OPEN_MIDI[startString] + rootFret;
      const segments = [];
      for (let octave = 0; octave < 2; octave += 1) {
        const positions = [...intervals, 12].map((interval, degree) => {
          const stringNumber = startString - octave * 2 - stringSteps[degree];
          const midi = rootMidi + octave * 12 + interval;
          return {
            stringNumber,
            fretNumber: midi - OPEN_MIDI[stringNumber],
            pitch: `${PITCH_CLASSES[midi % 12]}${Math.floor(midi / 12) - 1}`,
          };
        });
        segments.push(positions);
      }
      if (segments.flat().every(({ fretNumber }) => fretNumber >= 0 && fretNumber <= 18)) {
        paths.push({ rootFret, startString, segments });
        break;
      }
    }
  }
  if (paths.length !== 2) throw new RangeError("No playable root scale route");
  return paths.sort((a, b) => a.rootFret - b.rootFret || b.startString - a.startString)
    .flatMap(path => path.segments);
}

export function buildRootScalePositions(root, intervals, octaves = 1) {
  if (![1, 2].includes(octaves)) throw new RangeError("Unsupported octave count");
  return buildRootScaleRoute(root, intervals).slice(0, octaves)
    .flatMap((notes, index) => index ? notes.slice(1) : notes);
}
