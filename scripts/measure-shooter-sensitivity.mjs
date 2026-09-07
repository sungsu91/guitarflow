import { writeFile, mkdir } from "node:fs/promises";
import { getMicDetectionThresholds } from "../src/audio/micInputPresets.js";
import { isShooterPitchSignalPresent, readShooterSignalFrame } from "../src/shooter/microphoneSignal.js";
import { createShooterPitchJudgmentState, observeShooterPitchFrame } from "../src/shooter/pitchJudgment.js";
import { detectPitchYinDetailed, getRms, midiToFrequency, frequencyToChromaticPitch, centsBetween } from "../src/tuner/tunerMath.js";

const noiseFloor = 0.0006;
const thresholds = getMicDetectionThresholds(noiseFloor);
const timbres = [[1, 0.35, 0.15], [0.4, 1, 0.25, 0.15]];
const levels = [0.0015, 0.0025, 0.004, 0.008, 0.02, 0.08];
const rows = [];
const baseline = process.argv.includes("--baseline");

function makeFrame(frequency, sampleRate, rms, harmonics, now) {
  const signal = Float32Array.from({ length: 2048 }, (_, i) => {
    const t = i / sampleRate;
    return harmonics.reduce((v, amplitude, index) => v + amplitude * Math.sin(2 * Math.PI * frequency * (index + 1) * (t + now / 1000)), 0)
      * Math.exp(-t / 0.45);
  });
  const scale = rms * Math.exp(-now / 450) / getRms(signal);
  let seed = 1729 + Math.round(frequency);
  return signal.map((value) => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return value * scale + (seed / 4294967296 * 2 - 1) * 0.0004 * Math.sqrt(3);
  });
}

for (const sampleRate of [44100, 48000]) {
  for (let midi = 40; midi <= 81; midi += 1) {
    for (const rms of levels) {
      for (const [timbre, harmonics] of timbres.entries()) {
        const frequency = midiToFrequency(midi);
        const pitch = frequencyToChromaticPitch(frequency).pitch;
        const target = { id: pitch, pitch, frequency };
        const state = createShooterPitchJudgmentState();
        let hitAt = null;
        let rawDetected = false;
        let firstConfidence = null;
        for (const now of [0, 34, 68, 102]) {
          const buffer = makeFrame(frequency, sampleRate, rms, harmonics, now);
          const frameRms = getRms(buffer);
          const raw = detectPitchYinDetailed(buffer, sampleRate, 75, 900, 0.12);
          if (raw && Math.abs(centsBetween(raw.frequency, frequency)) <= 42) rawDetected = true;
          if (now === 0) firstConfidence = raw?.confidence ?? 0;
          const session = { readDetectionFrame: () => ({
            rms: frameRms, noiseFloorRms: noiseFloor, ...thresholds,
            isAttackPresent: frameRms >= thresholds.attackThresholdRms,
            isReleasePresent: frameRms >= thresholds.releaseThresholdRms,
            isCalibrating: false, abruptImpact: false,
          }) };
          const signal = readShooterSignalFrame(session, now, state.signalPresent, frameRms, 0.0038);
          const signalPresent = baseline ? signal.signalPresent : isShooterPitchSignalPresent(signal, raw?.confidence ?? 0);
          const result = observeShooterPitchFrame(state, { ...raw, rms: frameRms, signalPresent, now, target });
          if (result.accepted && hitAt == null) hitAt = now;
        }
        rows.push({ sampleRate, midi, pitch, rms, timbre, rawDetected, firstConfidence, hitAt });
      }
    }
  }
}
const bands = [["E2–E3", 40, 52], ["F3–E4", 53, 64], ["F4–A5", 65, 81]];
const summary = levels.flatMap((rms) => bands.map(([band, low, high]) => {
  const subset = rows.filter((r) => r.rms === rms && r.midi >= low && r.midi <= high);
  const hits = subset.filter((r) => r.hitAt != null);
  return { rms, band, cases: subset.length, rawDetected: subset.filter((r) => r.rawDetected).length,
    hits: hits.length, firstFrameHits: hits.filter((r) => r.hitAt === 0).length,
    meanFirstConfidence: +(subset.reduce((sum, r) => sum + r.firstConfidence, 0) / subset.length).toFixed(4) };
}));
const report = { conditions: { baseline, noiseFloor, noiseRms: 0.0004, thresholds, sampleRates: [44100, 48000], timbres, input: "synthetic mono PCM at detector input; calibrated fixed noise floor; one decaying pluck observed for 102 ms; no phone microphone model" }, summary, rows };
const filename = process.argv[2] ?? "artifacts/shooter-sensitivity.json";
await mkdir("artifacts", { recursive: true });
await writeFile(filename, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ conditions: report.conditions, summary }, null, 2));
