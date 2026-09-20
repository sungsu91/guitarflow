# Shooter progression settings and debug alignment

This follow-up explicitly changes pacing and adds a difficulty, as requested after the visual patch. It supersedes the earlier prohibition on changing fall speed/spawn cadence for these changes only. Work stays on `feat/shooter-note-vfx`; no merge or deployment.

## Behavior

- All six difficulties use the previous easy-random fall duration at 1× (approximately 10,692 ms for the full authored path). Original note courses and existing random pools remain intact.
- After resolving a target, the next-target recovery is 650 ms for easy, 450 ms for normal, and 280 ms for difficult, in both course and random modes. This replaces the 1,000 ms minimum and removes leftover authored spawn-time waits after a hit. Section introductions/countdowns remain intact.
- Fall speeds: 0.75×, 1×, 1.25×, 1.5×. Only fall duration is divided by this value. Spawn intervals, recovery, target-count limits, microphone analysis, projectile timing, combo/scoring, count-in voices and audio BPM are not sped up. Settings are session-local and locked during play/pause.
- Hard random: 78 guitar positions, six strings × frets 0–12, E2–E5 including chromatic pitches. Uses the existing random picker and position hints.
- The difficulty header opens a compact centered panel: six difficulty buttons in two rows, four fall-speed buttons and Done. Mobile/desktop sizing remains separate, and landscape has its own entry button. Dialog supports Escape, focus return/trapping, scroll locking and touch-sized buttons.
- Portrait debug hurtbox now lives inside the target's DOM wrapper and inherits the exact same per-frame transform. Its radii come from the unchanged collision geometry. This removes React/throttled-overlay lag without altering actual hit testing. Existing perspective/horizontal debug overlays are retained.

## Verification

- 212 shooter tests pass, including new pool, shared-fall-speed and difficulty-cadence checks.
- Baseline source comparisons still protect microphone judgment/projectile scoring and hurtbox/projectile geometry. The earlier whole-game-function snapshot was narrowed because pacing changes are now explicitly authorized.
- Browser tested all six difficulties at 1×; every target duration is 10692.14010390481 ms. Hard random at 1.5× is 7128.093402603207 ms.
- Observed wall-clock hit-to-next-target gaps in this emulator: easy 785 ms, easy random 775 ms, normal 589.5 ms, normal random 591.9 ms, difficult 395 ms, difficult random 471.4 ms. These include browser/frame scheduling and differ from configured game-clock delays. Hard random at 1.5×: 362.2 ms.
- Moving debug marker vs. visible ring centers sampled over 12 frames per mode: largest difference under 0.008 px. No browser errors.
- Settings panel checked at 320×844, 390×844 and 1366×768: buttons do not clip/overflow; keyboard focus trap, Escape and focus return pass. Screenshots inspected.
- Production build passes with the existing bundle-size warning. Actual guitar/microphone and physical-device performance are not covered by browser emulation.

Reproduce with `node --test tests/shooter-*.test.mjs`, `node scripts/verify-shooter-progression.mjs`, `node scripts/verify-shooter-progress-panel.mjs`, and `npm run build`. Browser scripts use the local development server on port 5177. Results and screenshots are in ignored `artifacts/shooter-progress/`.

## Follow-up: simultaneous note stream and independent fall speed

The original single-live-target cap prevented the intended flow. It is now 2 easy / 3 normal / 4 difficult, including random variants. At baseline 1× the stream interval is 50% / 36% / 27% of the shared travel duration. No hit is needed to spawn the next note. Scenario section introductions still wait for the previous section to clear.

The interval always uses the **unscaled** baseline duration; choosing a fall-speed multiplier never changes the authored stream interval or cap. The progress of the first note at the next spawn therefore varies with the selected fall speed, as expected. Empty-screen recovery remains 650 / 450 / 280 ms regardless of speed. Hits and misses no longer reset the spawn clock while another note is alive.

The compact panel removes descriptive cards and long explanations. 320×844, 390×844 and 1366×768 overflow and keyboard checks pass. The latest unit suite has 213 passing tests. `verify-shooter-stream.mjs` waits without firing to verify simultaneous targets, then shoots and checks that another target survives and continues descending with a single score/combo increment. `verify-shooter-progression.mjs` documents the earlier single-target pacing measurements above; use the stream test for the current simultaneous-target behavior.

The live stream test passed all six modes: easy/course and random each reached 2 live notes, normal/course and random each reached 3, difficult/course and random each reached 4 without any input. In each case a single test shot scored 100 / combo 1 while another note survived and continued moving. Results are in `artifacts/shooter-progress/stream-results.json`.
