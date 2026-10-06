# Score quality laboratory

This is a development check. Users import their scores normally; they do not install or run this system. Neither the application nor this harness uploads scores to a third party.

## One command

```powershell
npm run verify:score-quality
# Larger fixed regression corpus and more fonts / random model cases:
npm run verify:score-quality -- --full
# Reproduce the same music and image conditions:
npm run verify:score-quality -- --seed 20261006
```

The runner starts its own local Vite server on a free port and closes it afterwards. It does not use or stop the user's development server. Results are written to a fresh directory under `artifacts/quality-lab`; `latest.json` points to the last run. It does not replace the approved OCR baseline automatically.

`npm run build` automatically runs the lightweight `verify:score-core` checks (250 fixed-seed randomized scenarios, the quality-gate tests, and playback/count-in checks) before bundling. The larger browser/PDF/photo run stays explicit because it takes minutes and needs additional development tools. Build success alone does not certify OCR accuracy.

Requirements: `npm install`, Python with ReportLab/Pillow, Poppler (`pdftoppm`) on PATH, and Playwright with Chromium/Chrome. It can use the existing Codex bundled runtimes. Else set `QUALITY_PYTHON`, `PLAYWRIGHT_MODULE`, and optionally `QUALITY_BROWSER` to local paths. Missing tools cause an explicit failure, never a passing empty run. No browser or Python package is downloaded silently during a check.

## Checks

1. **Property testing:** fast-check (MIT, development dependency) creates 500 mixed rhythm scenarios in a quick run, 2,000 in a full run. Each varies local meter, 4/5/6 strings, frets 0–24, simultaneous notes, rests, dotted values, triplets, sextuplets and BPM. An independent quarter-beat oracle checks editing, storage and playback timing. Failures are shrunk and the seed/path/counterexample saved in `failures/score-property.json`.
2. **Fixed OCR regression:** three digital PDFs in quick mode, all 36 fixed PDFs in full mode. Each case and duration is compared separately to the approved floor. Stored failure locations also reject a newly lost note/rhythm position even if gains elsewhere leave the totals unchanged. Missing rows, corrupt/missing counters, added notes and conversion losses cannot be concealed by an improved average.
3. **Photo failure regression:** recreate the saved photo seed in `photo-baseline.json` and reject any loss against its measured floor. Known failures remain visible. If exploration uses the same seed, its results are reused rather than performing an identical second run.
4. **New-photo exploration:** the seed changes fret content and mixed-duration order. Each font gets one new PDF and five four-photo JPEG batches: clean, rotated, shaded, compressed, and combined shade/rotation/blur/compression. The images pass through the actual `preparePhoto` and `importPhotoBatch` path. The oracle stays outside the browser. A rectified photo is matched inside the corresponding detected barlines so camera coordinate changes are not mistaken for missing notes; no fret value participates in positional matching.

Quick mode explores one font (6 cases, 20 JPEGs); full mode uses three (18 cases, 60 JPEGs), in addition to the saved photo regression set. These are synthetic camera conditions, not an actual iPhone/device or hand-held paper test. Curved paper, perspective, occluded notes and HEIC remain separate future tests. Do not infer real-world accuracy from these exercises.

## Status and failure rules

- `failed`: the model/fixed regression failed, a dependency is missing, or the runner failed (exit 1).
- `needs-investigation`: an exploration import failed, bars went missing/extra, or conversion did not compile (exit 2).
- `passed-regression-with-open-ocr-errors`: existing reference preserved, but exploration still has note/rhythm/tie failures. This is **not** perfect recognition (exit 0).
- `passed`: all measured checks, including the explored cases, matched.

Every OCR case retains the input PDF/JPEGs, oracle manifest, raw analysis, converted score, bar/fret/string/rhythm/tie failures and elapsed time. Keep a failing seed when changing the recognizer; promote a benchmark floor only after reviewing its real measurements, never just to make the command green.

Note failures also retain a stage trace: missing measure, missing rhythm position, rejected candidate (with its reading/reason/confidence), no candidate assigned to the string, wrong fret/string, or a position classified as a rest. An absent candidate is not proof of a particular cropping/segmentation fault; inspect the retained pixels and raw analysis before changing that stage.

Run a fast-check failure directly in PowerShell by setting `$env:SCORE_CHECK_SEED` and `$env:SCORE_CHECK_PATH` to the recorded values, then `node --test tests/score-properties.test.mjs`. Clear those overrides afterwards. `SCORE_CHECK_RUNS` selects the number of scenarios (up to 10,000).

## Sources

- [fast-check documentation](https://fast-check.dev/docs/introduction/): input generation, shrinking and reproducible seeds.
- [Tesseract image-quality guidance](https://tesseract-ocr.github.io/tessdoc/ImproveQuality.html): illumination, skew, stroke width and image borders are distinct failure conditions. These motivate the image tests, not automatic changes to every imported image.
- Generated music/fixtures are original CC0 exercises. No user score is included.
