import assert from "node:assert/strict";
import test from "node:test";
import {
  centsBetween,
  detectPitchYinDetailed,
  frequencyToChromaticPitch,
  getRms,
  midiToFrequency,
} from "../src/tuner/tunerMath.js";
import {
  createShooterPitchJudgmentState,
  observeShooterPitchFrame,
} from "../src/shooter/pitchJudgment.js";

const STRINGS = [["E2", 40], ["A2", 45], ["D3", 50], ["G3", 55], ["B3", 59], ["E4", 64]];

function waveform(frequency, sampleRate, now, amplitude, resonance) {
  return Float32Array.from({ length: 2048 }, (_, index) => {
    const time = now / 1000 + index / sampleRate;
    const phase = 2 * Math.PI * frequency * time;
    return amplitude * Math.exp(-time * 2) * (
      Math.sin(phase) + 0.2 * Math.sin(phase * 2) + 0.1 * Math.sin(phase * 3)
      + resonance * Math.sin(phase / 2 + 0.7)
    );
  });
}

test("open-string waveforms with weak octave resonance retain their octave in tuner and shooter", () => {
  for (const sampleRate of [44100, 48000]) {
    for (const [pitch, midi] of STRINGS) {
      for (const amplitude of [0.012, 0.08, 0.4]) {
        for (const resonance of [0, 0.04, 0.06]) {
          const frequency = midiToFrequency(midi);
          const state = createShooterPitchJudgmentState();
          const target = { id: pitch, pitch, frequency };
          const results = [0, 34, 68].map((now) => {
            const buffer = waveform(frequency, sampleRate, now, amplitude, resonance);
            for (const [min, max, threshold] of [[50, 1200, 0.16], [75, 900, 0.12]]) {
              const result = detectPitchYinDetailed(buffer, sampleRate, min, max, threshold);
              assert.ok(result, `${pitch}: missing pitch at ${sampleRate} Hz`);
              assert.equal(frequencyToChromaticPitch(result.frequency).pitch, pitch,
                `${pitch}: resonance ${resonance}, frame ${now}, range ${min}-${max}`);
              assert.ok(Math.abs(centsBetween(result.frequency, frequency)) < 15);
            }
            const result = detectPitchYinDetailed(buffer, sampleRate, 75, 900, 0.12);
            return observeShooterPitchFrame(state, {
              ...result, now, rms: getRms(buffer), signalPresent: true, target,
            });
          });
          assert.equal(results.filter(({ accepted }) => accepted).length, 1, pitch);
        }
      }
    }
  }
});

test("measurable low-string fundamentals still correct a dominant second harmonic", () => {
  for (const sampleRate of [44100, 48000]) {
    for (const [pitch, midi] of STRINGS.slice(0, 3)) {
      const frequency = midiToFrequency(midi);
      const buffer = Float32Array.from({ length: 2048 }, (_, index) => {
        const phase = 2 * Math.PI * frequency * index / sampleRate;
        return 0.01 * Math.sin(phase) + 0.1 * Math.sin(phase * 2);
      });
      for (const [min, max, threshold] of [[50, 1200, 0.16], [75, 900, 0.12]]) {
        const result = detectPitchYinDetailed(buffer, sampleRate, min, max, threshold);
        assert.equal(frequencyToChromaticPitch(result.frequency).pitch, pitch);
        assert.equal(result.harmonicDivisor, 2);
      }
    }
  }
});
