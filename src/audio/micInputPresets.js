export const MIC_INPUT_PRESETS = Object.freeze({
  GUITAR_RECORDING: "GUITAR_RECORDING",
  GUITAR_DETECTION: "GUITAR_DETECTION",
});

const PRESET_CONFIGS = Object.freeze({
  [MIC_INPUT_PRESETS.GUITAR_RECORDING]: Object.freeze({
    analyserFftSize: 2048,
    analyserSmoothing: 0.34,
    armDelayMs: 400,
    compressor: Object.freeze({
      attack: 0.009,
      knee: 18,
      ratio: 2.5,
      release: 0.18,
      threshold: -16,
    }),
    gainDb: 3,
    highpassFrequency: 70,
    highpassQ: 0.7,
    limiter: Object.freeze({
      attack: 0.002,
      knee: 0,
      ratio: 20,
      release: 0.08,
      threshold: -1,
    }),
    mediaRecorderBitsPerSecond: 160_000,
    meterIntervalMs: 60,
  }),
  [MIC_INPUT_PRESETS.GUITAR_DETECTION]: Object.freeze({
    analyserFftSize: 2048,
    analyserSmoothing: 0,
    calibrationMs: 700,
    detectionGainDb: 1,
    highpassFrequency: 62,
    highpassQ: 0.58,
    minimumSignalRms: 0.0038,
    noiseMarginDb: 9,
  }),
});

export function getMicInputPreset(presetName) {
  return PRESET_CONFIGS[presetName] ?? PRESET_CONFIGS[MIC_INPUT_PRESETS.GUITAR_DETECTION];
}

