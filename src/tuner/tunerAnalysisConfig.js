import { getMicInputPreset, MIC_INPUT_PRESETS } from "../audio/micInputPresets.js";
import { TUNER_MIN_FREQUENCY } from "./tunerMath.js";

export function getTunerAnalysisConfig(instrumentId, sampleRate) {
  const normal = getMicInputPreset(MIC_INPUT_PRESETS.GUITAR_DETECTION);
  const minFrequency = instrumentId === "bass" ? 24 : TUNER_MIN_FREQUENCY;
  return {
    minFrequency,
    // YIN compares two periods; include enough samples even below B0.
    fftSize: instrumentId === "bass"
      ? Math.min(32768, 2 ** Math.ceil(Math.log2(2 * sampleRate / minFrequency + 2)))
      : normal.analyserFftSize,
    highpassFrequency: instrumentId === "bass" ? 18 : normal.highpassFrequency,
  };
}
