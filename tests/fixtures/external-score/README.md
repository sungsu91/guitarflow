`quarter-rest.txt` is a binary contour crop of the quarter rest in bar 2 of
[The Lick E Minor (tabs)](https://commons.wikimedia.org/wiki/File:The_Lick_E_Minor_(tabs).png),
by Dreamy Jazz, cropped by Hyacinth, licensed under
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
The original was reduced to width 2083, thresholded and masked at staff rules.
The derived contour is distributed under the same license. Staff spacing: 61 px.
The expected duration was read visually from the original, not from the importer.

## Repeating the real-source challenge

Run `npm run verify:score-photos`. The command downloads the attributed sources
in `sources.json` into the ignored `artifacts/real-photo-quality` directory,
checks their pinned SHA-256 hashes and renders PDFs with Poppler. It never
uploads a score. It uses an isolated local server and headless browser, then
closes both. Install Poppler or set `PDFTOPPM` if the renderer is not on PATH.
Python/Pillow and the browser use the same runtime as `verify:score-quality`.

The challenge includes unchanged originals, rotation, uneven brightness, blur,
JPEG compression, downsampling, combined degradation and reserved variants.
Blank/corrupt images must fail cleanly. Lifecycle tests simulate main-thread CPU
throttling, cancellation during decoding/OCR and retry in the same page. These
checks do not emulate the whole iPhone or prove Safari performance.

`--include-staff` additionally runs the slower Carcassi staff-notation model.
Add `--camera "path/to/photo.jpg"` for each private photo. An unlabelled photo is
reported as unlabelled, never as 100% accurate. Optional `--camera-audit file.json`
provides independently read sample bars and expected bar counts, keyed by the
photo's SHA-256 hash. Keep private oracles and photos outside tracked fixtures.

Results contain raw recognition, converted documents, failed expected positions,
extra positions, bar counts, worker cleanup, source provenance and the input
manifest. `latest.json` points to the latest timestamped run. The fixed gates
reject losses in the existing audited reference cases; known failures on harder
inputs remain visible as `passed-regression-with-open-ocr-errors`.

The event comparison explicitly aligns inserted/missing columns and reports
every unmatched column. Only manually audited bars contribute to event accuracy.
`summary.confirmed`, an import's success message and the absence of `?` are not
ground truth. In particular, the picking PDF has TAB frets whose rhythm is only
in the accompanying notation: its 27 sampled note positions pass, and 21 rhythmic
positions now pass through conservative staff/TAB alignment. The other 6 remain
unresolved. `baseline.json` preserves each previously correct position, not just
the total. Do not lower these thresholds or invent durations to pass the check.

After changing the shared OCR, also run the existing full corpus:
`npm run verify:score-quality -- --full --seed 20261010` and the bass checks
`node scripts/verify-tab-instruments.mjs`. Newly discovered failures are retained
for the next change; previous correct positions must not be traded for an improved
average. Transform-only checks complement, and do not replace, actual camera photos.
