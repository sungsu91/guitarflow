const PITCH_CLASSES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const OPEN_MIDI = { 6: 40, 5: 45, 4: 50, 3: 55, 2: 59, 1: 64 };

export function rootScaleOctaves(value) {
  return value === "root-1" ? 1 : value === "root-2" ? 2 : 0;
}

// Repeat a three-string octave shape, deriving frets from the actual tuning.
// This also applies the G-to-B correction without a separate UI rule.
export function buildRootScalePositions(root, intervals, octaves = 1) {
  const rootIndex = PITCH_CLASSES.indexOf(root);
  if (rootIndex < 0 || ![1, 2].includes(octaves) || ![5, 7].includes(intervals.length)) {
    throw new RangeError("Unsupported root scale");
  }
  const stringSteps = intervals.length === 7
    ? [0, 0, 1, 1, 1, 2, 2, 2]
    : [0, 0, 1, 1, 2, 2];
  for (const startString of [6, 5]) {
    const rootFret = (rootIndex - OPEN_MIDI[startString] % 12 + 12) % 12;
    const rootMidi = OPEN_MIDI[startString] + rootFret;
    const positions = [];
    for (let octave = 0; octave < octaves; octave += 1) {
      [...intervals, 12].forEach((interval, degree) => {
        if (octave > 0 && degree === 0) return;
        const stringNumber = startString - octave * 2 - stringSteps[degree];
        const midi = rootMidi + octave * 12 + interval;
        positions.push({
          stringNumber,
          fretNumber: midi - OPEN_MIDI[stringNumber],
          pitch: `${PITCH_CLASSES[midi % 12]}${Math.floor(midi / 12) - 1}`,
        });
      });
    }
    // Use the fifth-string root when the low sixth-string shape crosses the nut.
    if (positions.every(({ fretNumber }) => fretNumber >= 0 && fretNumber <= 18)) return positions;
  }
  throw new RangeError("No playable root scale position");
}
