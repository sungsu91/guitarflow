# Basic map motion review

Scope: the six original map themes. Other maps already have effects.
As of 2026-10-02, prepare separate mobile portrait and desktop landscape
compositions using shared motion data/playback; never stretch a portrait map.
All six original themes are approved and installed as of 2026-10-03.
Each was reviewed separately before installation.

1. **Moonlit Rooftop / 달빛 옥상**: v2 approved on 2026-10-02 and installed.
   Existing artwork with bright moon glow, stronger asynchronous star twinkles,
   sparse city-window changes and five staggered meteors. Silent 12-second loop.
   Asset: `public/assets/maps/moonlit-rooftop/moonlit-rooftop-motion-v2.mp4`.
   Review/render files: `work/basic-map-motion/moonlit-rooftop/`.
   The existing `moonlit-rooftop` selection uses the shared ambient video playback
   through the separate mobile renderer. The desktop scene now also uses its
   own 1920x1080, 12-second composition over the existing widescreen rooftop art:
   `public/assets/shooter/desktop-maps/01-moonlit-rooftop-motion-v1.mp4`.
   Both paths use `src/shooter/mapMotionAssets.js` and shared `MapVideoBackdrop`.
   The approved eight-second desktop Cloud Sanctuary loop is preserved.
2. **Underwater Blue / 푸른 바닷속**: v1 fish rejected as small and weak. V2 rejected
   for marching horizontally in unison, detached-looking manta wings and overly
   close creatures exposing art limitations. V4 approved and installed on 2026-10-02.
   Nine fish now follow independent curved/diagonal paths with staggered timing,
   individual speed and swim cycles, depth changes and heading along the route.
   The more distant manta uses one continuous silhouette with pinned shoulders
   and a slow six-second wing cycle. All 144 poses are checked for disconnected
   alpha components. No separate wing cutouts or patched body remain.
   V4 increases only wing deflection (near 62→108 px, far 21→36 px in the
   source rig); distance, paths, fish, backgrounds and the six-second beat
   are unchanged from V3. All 144 poses also pass the edge-clipping check.
   Existing portrait background and the matching generated wide background.
   Silent 24-second loops: `underwater-blue-mobile-v4.mp4` (854x1844) and
   `underwater-blue-desktop-v4.mp4` (1920x1080).
   Mobile uses the existing `underwater-blue` choice; desktop has the new
   `06-underwater-blue` choice with its own wide background. Approved videos
   are copied under `public/assets/maps/underwater-blue/` and
   `public/assets/shooter/desktop-maps/`. Both use shared ambient playback.
   V1/V2/V3 previews preserved. App playback verified at 390x844 and 1280x720;
   both videos playing with readyState 4 and opacity 1. 34 checks and build pass.
   Review/render files: `work/basic-map-motion/underwater-blue/`.
3. **Aurora Glacier / 오로라 빙하**: V2 approved and installed on 2026-10-02. Isolated green and
   violet aurora light flows over fixed original stars, mountains and ice.
   The lake receives matching moving light; registered stars twinkle and three
   staggered meteors cross the sky. Authored effects, no generative video claim.
   Separate original portrait / landscape artwork, silent 20-second loops.
   V2 strengthens only the stars: white cores, wider blue halos, longer diffraction
   spikes and broader asynchronous brightness peaks. Snow ridges are excluded
   from the desktop star selection. V1 preview retained for comparison.
   Review/render files: `work/basic-map-motion/aurora-glacier/`.
   Existing mobile `aurora-glacier` and desktop `03-aurora-lake` selections now
   use their respective approved V2 compositions through shared ambient playback.
   Both verified playing in the app (390x844 / 1280x720), readyState 4, opacity 1.
   36 related checks and production build passed.
