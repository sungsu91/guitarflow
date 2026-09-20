import { frequencyToChromaticPitch, midiToFrequency } from "./tunerMath.js";

export const TUNER_PRESET_DEFINITIONS = Object.freeze({
  violin: Object.freeze([
    Object.freeze({ id: "standard", label: "STANDARD", description: "바이올린 기본 튜닝", midis: [55, 62, 69, 76] }),
  ]),
  bass: Object.freeze([
    Object.freeze({ id: "standard", label: "4현 스탠다드", description: "4현 기본 튜닝", midis: [28, 33, 38, 43] }),
    Object.freeze({ id: "standard-5", label: "5현 스탠다드", description: "5현 기본 튜닝", midis: [23, 28, 33, 38, 43] }),
    Object.freeze({ id: "standard-6", label: "6현 스탠다드", description: "6현 기본 튜닝", midis: [23, 28, 33, 38, 43, 48] }),
    Object.freeze({ id: "drop-d", label: "4현 DROP D", description: "4현 · 4번 줄만 D로", midis: [26, 33, 38, 43] }),
  ]),
  guitar: Object.freeze([
    Object.freeze({ id: "standard", label: "STANDARD", description: "기본 튜닝", midis: [40, 45, 50, 55, 59, 64] }),
    Object.freeze({ id: "drop-d", label: "DROP D", description: "6번 줄만 D로", midis: [38, 45, 50, 55, 59, 64] }),
    Object.freeze({
      id: "half-step",
      label: "½ STEP DOWN",
      description: "모든 줄 반음 낮게",
      midis: [39, 44, 49, 54, 58, 63],
      noteNames: ["Eb", "Ab", "Db", "Gb", "Bb", "Eb"],
    }),
  ]),
  ukulele: Object.freeze([
    Object.freeze({ id: "high-g", label: "HIGH-G", description: "높은 4번 줄 G", midis: [67, 60, 64, 69] }),
    Object.freeze({ id: "low-g", label: "LOW-G", description: "낮은 4번 줄 G", midis: [55, 60, 64, 69] }),
  ]),
});

export function createTuningPreset(instrumentId, definition) {
  const midis = definition.midis;
  const strings = midis.map((midi, index) => {
    const chromaticPitch = frequencyToChromaticPitch(midiToFrequency(midi));
    const noteName = definition.noteNames?.[index] ?? chromaticPitch.noteName;
    return {
      ...chromaticPitch,
      frequency: midiToFrequency(midi),
      noteName,
      pitch: `${noteName}${chromaticPitch.octave}`,
      stringNumber: midis.length - index,
    };
  });
  return {
    description: definition.description,
    id: definition.id,
    instrumentId,
    label: definition.label,
    noteSummary: strings.map((string) => string.pitch).join(" "),
    strings,
  };
}

export function createTunerPresets(instrumentId) {
  const definitions = TUNER_PRESET_DEFINITIONS[instrumentId]
    ?? TUNER_PRESET_DEFINITIONS.guitar;
  return Object.freeze(definitions.map((definition) => createTuningPreset(instrumentId, definition)));
}

export function getTunerStringTarget(strings, stringNumber) {
  if (!Number.isInteger(stringNumber)) return null;
  return strings?.find((string) => string.stringNumber === stringNumber) ?? null;
}
