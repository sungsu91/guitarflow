import ko from "../i18n/locales/ko.js";
import { frequencyToChromaticPitch, midiToFrequency } from "./tunerMath.js";

export const TUNER_PRESET_DEFINITIONS = Object.freeze({
  violin: Object.freeze([
    Object.freeze({ id: "standard", label: "STANDARD", description: ko["tuner.standardViolinTuning"], midis: [55, 62, 69, 76] }),
  ]),
  bass: Object.freeze([
    Object.freeze({ id: "standard", label: ko["tuner.4StringStandard"], description: ko["tuner.standard4StringTuning"], midis: [28, 33, 38, 43] }),
    Object.freeze({ id: "standard-5", label: ko["tuner.5StringStandard"], description: ko["tuner.standard5StringTuning"], midis: [23, 28, 33, 38, 43] }),
    Object.freeze({ id: "standard-6", label: ko["tuner.6StringStandard"], description: ko["tuner.standard6StringTuning"], midis: [23, 28, 33, 38, 43, 48] }),
    Object.freeze({ id: "drop-d", label: ko["tuner.4StringDropD"], description: ko["tuner.4StringsLowerString4ToD"], midis: [26, 33, 38, 43] }),
  ]),
  guitar: Object.freeze([
    Object.freeze({ id: "standard", label: "STANDARD", description: ko["tuner.standardTuning"], midis: [40, 45, 50, 55, 59, 64] }),
    Object.freeze({ id: "drop-d", label: "DROP D", description: ko["tuner.lowerString6ToD"], midis: [38, 45, 50, 55, 59, 64] }),
    Object.freeze({
      id: "half-step",
      label: "½ STEP DOWN",
      description: ko["tuner.allStringsDownASemitone"],
      midis: [39, 44, 49, 54, 58, 63],
      noteNames: ["Eb", "Ab", "Db", "Gb", "Bb", "Eb"],
    }),
  ]),
  ukulele: Object.freeze([
    Object.freeze({ id: "high-g", label: "HIGH-G", description: ko["tuner.highGOnString4"], midis: [67, 60, 64, 69] }),
    Object.freeze({ id: "low-g", label: "LOW-G", description: ko["tuner.lowGOnString4"], midis: [55, 60, 64, 69] }),
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
