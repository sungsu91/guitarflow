# 폭풍의 회랑 (Storm Cloister)

Mobile portrait map, selected in **슈팅게임 → 스킨변경 → 맵 → 폭풍의 회랑**.

- Source: approved `work/cloud-sanctuary-local/outputs/portrait-storm-v2/portrait-storm-fusion.mp4`.
- Runtime asset: `public/assets/maps/storm-cloister/storm-cloister-loop.mp4` (8 seconds, 900 × 1600, 24 fps, silent H.264, 3,729,160 bytes).
- Scenery was AI-designed; rain, lightning and ripples were separately authored and composited. This is not the rejected LTX image-to-video take.
- Mobile presentation uses `MobileVideoMapRenderer`; shared `MapVideoBackdrop` and `ambientVideoPlayback` handle playback, visibility, retries and errors. It does not drive gameplay or audio timing.
- Paused/finished games, hidden tabs and offscreen video stop playback. Reduced-motion or data-saving preferences and media failures use the poster.
- The normal desktop map catalog excludes this portrait map. The existing desktop cloud-sanctuary 8-second video is unchanged.
- The poster is preloaded as an image; the MP4 is requested only when its video backdrop is mounted. Both files ship in the production build, with the video explicitly permitted in the release media allowlist.

Validation: storm registration/media tests, mobile catalog, shared playback, map cycling/skins/performance policy and release media tests; production build.
