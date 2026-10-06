# Restored silk streamers

The silk theatre includes the two earlier hanging silk streamers again, alongside
the existing painting effects. `silkStreamers.js` preserves their original phone,
tablet and desktop placements and pinned-top animation.

`public/assets/maps/silk-streamers/silk-streamer.webp` is the original transparent
ImageGen sprite, restored byte-for-byte from commit
`7a8d493230befbe521dc3725295ab20070b469b5` (formerly `art-atlas-v2/silk-streamer.webp`).
Both streamers share one texture, the existing canvas and its 30 fps clock.
Pause, hidden tabs, reduced motion and GPU cleanup follow the scene renderer.

Verification: `tests/art-map-motion.test.mjs` and
`scripts/verify-shooter-motion-presence.mjs` cover texture disposal, the two loaded
streamers, movement limited to the authored objects, and stationary scenery.
