# Scenic shooter maps

Added five supplied PNG backgrounds to the shared portrait-map registry: 푸른 바닷속, 오로라 빙하, 구름 위, 은하수 사막, 반딧불 숲. Available in the existing mobile and desktop map pickers without development flags. Existing maps and the selected default remain unchanged.

The original PNGs are copied without modification. 구름 위 uses a separate rgba(8, 20, 58, 0.12) background tint in the underlay only; enemies, guitar, projectiles and UI remain above it. Static maps add no animated layers or gameplay overrides.

Validation: production build and 213 shooter tests pass. scripts/verify-shooter-scenic-maps.mjs checks all five maps at 390x844 and 1366x768, including catalog visibility, loaded source images, live neon notes, cloud-only overlay and page errors. Screenshots are saved in artifacts/note-vfx/. No deployment or merge.
