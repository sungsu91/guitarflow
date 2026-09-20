# Neon monsters as the default

- Neon rings and live pitch labels now render without a development URL flag, in both portrait and horizontal renderers.
- Removed the monster category, selection state, saved preference lookup, editor connection and legacy enemy image preloading from the game.
- Existing guitar, effect, pet, map and pick categories remain. Historical monster source assets remain on disk for archived tooling; they are no longer selectable or used as gameplay monsters.
- The existing shooterNoteVfx URL option only selects the development moonlit map preview now.

Validation: 213 shooter tests passed; production build passed. scripts/verify-shooter-neon-default.mjs checks mobile 390x844 and desktop 1366x768 without the neon query flag, with an old monster preference saved: five remaining categories, neon targets, no legacy target images, working hit burst and cleanup, no page errors. Existing collision and scoring source guards pass.

No deployment or merge performed.
