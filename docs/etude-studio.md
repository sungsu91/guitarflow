# Etude Studio

Route: #etudes. Shared catalog, course/filter/selection state and metronome; separate MobileLayout and DesktopLayout.

## Type-first curriculum

65 original eight-bar studies × 7 keys = 455 scores. Nine technique courses each contain beginner, intermediate and advanced stages with at least two studies per stage. See [curriculum and sources](etude-curriculum.md).

src/etudes/tracks.js is the single course-order registry. catalog.js builds and validates the scores; trackStudies.js adds graded technique, triad and chord accompaniment studies. Existing template ids remain valid. trackLesson is local to type and level; lesson is the internal catalog ordering.

Type and difficulty have no All option. Previous/next and the dropdown use the same filtered course. Counters start at 1 within the chosen type/level/style. Changing type or difficulty opens its first study. Transposing retains the selected template. Style options are derived from the current course; an incompatible style resets to All without relaxing type or level.

Mobile always shows the type selector and three level buttons; only key/style collapse. Desktop places controls beside the score (above it on narrow desktop). Course goals and prerequisite guidance explain what each stage teaches.

## Notation and sound

VexFlow SVG renders staff and TAB from shared sounding MIDI data; written guitar notation is an octave higher. All scores are 4/4. Explicit H/P/SL links are preserved for both complete eight-bar and expanded studies. Technique labels remain SVG text. Triad exercises separate notes; chord accompaniment shows the held shape above each measure, with picked strings checked against that shape.

Scores retain the existing paper layout, responsive reader and 12-entry SVG cache. Tempo-only changes do not re-engrave. Shared metronome transport stops on course changes and unmount. The click is a metronome, not score playback.

## Verification

- node --test tests/etudes.test.mjs: course coverage, unique patterns, pitch/spelling/TAB, chord tones, rhythm, technique links, difficulty progression and navigation boundaries.
- scripts/verify-etude-tracks.mjs: 1,820 renders across desktop, mobile portrait, enlarged portrait and enlarged landscape; 27 course combinations per layout; navigation, style/key changes, transport reset, TIP, chord diagrams and zoom/viewport checks.
- scripts/verify-etude-phrasing.mjs: rests, technique label spacing, chord labels and common TIP.
- The older verify-etudes-browser and verify-etude-filter-navigation entry points run the current course verification.

These checks validate data, navigation and rendering; they do not constitute an expert guitarist's performance review. Screenshots and JSON reports are written to artifacts/etude-tracks.
