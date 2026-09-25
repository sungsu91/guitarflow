# Main push validation — 2026-09-26

- Production build: passed, including release media checks.
- Full Node test suite: 1,370 passed, 0 failed, 0 skipped.
- Updated source-contract assertions to reflect current UI: translated unfinished badges, landscape storage placement/direction, expanded metronome controls, 38px rhythm rows, portrait-only voicing guide and stable large-viewport splash height.
- Shooter scoring/collision baseline equality is unchanged and passes. Added only rhythm-count/README.md to the explicit presentation asset allowlist; count-in audio is already listed in the release manifest.
- Browser: portrait rhythm storage add/delete and delete overlay placement passed.
- Local scratch files and generated recording artifacts are excluded from the release commit.
- Browser: menu bounds, tabs, settings navigation, language/theme/volume persistence passed at 360, 375, 390, 393, 430 and 440px; no page errors.
