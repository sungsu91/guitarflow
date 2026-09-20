# Neon note visual patch (development only)

- Branch: `feat/shooter-note-vfx`
- Preserved source/assets baseline: `0e79bf3` (existing uncommitted application changes included; generated output left in place).
- Enable: `http://127.0.0.1:5177/?shooterNoteVfx=1#shooter` on the local Vite server.
- Revert visuals: remove `shooterNoteVfx` or set it to `0`, then reload. No stored preference is changed. Production builds always disable this flag.
- Portrait renderers share the new visual component; existing horizontal renderers retain their own UI and combat presentation.
- No merge, push, or deployment performed.

## Implementation

`src/shooter/noteVfx/` contains the new self-contained SVG/CSS design. It uses live pitch text (including octave and sharp) and seven colored fragments. All stages use the same transparent 100×100 coordinate system. There are no raster assets or baked-in pitch labels. Existing monster assets, styles, guitar, pick and aura are preserved.

420 ms sequence: short impact flash → cracked/expanded ring → six ring fragments plus note symbol → short outward spread with fading pitch → small afterglow. Fragment travel is limited to 18 SVG units; no global flash, smoke or flame is added. Reduced-motion mode uses a fade.

The original engine removes normal defeated targets after its existing 260 ms game-clock hold (some scenario targets use 520 ms). The new render-only burst snapshots the defeated target's transform, size, pitch and contact position, and survives independently for 420 ms. It has no collision identity, gameplay callback or animation-frame loop. Original scoring/combo timing and object removal remain unchanged, even though the reference described updating scores after the visual animation. Preserving working gameplay takes precedence here.

## Comparison

| Requested check | Evidence and scope |
| --- | --- |
| Same pitch judgment | Existing pitch, microphone-sequence, quiet-input and note-on regression suites pass. Game-function source segment equals preserved baseline byte-for-byte after newline normalization. Real instrument/microphone was not available. |
| Same pick origin/timing | Original launch, trajectory, impact and guitar geometry functions unchanged; both browser variants exercised the existing TEST SHOT → judgment → projectile → collision path. |
| Same collision bounds | Both mobile variants retain 120×120 DOM wrappers; debug hurtbox radii remain 14.256 px. Collision code and geometry assets unchanged. |
| Other targets/game continue | Original game loop unchanged; render-only overlap harness continues RAF while eight bursts run, without changing input target objects. The starting easy-random level only spawns one live target at a time, so simultaneous live-target descent still needs a higher-level/manual session. |
| Score/combo once | Five successive browser hits give exactly SCORE 500 / COMBO 5 in both variants. New components contain no scoring calls. |
| Overlapping effects | Eight simultaneous component bursts render, survive target-list removal, and all clean up; 32 RAF callbacks during the roughly 600 ms isolated harness. Five live-game hits also pass. Physical phone performance remains unverified. |
| Wrong pitch cannot destroy | Existing pitch mismatch/false-positive tests pass; new visuals only read `target.defeated` from the unchanged engine. No new attack path is introduced. |
| Switch off restores original | Browser off/on comparison confirms original monster images return with the switch off; existing assets and fallback markup are retained. Unit tests reject the flag outside development. |

## Results and limits

- 209 shooter tests passed, including two new development-gate/gameplay-preservation tests.
- Production build passed (existing large-bundle warnings).
- 390×844 browser screenshots inspected on the current gacha arcade map.
- Live text `E2`, `E3`, `B3`, `D#2`, `A2` checked for clipping; five visual stages inspected.
- Five-hit headless Edge comparison, without screenshots during sampling: median frame interval 90.2 ms for both; p95 118.2 ms original / 125.1 ms neon. This environment is slow even on the baseline; these measurements are not evidence of real-device smoothness and do not clear a rollout performance gate.
- CSS visuals end at 420 ms. On this overloaded browser the DOM cleanup callback can run later (about 510 ms in one capture); all graphic parts are already transparent after 420 ms.
- Physical 390×844 device, live guitar/microphone A/B, and higher-level simultaneous-target gameplay remain required before any final rollout. Feature remains opt-in and development-only.

## Reproduce

Start Vite on port 5177. The QA scripts use the installed bundled Playwright and Edge, following other repository browser checks:

```powershell
node --test tests/shooter-*.test.mjs
node scripts/verify-shooter-note-vfx.mjs
node scripts/verify-shooter-note-vfx-repeated.mjs
node scripts/verify-shooter-note-vfx-overlap.mjs
node scripts/verify-shooter-note-vfx-frames.mjs
npm run build
```

Generated screenshots and measurements are under ignored `artifacts/note-vfx/`. `design-review-only.png` is a QA contact sheet, never a game asset. Production renders use only the individual SVG component and CSS source.

## Follow-up: Korean labels, brighter fireworks, moonlit rooftop

- Connected the original KO/EN formatter to idle notes, destruction labels and the primary target HUD in the opt-in preview. Pitch identity, octave and judgment remain unchanged.
- Brighter white-hot ring/symbol cores with colored halos. Six filled ring shards plus the note symbol, six short rays/star glints and a fading afterglow create a compact firework effect within the same 420 ms duration. A notes use blue; E notes use gold.
- Copied the user's third supplied PNG unchanged to `public/assets/maps/moonlit-rooftop/moonlit-rooftop.png`. New development-only map “달빛 옥상” uses the existing map renderer, without extra animated objects. Top-aligned cover keeps the moon in view.
- Opening a fresh `?shooterNoteVfx=1#shooter` preview selects this background. Existing production map defaults and assets remain intact.
- `verify-shooter-note-vfx-moonlit.mjs`: 390×844 mobile and 1366×768 desktop portrait both pass background loading, Korean idle/destroy labels, KO↔EN toggling where exposed, cleanup and zero browser errors. Screenshots visually inspected.
- Eight simultaneous new bursts: all retained after target-list removal and all cleaned up, 33 RAF callbacks in the isolated harness. Five animation stages inspected. All 209 shooter tests and production build pass after the follow-up.
- Real microphone/device checks and rollout restrictions above still apply. No deployment or merge.

## Follow-up: half-size note bodies and outward fireworks

- Only the SVG body (ring, symbol and label) is scaled to 50% around its original center. Target wrapper dimensions, collision bounds and impact coordinates remain unchanged.
- Eighteen small sparks now travel outward on distinct radial trajectories, with short fading trails, staggered ignition and a slight downward fall. The main seven fragments remain. Spark endpoints stay approximately within the original target wrapper (35–50 SVG units from center, plus 5 units of downward drift).
- Destruction still completes in 420 ms; no per-frame JavaScript or new gameplay callbacks. Reduced-motion keeps the fade and suppresses traveling sparks.
- Five-stage visual review and eight-overlapping-burst cleanup passed (29 RAF callbacks in the isolated harness). Existing 209 shooter tests passed. Browser verification additionally asserts an idle ring diameter of 28% of the SVG wrapper, exactly half the previous 56%.
