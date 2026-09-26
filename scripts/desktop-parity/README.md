# Local parity and quality checks

These scripts use isolated Playwright Edge profiles. They never use the user's
browser data, deploy, or send messages. Test inputs and evidence live under the
Git-ignored `work/desktop-parity/` directory.

The current machine provides Playwright through the bundled Codex runtime path
in `helpers.mjs`. Use a compatible Playwright module and installed Chromium/Edge
when running on another machine.

Start a local production preview, set `PARITY_URL` to its URL, then run the
individual scripts with Node:

- `basic.mjs`: fretboard and training controls
- `tools.mjs`: metronome, groove packs, tuner, mini backing
- `editors.mjs`: rhythm, chord progression, score, audio save/load flows
- `remaining.mjs`: PDF backup, shooter and fake camera lifecycle
- `common.mjs`: language/theme, help/share adapter, hidden portals, storage errors
- `details.mjs`: guide meters, PDF output, five score instruments, short viewport
- `navigation.mjs`: all visible mode navigation buttons
- `matrix.mjs`: nine viewports, two languages, two themes, eleven modes
- `final-screens.mjs`: final captures and guide geometry/theme regression checks

`matrix.mjs` supports `PARITY_ROUTES` (comma separated) and `PARITY_MATRIX_FILE`
for targeted rechecks. Do not rebuild the directory being served during a test:
changing content hashes invalidates lazy imports in existing pages.

The saved fixtures from this run are a generated 220 Hz WAV and a synthetic
24-page PDF, never personal recordings/scores. `editors-explore.mjs` contains the
WAV generator. PDF checks currently reference the existing synthetic fixture
`tmp/pdfs/pdf-practice-24pages.pdf`. Restore or replace these disposable fixtures
before rerunning on a fresh checkout.

`shared-backing.mjs` uses development module/HMR imports; set `BACKING_TEST_URL`
to the dev server and `BACKING_TEST_WIDTHS=390,1440`. Its saved-source adaptation
accounts for the practice screen now being retained across mode navigation.

`security-perf.mjs` compares this audit's fixed local ports (5186 dev, 5189 eager
preview, 5190 lazy preview). Adjust them for another run. Its invalid JSON requests
test the source-write guards without writing files. Performance timings include
a fixed 500 ms wait and are local diagnostics, not deployment benchmarks.

The `*-explore.mjs` files are inspection helpers, not pass/fail acceptance suites.
Final evidence and limitations are indexed in
`docs/desktop-parity-quality-audit-2026-09-26.md`.
