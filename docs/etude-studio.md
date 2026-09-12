# Etude Studio

Route: #etudes. Shared catalog, course/filter/selection state and metronome; separate MobileLayout and DesktopLayout.

## Type-first curriculum

65 original eight-bar studies: 451 scores across supported keys. Beginner arpeggios use actual C/D/E/G/A open grips (0–3 frets), with F/B introduced at intermediate level. Their key selector shows only supported keys; entering this course from F/B selects C visibly. Open-string chords are resolved per key rather than shifted along the neck. Nine technique courses each contain beginner, intermediate and advanced stages with at least two studies per stage. See [curriculum and sources](etude-curriculum.md).

src/etudes/tracks.js is the single course-order registry. catalog.js builds and validates the scores; trackStudies.js adds graded technique, triad and chord accompaniment studies. Existing template ids remain valid. trackLesson is local to type and level; lesson is the internal catalog ordering.

Type and difficulty have no All option. Previous/next and the dropdown use the same filtered course. Counters start at 1 within the chosen type/level/style. Changing type or difficulty opens its first study. Transposing retains the selected template. Style options are derived from the current course; an incompatible style resets to All without relaxing type or level.

Mobile always shows the type selector and three level buttons; only key/style collapse. Desktop places controls beside the score (above it on narrow desktop). Course goals and prerequisite guidance explain what each stage teaches.

## Notation and sound

VexFlow SVG renders staff and TAB from shared sounding MIDI data; written guitar notation is an octave higher. All scores are 4/4. Explicit H/P/SL links are preserved for both complete eight-bar and expanded studies. Technique labels remain SVG text. Code-tone runs separate notes. The Arpeggio course holds a chord shape above each measure and uses simultaneous root/treble pinches with broken-chord picking. Each attack has one duration and optional tones for all simultaneous pitches; both staff keys and TAB positions come from these same tones. All tones are validated against the chord diagram, sounding pitch and key. Let-ring guidance instructs resonance within a chord; this is not independent-voice sustain playback.

Scores retain the existing paper layout, responsive reader and 12-entry SVG cache. Tempo-only changes do not re-engrave. Shared metronome transport stops on course changes and unmount. The click is a metronome, not score playback.

## Verification

- node --test tests/etudes.test.mjs: course coverage, unique patterns, pitch/spelling/TAB, chord tones, rhythm, technique links, difficulty progression and navigation boundaries.
- scripts/verify-etude-tracks.mjs: 1,804 renders across desktop, mobile portrait, enlarged portrait and enlarged landscape; 27 course combinations per layout; navigation, style/key changes, transport reset, TIP, chord diagrams and zoom/viewport checks.
- scripts/verify-etude-phrasing.mjs: rests, technique label spacing, chord labels and common TIP.
- The older verify-etudes-browser and verify-etude-filter-navigation entry points run the current course verification.

These checks validate data, navigation and rendering; they do not constitute an expert guitarist's performance review. Screenshots and JSON reports are written to artifacts/etude-tracks.
