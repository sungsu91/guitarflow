# Groove sample balance — 2026-09-21

Scope: playback trims shared by groove previews and transport. Original WAV files,
row volumes, saved patterns, velocities, timing and the global audio bus are unchanged.

## Measurement

Decoded all 20 stored WAV samples through Web Audio at 44.1 kHz. Measured the portion
used by the scheduler (ride up to 1.8 s, open hat 0.35 s, others up to 1 s):
peak, RMS, maximum 20 ms RMS, time containing 95% of energy, and Hann-windowed
2048-point FFT energy (1024-sample hop), separately per channel.
Bands: below 200 Hz, 200–2000 Hz, 2–6 kHz, above 6 kHz.
These are signal measurements, not a listening test or standardized LUFS scores.

| Sample | Max 20 ms RMS, dBFS | Energy above 6 kHz | 95% energy, ms | Old → final trim |
|---|---:|---:|---:|---:|
| Kick | -8.3 | 0% | 111 | 1.4 → 1.4 |
| Snare | -4.9 | 0.8% | 33 | 0.7 → 1.05 |
| Closed hat | -12.1 | 68.6% | 35 | 1 → 0.55 |
| Open hat | -11.3 | 74.2% | 165 | 0.85 → 0.55 |
| Ride | -16.3 | 64.7% | 886 | 1.3 → 0.95 |
| Shaker | -13.4 | 98.9% | 123 | 0.8 → 0.6 |
| Tambourine | -14.3 | 77.5% | 127 | 0.85 → 0.55 |
| Cabasa | -24.5 | 5.4% | 178 | 1.6 → 1.6 |
| Clap | -17.4 | 4.7% | 30 | 0.85 → 0.95 |
| Clave | -5.7 | 1.5% | 30 | 0.7 → 0.45 |

Snare increases by 3.52 dB and closed hat decreases by 5.19 dB relative to the
previous production mix. At equal row volume and velocity, kick and snare
20 ms attack levels are within about 1 dB. Repeating cymbals/percussion sit behind
the backbeat; ghost-note proportions remain intact. Cabasa's weak source is not
attenuated merely because it is a supporting instrument. Ride retains sufficient
level for the authored jazz patterns. No peak normalization of original assets.

Rendered all 12 recommended grooves for two bars at their authored tempo, with
master groove volume at 1, before the existing output bus/limiter. No clipping.

Reproduce sample analysis: run `scripts/analyze-groove-samples.mjs` with dev server
at port 5177 and `PLAYWRIGHT_MODULE` pointing to the available Playwright module.
The script writes detailed data to `artifacts/groove-sample-analysis.json`.

## Backbeat follow-up

Final role-based trims: snare 1.25, closed hat 0.4, open hat 0.45. This raises
snare another 1.51 dB, lowers closed hat 2.77 dB and open hat 1.74 dB relative
to the measured first pass above. Kick and ride retain their first-pass trims.
No conditional ducking: the same played note has the same level regardless of
other rows. Jazz ride leads via the authored arrangement, and ghost snare
velocities remain deliberately lower. Existing row volume controls still apply.
