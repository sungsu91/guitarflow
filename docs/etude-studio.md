# Etude Studio

Route: `#etudes`. Separate from the existing `#stage2` BOX trainer. Both menu surfaces have an Etude Studio entry with a PRO marker (a training label, not a subscription gate).

## Content

259 eight-bar studies = 37 original exercise templates × seven tonics. Beginner and advanced contain 12 lessons each; intermediate contains 13 including chord-shape accompaniment. See [curriculum sources and sequence](etude-curriculum.md) for the public-syllabus research, complete lesson table and scope. Difficulty is editorial at the recommended tempo. Style and exercise type are independent filters. The last chosen filter takes priority; conflicting older style, type or level filters relax to All so every offered type opens matching studies.

All scores are 4/4, with half, quarter, eighth or sixteenth notes and rests. Triplets, sextuplets, bends and other meters are not yet in this collection. Source images informed notation layout only; their note sequences were not transcribed.

Titles identify the key and exercise method rather than using song-like names. The curriculum provides 37 ordered lessons per tonic (12 beginner, 13 intermediate, 12 advanced), previous/next controls, and a collapsible TIP with technique instructions and practice guidance. Previous/next navigation retains tonic, difficulty and style/type filters, and stops at each level boundary even when the level filter is All. The counter shows the position within the filtered list in the current level (for example, intermediate scales: 1/3). Model-level guards also reject cross-level navigation. Hammer-ons and pull-offs have staff curves and H/P TAB ties; slides have staff lines and TAB slide marks. Technique links remain on the same string, with validated fret direction and bounded distance. All H/P/SL labels use bold 18px upright SVG text above TAB with a white halo. The original studies develop a three-bar opening before the cadence. New studies supply eight explicit bars with motifs, rests, varied durations or chord targets. All finish on the tonic. Rests use staff rest symbols and blank TAB timing slots.

## Accuracy and layout

`src/etudes/catalog.js` owns explicit movable fingerings, rhythm, pitch spelling and metadata. Standard tuning is E2 A2 D3 G3 B3 E4; MIDI is sounding pitch. Staff notation is written an octave higher with an octave-down treble clef. F major uses Bb, B major uses A#, and minor/blues signatures and blue-note accidentals are spelled by scale degree.

`Score.jsx` uses VexFlow 4.2.5 SVG, not generated raster images. Both staff and TAB voices use one formatter to align simultaneous notes. Accidentals reset each bar. The score is crisp at arbitrary zoom; this does not imply text remains readable at any tiny display size. The enlargement dialog fits the viewport and scrolls vertically. On mobile it uses one bar per system in portrait and two in landscape, reflowing on rotation without closing. The landscape button attempts the browser fullscreen/orientation APIs, falls back to a physical-rotation hint, and releases only locks/fullscreen acquired by this reader on close. Etudes are exempt from the app's portrait-only mode policy. No fretboard diagram is attached. The existing FRETIVA icon appears on the sheet.

MobileLayout and DesktopLayout share catalog, filters, selection and metronome state, but have different DOM compositions. Mobile filters collapse; this mode uses top navigation rather than the other modes' fixed bottom bar. Desktop uses a side filter panel, or top filters on narrower desktop windows. New CSS is scoped to `.etudeStudio`.

## Navigation rendering

Mobile navigation groups Home and Menu on the right. Home uses the app's default fretboard entry screen. Studio exit still unmounts it and stops audio. Up to 12 detached SVGs are cached by study identity and layout; re-entry clones the cached SVG instead of engraving again. Engraving runs in a passive effect, and tempo-only changes update the accessible label and visible BPM without replacing the notation tree. The memoized score skips beat-only rerenders. Browser verification records median fresh engraving versus cached reuse times, not end-to-end navigation speed.

## Metronome

Uses the existing shared audio bus and transport clock. Four visual beat dots follow audio context time; the first beat has a distinct pitch. Tempo range is 30–240 quarter notes per minute. Changing score/filter/tempo stops playback. Route unmount and backgrounding stop scheduled sound. BPM entry is committed on blur or Enter. This is a click track, not playback of the score.

## Verification

- `node --test tests/etudes.test.mjs`: all 259 studies, independent staff/TAB pitch and octave correspondence, scale membership, 4/4 sums, root endpoints, bounded fret/string transitions, spelling examples, technique direction, curriculum completeness and corrupt-data rejection.
- `scripts/verify-etudes-browser.mjs`: 1008 score renders across mobile normal/enlarged/landscape and desktop, exact staff line positions, staff/TAB timing alignment, technique mark counts, Gb/natural restoration, finite SVG coordinates, horizontal and vertical bounds; curriculum navigation, TIP expansion, menus, filters, empty results, zoom, tempo edit, transport and route cleanup. Enlarged-reader checks cover viewport containment at 390/320/844px, rotation reflow, reachable close controls after scrolling, background scroll restoration, and rejected orientation-lock fallback. Screenshots include 390/320 mobile and 1440/1024 desktop; dark screenshots test CSS theme rendering. These are Chromium emulations, not physical-device or Safari certification.
- `npm run build`: passed.
- Full project suite during this change: 785 tests, 768 passed, 17 failed in other shooter/layout/rhythm checks. Names are recorded in `artifacts/etudes/test-summary.txt`; these failures were not silently changed or waived.

Checks establish data and rendering consistency and conservative transition limits, not human guitar-performance review. Fingering comfort and pedagogical difficulty still vary by player. No claim of expert performance certification is made.
