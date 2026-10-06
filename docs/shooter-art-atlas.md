# Fretiva Art Atlas — independent scene objects

Three original maps, appended after the existing choices on every device:

| ID | Korean | English |
| --- | --- | --- |
| glass-garden | 유리꽃의 정원 | Glass Blossom Garden |
| silk-theatre | 비단의 대극장 | The Silk Grand Theatre |
| gilded-ink | 금빛 수묵산수 | Gilded Ink Mountains |

The nine compositions were created with built-in ImageGen. Desktop originals
are the visual references for independently recomposed phone and tablet art.
The phone artwork is portrait; tablet landmarks sit closer to the center so
they survive portrait and split-view framing. All compositions retain a dark
floor below the player and a quieter center for notes.

- Runtime artwork: `public/assets/maps/art-atlas-v1/` (WebP, about 3.3 MB total).
- Full generation prompts: `assets-source/shooter-art-atlas/prompts.json`.
- Shared map data: `src/shooter/maps/artMapCatalog.js`.
- Separate desktop, phone and tablet views: `src/shooter/maps/ArtMapRenderer.jsx`.
- The painting is a stationary DOM image. It is never uploaded to the animation
  renderer, so neither architecture nor floor can be warped by its shader.
- Each map has a planned moving subject on a separate transparent layer:
  - Silk: two detached embroidered silk streamers with pinned upper ends and
    travelling folds. The free fabric silhouette sways visibly, independently
    on each side. The generated sprite preserves alpha and matches the painting.
  - Glass garden: expanding elliptical ripples and moving reflection glints,
    clipped to the authored water band above the solid stage.
  - Gilded ink: four luminous comet trails orbit the painted golden lunar ring.
    The mountains, scrolls and ring itself are stationary.
- `artMapSceneMotion.js` owns separate placements for desktop, phone and tablet.
  `artMapObjectShader.js` draws these objects; no broad fog, camera drift or
  full-painting deformation is used. Unknown compositions have no object motion.
- New transparent asset: `public/assets/maps/art-atlas-v2/silk-streamer.webp`.
  Created with built-in ImageGen; prompt saved in
  `assets-source/shooter-art-atlas-v2/prompts.json`.
- The scenery has an independent clock, capped at 30 fps and one million shaded
  pixels. It pauses with the game or when hidden. Reduced motion / data saving
  use the still artwork; unavailable WebGL retains the poster and CSS atmosphere.
- Existing selection storage and random selection remain shared. The new maps
  do not change the user's saved map, and are available without developer mode.

Validation:

```
node --test tests/shooter-art-maps.test.mjs tests/mobile-map-deployment.test.mjs tests/tablet-shooter-map-availability.test.mjs tests/shooter-map-skins.test.mjs tests/ambient-video-playback.test.mjs
npm run build
node scripts/verify-art-maps.mjs
node --test tests/art-map-motion.test.mjs
node scripts/verify-shooter-motion-presence.mjs
```

The browser audit requires Playwright and Chrome. `ART_MAP_TEST_URL` selects a
development, preview or production server; `ART_MAP_TEST_OUTPUT` selects the
report folder. It covers desktop, two phones, portrait/landscape tablets and
tablet split view, including picker order, image decoding, framing, persistence,
reduced motion and runtime errors.

The motion/presence audit uses `SHOOTER_TEST_URL` and `SHOOTER_TEST_OUTPUT`.
It captures actual GPU frames and requires **zero changed pixels outside the
object bounds**, zero floor/central-space changes and visible object effects.
Silk must also change its alpha silhouette; a brightness-only change cannot pass.
It also checks each device's bass size, picker close/pause behavior and reduced
motion. The emitted `*-motion-only.png` files show every moving object pixel.