4. **Above the Clouds / 구름 위**: Desktop V3 / mobile V2 approved and installed on 2026-10-02; V1 motion was too subtle,
   especially on desktop. Separate portrait
   sky terrace and landscape sanctuary compositions, 16 seconds at 24 fps.
   Depth-dependent directional cloud flow, soft sunlight, low mist and the
   existing distant waterfall detail. Fixed architecture is protected at both
   source and destination of cloud sampling to avoid duplicated silhouettes.
   V2 increases portrait cloud velocity approximately 2x and desktop velocity
   approximately 6x through wider advection plus two desktop wind cycles.
   Added visibly advected textured mist, brighter shafts of sunlight and stronger
   waterfall highlights. Additional distant-island guards keep landmarks fixed.
   Desktop V3 releases the stationary cloud banks around both islands. Tight
   rock/rail/planter silhouettes replace the broad 65px protection expansion;
   distance-limited local currents replace still-image fallback when the long
   wind sample meets a landmark. Mobile V2 is unchanged in this desktop revision.
   Coverage review over 32 moments: the marked left/right cloud regions have
   visible temporal variation across 93.3% / 91.6% of pixels (V2: 26.8% / 16.7%).
   Center cloud motion is retained and the sampled foreground floor stays fixed.
   Review data: `work/basic-map-motion/above-the-clouds/coverage-review-v3.json`.
   Original V1/V2 renderers, videos and preview-v1.html / preview-v2.html remain.
   Review/render files: `work/basic-map-motion/above-the-clouds/`.
   The previous eight-second desktop cloud file is preserved for rollback; SHA256
   remains `93156D0B95FCEAA6C76AA7A63BAC6F3DCB8CC770087AE386F35EB86C370AEF40`.
   Active assets: `public/assets/maps/above-the-clouds/above-the-clouds-motion-v2.mp4`
   and `public/assets/shooter/desktop-maps/02-cloud-sanctuary-motion-v3.mp4`.
   Both use the shared motion catalog and ambient playback. Verified in the app
   at desktop and 390x844: 16 seconds, playing, readyState 4 and opacity 1.
   38 related checks and the production build pass.
5. **Milky Way Desert / 은하수 사막**: V2 approved and installed on 2026-10-02. Original portrait
   dunes and landscape observatory art; separate 854x1844 / 1920x1080 compositions.
   Silent 20-second loops at 24 fps, with light traveling along the Milky Way,
   registered asynchronous star twinkles and stronger textured dune gusts.
   Per user choice, V2 removes all six meteors and emphasizes rolling sand
   plus flowing galactic light, differentiating this map from other night maps.
   Wind has three depths: distant lifted dust, denser rolling gusts and long
   ground-skimming ribbons; coverage and velocity are increased. Portrait
   uses separate texture aspect scales to keep sand flowing sideways instead
   of forming upright plumes. Non-glowing swept grains add near-ground motion.
   Desktop also has warm lantern fluctuations and a moon halo.
   Stars, dunes and observatory geometry remain fixed; authored light effects,
   not AI-generated footage. Both loops decode all 480 frames and raw t=0 and
   t=20 match exactly. Encoded loop boundary differences average 0.947/0.927
   on the 0–255 channel scale for mobile/desktop. V1 preview and assets remain
   for comparison. Review/render files: `work/basic-map-motion/milky-way-desert/`.
   Both V2 sources verified playing in the review page with readyState 4,
   correct portrait/landscape dimensions and no media error.
   Existing mobile `milky-way-desert` and desktop `05-desert-observatory`
   selections now use their respective V2 assets through the shared motion
   catalog and ambient playback. Both verified in the app at 390x844 and
   1280x720: playing, readyState 4, opacity 1, duration 20 seconds. 19 related
   playback/map checks and the production build passed.
6. **Firefly Forest / 반딧불 숲**: V1 approved and installed on 2026-10-03.
   The final map of the six original themes. Original mobile portrait artwork;
   a matching desktop landscape background generated with built-in image_gen.
   Desktop source and exact generation prompt are preserved under
   `work/basic-map-motion/firefly-forest/`. Shared locally authored animation:
   88/142 fireflies on independent curved periodic paths, different depths and
   asynchronous warm pulses, perched lights in the original portrait, low
   blue forest mist, moon halo and small pools of light on the grass.
   No meteors, added starbursts, image warping or generative-video claim.
   Separate 854x1844 / 1920x1080, silent 24-second loops at 24 fps.
   Both videos decode all 576 frames; raw t=0 and t=24 match exactly. Encoded
   boundary mean channel differences are 0.808/0.928 on the 0–255 scale.
   Both preview formats verified playing, readyState 4, duration 24 seconds,
   correct source dimensions and no media error. The review page includes
   original-art comparison and a jump to the loop boundary.
   Existing mobile `firefly-forest` now uses the approved portrait V1; desktop
   has a separate `07-firefly-forest` choice using the approved wide V1 art and
   video. Both share the motion catalog and ambient playback without changing
   gameplay or platform layouts. Verified in the app at 390x844 and 1280x720:
   playing, readyState 4, opacity 1, 24 seconds. Approved copies match their
   source videos byte for byte and all six original themes resolve to motion.
   Production build and all 25 related checks pass after updating an old map
   picker expectation to include the already-installed Storm Cloister.

Current tablet routing (checked 2026-10-02): tablets use the mobile map renderer
and portrait motion assets with a separate tablet UI. Rotating a tablet does not
currently select desktop wide map assets. No tablet routing change authorized
as part of the cloud motion-strength revision.
